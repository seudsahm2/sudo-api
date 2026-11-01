import { inflateRawSync } from 'node:zlib';

export interface ZipFile {
  /** Forward-slash path inside the archive, already checked for escapes. */
  path: string;
  data: Buffer;
}

export interface ZipLimits {
  /** Total bytes once unpacked. Enforced while inflating, not trusted from headers. */
  maxTotalBytes: number;
  maxFiles: number;
}

export class ZipError extends Error {}

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_ENTRY = 0x02014b50;
const LOCAL_HEADER = 0x04034b50;

/**
 * A deliberately small zip reader: stored and deflated entries, no zip64, no
 * encryption. That covers every archive the operating systems and `zip` make
 * of a web build, and keeping it this small means every byte is accounted for:
 *
 * - Sizes in the headers are claims. Each entry is inflated with a hard output
 *   cap of what is left of the budget, so a zip bomb stops at the cap.
 * - Paths are normalised and anything that climbs out (`..`, absolute paths,
 *   drive letters) rejects the whole archive rather than being quietly fixed.
 */
export function readZip(archive: Buffer, limits: ZipLimits): ZipFile[] {
  const end = findEndOfCentralDirectory(archive);
  const entryCount = archive.readUInt16LE(end + 10);
  const directoryOffset = archive.readUInt32LE(end + 16);

  if (entryCount === 0xffff || directoryOffset === 0xffffffff) {
    throw new ZipError(
      'This zip uses the zip64 format, which is not supported. Zip the folder with your operating system’s “Compress” instead.',
    );
  }

  if (entryCount > limits.maxFiles) {
    throw new ZipError(`The zip holds more than ${limits.maxFiles} files.`);
  }

  const files: ZipFile[] = [];
  let budget = limits.maxTotalBytes;
  let cursor = directoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (
      cursor + 46 > archive.length ||
      archive.readUInt32LE(cursor) !== CENTRAL_ENTRY
    ) {
      throw new ZipError('The zip is damaged: its file list is unreadable.');
    }

    const flags = archive.readUInt16LE(cursor + 8);
    const method = archive.readUInt16LE(cursor + 10);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const size = archive.readUInt32LE(cursor + 24);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localOffset = archive.readUInt32LE(cursor + 42);
    const rawName = archive.subarray(cursor + 46, cursor + 46 + nameLength);
    cursor += 46 + nameLength + extraLength + commentLength;

    // Bit 11 marks UTF-8 names; older tools write code page 437, which is
    // ASCII for every name a build produces.
    const name = rawName.toString(flags & 0x800 ? 'utf8' : 'latin1');

    if (name.endsWith('/')) continue;

    if (flags & 0x1) {
      throw new ZipError(
        'The zip is password-protected. Upload it without a password.',
      );
    }

    const path = safePath(name);
    if (path === null) continue;

    if (
      localOffset + 30 > archive.length ||
      archive.readUInt32LE(localOffset) !== LOCAL_HEADER
    ) {
      throw new ZipError('The zip is damaged: a file inside it is unreadable.');
    }

    const dataStart =
      localOffset +
      30 +
      archive.readUInt16LE(localOffset + 26) +
      archive.readUInt16LE(localOffset + 28);
    const compressed = archive.subarray(dataStart, dataStart + compressedSize);

    if (compressed.length !== compressedSize) {
      throw new ZipError('The zip is damaged: it ends early.');
    }

    let data: Buffer;
    if (method === 0) {
      data = compressed;
    } else if (method === 8) {
      try {
        data = inflateRawSync(compressed, {
          maxOutputLength: Math.max(budget, 1),
        });
      } catch (error) {
        if (
          error instanceof RangeError ||
          (error as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE'
        ) {
          throw tooLarge(limits);
        }
        throw new ZipError(`The zip is damaged: ${path} cannot be unpacked.`);
      }
    } else {
      throw new ZipError(
        `${path} uses a compression method this upload does not read.`,
      );
    }

    if (data.length !== size) {
      throw new ZipError(
        `The zip is damaged: ${path} is not the size it claims.`,
      );
    }

    budget -= data.length;
    if (budget < 0) throw tooLarge(limits);

    files.push({ path, data });
  }

  return files;
}

function tooLarge(limits: ZipLimits) {
  return new ZipError(
    `Unpacked, the build is larger than ${Math.floor(limits.maxTotalBytes / 1024 / 1024)}MB.`,
  );
}

function findEndOfCentralDirectory(archive: Buffer): number {
  // The record is 22 bytes plus a comment of at most 65535.
  const stop = Math.max(0, archive.length - 22 - 0xffff);
  for (let offset = archive.length - 22; offset >= stop; offset -= 1) {
    if (archive.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY)
      return offset;
  }
  throw new ZipError('That file is not a zip archive.');
}

/**
 * Returns the cleaned path, null for junk the operating system adds (macOS
 * resource forks, Finder and Explorer metadata), or throws on an escape.
 */
function safePath(name: string): string | null {
  const segments = name.replace(/\\/g, '/').split('/');

  if (
    name.startsWith('/') ||
    /^[a-zA-Z]:/.test(name) ||
    segments.includes('..')
  ) {
    throw new ZipError(
      'The zip contains a path that points outside it, so it was refused.',
    );
  }

  const clean = segments.filter((segment) => segment !== '' && segment !== '.');
  const last = clean[clean.length - 1] ?? '';

  if (
    clean.length === 0 ||
    clean[0] === '__MACOSX' ||
    last === '.DS_Store' ||
    last === 'Thumbs.db' ||
    last === 'desktop.ini'
  ) {
    return null;
  }

  return clean.join('/');
}

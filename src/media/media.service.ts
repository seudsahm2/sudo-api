import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';

export interface UploadedMedia {
  url: string;
  key: string;
  bytes: number;
  contentType: string;
}

/**
 * Image signatures we accept. The declared Content-Type from a browser is a
 * hint, not evidence — every upload is sniffed before it is stored, so a
 * renamed executable cannot ride in behind an `image/png` header.
 */
const IMAGE_SIGNATURES: Array<{
  contentType: string;
  extension: string;
  matches: (bytes: Buffer) => boolean;
}> = [
  {
    contentType: 'image/jpeg',
    extension: 'jpg',
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    contentType: 'image/png',
    extension: 'png',
    matches: (b) =>
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    contentType: 'image/webp',
    extension: 'webp',
    matches: (b) =>
      b.subarray(0, 4).toString('ascii') === 'RIFF' &&
      b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    contentType: 'image/avif',
    extension: 'avif',
    matches: (b) =>
      b.subarray(4, 8).toString('ascii') === 'ftyp' &&
      ['avif', 'avis'].includes(b.subarray(8, 12).toString('ascii')),
  },
];

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrlBase: string;
  private readonly maxBytes: number;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('STORAGE_S3_ENDPOINT');
    const region = this.config.get<string>('STORAGE_S3_REGION');
    const accessKeyId = this.config.get<string>('STORAGE_S3_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>(
      'STORAGE_S3_SECRET_ACCESS_KEY',
    );

    this.bucket = this.config.get<string>('STORAGE_BUCKET') ?? '';
    this.publicUrlBase = (
      this.config.get<string>('STORAGE_PUBLIC_URL_BASE') ?? ''
    ).replace(/\/+$/, '');
    this.maxBytes = this.config.get<number>('STORAGE_MAX_UPLOAD_BYTES') ?? 0;

    if (
      !endpoint ||
      !region ||
      !accessKeyId ||
      !secretAccessKey ||
      !this.bucket ||
      !this.publicUrlBase
    ) {
      this.client = null;
      this.logger.warn(
        'Object storage is not configured. Media upload is disabled; cover images can still be set by pasting a URL.',
      );
      return;
    }

    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      // Supabase Storage, R2 and MinIO all require path-style addressing.
      forcePathStyle: true,
    });
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async upload(
    body: Buffer,
    originalFilename: string,
    folder = 'work',
  ): Promise<UploadedMedia> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Object storage is not configured on this server.',
      );
    }

    if (body.length === 0) {
      throw new BadRequestException('The uploaded file is empty.');
    }

    if (body.length > this.maxBytes) {
      throw new BadRequestException(
        `Images must be ${Math.floor(this.maxBytes / 1024 / 1024)}MB or smaller.`,
      );
    }

    const signature = IMAGE_SIGNATURES.find((candidate) =>
      candidate.matches(body),
    );

    if (!signature) {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP and AVIF images can be uploaded.',
      );
    }

    const key = this.buildKey(originalFilename, folder, signature.extension);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: signature.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return {
      url: this.toPublicUrl(key),
      key,
      bytes: body.length,
      contentType: signature.contentType,
    };
  }

  /**
   * Raw object access, for callers that keep files of their own in the bucket
   * (app builds). Keys must already be safe; nothing here checks them.
   */
  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
    cacheControl?: string,
  ): Promise<void> {
    await this.requireClient().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      }),
    );
  }

  /** The object's address on the bucket's public (CDN) URL. */
  publicUrlFor(key: string): string {
    return this.toPublicUrl(key);
  }

  async getObject(key: string): Promise<Buffer | null> {
    try {
      const result = await this.requireClient().send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return result.Body
        ? Buffer.from(await result.Body.transformToByteArray())
        : null;
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  async deletePrefix(prefix: string): Promise<void> {
    const client = this.requireClient();
    let token: string | undefined;
    do {
      const page = await client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      const keys = (page.Contents ?? []).flatMap((item) =>
        item.Key ? [{ Key: item.Key }] : [],
      );
      if (keys.length > 0) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: keys },
          }),
        );
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Object storage is not configured on this server.',
      );
    }
    return this.client;
  }

  /**
   * Keys are constructed, never accepted. The client's filename only survives
   * as a slug, so `../` and absolute paths cannot escape the folder.
   */
  private buildKey(
    originalFilename: string,
    folder: string,
    extension: string,
  ): string {
    const safeFolder = folder
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    const stem =
      (originalFilename.split(/[\\/]/).pop() ?? '')
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'image';

    const suffix = randomBytes(6).toString('hex');

    return `${safeFolder || 'work'}/${stem}-${suffix}.${extension}`;
  }

  private toPublicUrl(key: string): string {
    const encodedBucket = encodeURIComponent(this.bucket);
    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return `${this.publicUrlBase}/${encodedBucket}/${encodedKey}`;
  }
}

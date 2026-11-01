import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { countRows, takeSnapshot } from '../content/content-snapshot';
import { loadCliEnvironment } from './cli-environment';

/**
 * Writes every content table — and every enquiry — to one JSON file.
 *
 *   npm run content:backup
 *   npm run content:backup -- --output backups/before-launch.json
 *
 * Whole rows are written, every column, so nothing added to the schema later
 * is left out. Restore with `npm run content:restore`.
 */

interface CliOptions {
  output: string;
  help: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    output: resolve(
      process.cwd(),
      'backups',
      `content-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    ),
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else if (argument.startsWith('--output=')) {
      options.output = resolve(
        process.cwd(),
        argument.slice('--output='.length),
      );
    } else if (argument === '--output') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('Missing value for --output');
      }
      options.output = resolve(process.cwd(), nextValue);
      index += 1;
    }
  }

  return options;
}

function printUsage() {
  console.log(
    [
      'Backup content tables and enquiries to a JSON snapshot file.',
      '',
      'Usage:',
      '  npm run content:backup -- --output backups/content-backup.json',
      '',
      'Options:',
      '  --output   Destination JSON file path (default: backups/content-backup-<timestamp>.json)',
      '  --help     Show this message',
    ].join('\n'),
  );
}

async function main() {
  loadCliEnvironment();

  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const prisma = new PrismaClient();

  try {
    const document = await takeSnapshot(prisma);

    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(
      options.output,
      `${JSON.stringify(document, null, 2)}\n`,
      'utf8',
    );

    const counts = Object.entries(countRows(document))
      .map(([name, count]) => `${name} ${count}`)
      .join(', ');
    console.log(`Backup written to ${options.output}`);
    console.log(counts);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

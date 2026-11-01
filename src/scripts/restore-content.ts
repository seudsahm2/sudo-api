import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  ContentSnapshot,
  restoreSnapshot,
  takeSnapshot,
} from '../content/content-snapshot';
import { loadCliEnvironment } from './cli-environment';

/**
 * Puts content back from a file written by `content:backup`.
 *
 *   npm run content:restore -- backups/content-backup.json confirm
 *
 * What it does, in this order:
 *   1. Saves the current state to backups/pre-restore-<time>.json, so a
 *      restore can itself be undone.
 *   2. Replaces every table the file contains.
 *   3. Leaves every table the file does not contain exactly as it was — rows
 *      are put back after their parents are replaced, so restoring an old file
 *      that predates screenshots does not delete the screenshots.
 *   4. Never deletes an enquiry. Missing ones are added back.
 *
 * Works with old backups (version 1): columns the schema no longer has are
 * dropped, and columns the file lacks take their schema defaults.
 */

interface CliOptions {
  input: string;
  confirm: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    input: '',
    confirm: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }

    if (
      argument === '--confirm' ||
      argument === 'confirm' ||
      argument === '--yes'
    ) {
      options.confirm = true;
      continue;
    }

    if (argument.startsWith('--input=')) {
      options.input = resolve(process.cwd(), argument.slice('--input='.length));
      continue;
    }

    if (argument === '--input') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('Missing value for --input');
      }

      options.input = resolve(process.cwd(), nextValue);
      index += 1;
      continue;
    }

    if (!argument.startsWith('-') && !options.input) {
      options.input = resolve(process.cwd(), argument);
    }
  }

  if (!options.confirm) {
    const npmConfigConfirm = process.env.npm_config_confirm;
    if (typeof npmConfigConfirm === 'string') {
      const normalized = npmConfigConfirm.trim().toLowerCase();
      options.confirm =
        normalized === '' ||
        normalized === '1' ||
        normalized === 'true' ||
        normalized === 'yes' ||
        normalized === 'confirm';
    }
  }

  if (!options.confirm) {
    const npmArgv = process.env.npm_config_argv;
    if (typeof npmArgv === 'string' && npmArgv.includes('--confirm')) {
      options.confirm = true;
    }
  }

  return options;
}

function printUsage() {
  console.log(
    [
      'Restore content tables from a JSON snapshot file.',
      '',
      'Usage:',
      '  npm run content:restore -- backups/content-backup.json confirm',
      '  npm run content:restore -- --input backups/content-backup.json --confirm',
      '',
      'Options:',
      '  --input     Source JSON backup file (or pass it as the first positional argument)',
      '  --confirm   Required safety flag to execute the restore (or pass confirm as a positional token)',
      '  --help      Show this message',
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

  if (!options.input) {
    throw new Error('Missing required --input path');
  }

  if (!options.confirm) {
    throw new Error(
      'Restore requires confirmation. Use: npm run content:restore -- backups/content-backup.json confirm',
    );
  }

  if (!existsSync(options.input)) {
    throw new Error(
      `Backup file not found: ${options.input}. Provide an existing JSON path from the backups directory.`,
    );
  }

  const backup = JSON.parse(
    readFileSync(options.input, 'utf8'),
  ) as ContentSnapshot;
  if (!backup.tables || typeof backup.tables !== 'object') {
    throw new Error('Invalid backup document: missing tables object');
  }

  const prisma = new PrismaClient();

  try {
    // The current state, in full, before anything changes.
    const current = await takeSnapshot(prisma);
    mkdirSync(resolve(process.cwd(), 'backups'), { recursive: true });
    const safetyPath = resolve(
      process.cwd(),
      'backups',
      `pre-restore-${current.generatedAt.replace(/[:.]/g, '-')}.json`,
    );
    writeFileSync(
      safetyPath,
      `${JSON.stringify(current, null, 2)}
`,
      'utf8',
    );
    console.log(`Current state saved to ${safetyPath}`);

    const summary = await restoreSnapshot(prisma, backup, current);

    console.log(`Restored from ${options.input}`);
    console.log(
      `Replaced from the file: ${summary.replaced.join(', ') || 'none'}`,
    );
    console.log(
      `Not in the file, left as they were: ${summary.kept.join(', ') || 'none'}`,
    );
    for (const line of summary.lines) console.log(`  ${line}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

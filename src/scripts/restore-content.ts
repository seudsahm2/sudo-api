import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';

interface CliOptions {
  input: string;
  confirm: boolean;
  help: boolean;
}

interface BackupTableRecord {
  id: string;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface ContentBackupDocument {
  generatedAt: string;
  tables: Record<string, BackupTableRecord[]>;
}

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1);
    const value = stripWrappingQuotes(rawValue);

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadCliEnvironment() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), 'sudo-api/.env'),
    resolve(process.cwd(), 'sudo-api/.env.local'),
  ];

  for (const candidate of candidates) {
    loadEnvFile(candidate);
  }
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

function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return new Date(value);
}

function mapRecord<T extends BackupTableRecord>(record: T, fields: string[]) {
  const mapped: Record<string, unknown> = { id: record.id };

  for (const field of fields) {
    if (record[field] !== undefined) {
      mapped[field] = record[field];
    }
  }

  if ('deletedAt' in record) {
    mapped.deletedAt = toDate(record.deletedAt);
  }

  return mapped;
}

function mapRecords<T extends object>(
  records: BackupTableRecord[],
  fields: string[],
) {
  return records.map((record) => mapRecord(record, fields)) as T[];
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

  const rawBackup = readFileSync(options.input, 'utf8');
  const backup = JSON.parse(rawBackup) as ContentBackupDocument;
  if (!backup.tables || typeof backup.tables !== 'object') {
    throw new Error('Invalid backup document: missing tables object');
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.serviceInterconnect.deleteMany();
      await tx.serviceStackItem.deleteMany();
      await tx.serviceCapability.deleteMany();
      await tx.workProjectDiscipline.deleteMany();
      await tx.service.deleteMany();
      await tx.workProject.deleteMany();
      await tx.homeManifesto.deleteMany();
      await tx.homeEcosystemTag.deleteMany();
      await tx.homeStat.deleteMany();
      await tx.servicePipelineStep.deleteMany();
      await tx.workFilter.deleteMany();
      await tx.labPrinciple.deleteMany();
      await tx.labMatrixRow.deleteMany();
      await tx.labSpec.deleteMany();
      await tx.primaryNavigation.deleteMany();
      await tx.inquiryProjectType.deleteMany();
      await tx.inquiryBudgetRange.deleteMany();
      await tx.siteConfig.deleteMany();

      const tables = backup.tables;

      await tx.siteConfig.createMany({
        data: mapRecords<Prisma.SiteConfigCreateManyInput>(
          tables.siteConfig ?? [],
          [
            'name',
            'shortName',
            'descriptor',
            'defaultTitle',
            'description',
            'contactEmail',
            'responseWindow',
            'statusLabel',
            'intakeMode',
            'heroHeadline',
            'positionTitle',
            'positionBody',
            'deletedAt',
          ],
        ),
      });

      await tx.primaryNavigation.createMany({
        data: mapRecords<Prisma.PrimaryNavigationCreateManyInput>(
          tables.primaryNavigation ?? [],
          ['position', 'to', 'label', 'deletedAt'],
        ),
      });

      await tx.inquiryProjectType.createMany({
        data: mapRecords<Prisma.InquiryProjectTypeCreateManyInput>(
          tables.inquiryProjectType ?? [],
          ['position', 'value', 'label', 'deletedAt'],
        ),
      });

      await tx.inquiryBudgetRange.createMany({
        data: mapRecords<Prisma.InquiryBudgetRangeCreateManyInput>(
          tables.inquiryBudgetRange ?? [],
          ['position', 'value', 'label', 'deletedAt'],
        ),
      });

      await tx.homeManifesto.createMany({
        data: mapRecords<Prisma.HomeManifestoCreateManyInput>(
          tables.homeManifesto ?? [],
          ['position', 'icon', 'kicker', 'title', 'copy', 'deletedAt'],
        ),
      });

      await tx.homeEcosystemTag.createMany({
        data: mapRecords<Prisma.HomeEcosystemTagCreateManyInput>(
          tables.homeEcosystemTag ?? [],
          ['position', 'tag', 'deletedAt'],
        ),
      });

      await tx.homeStat.createMany({
        data: mapRecords<Prisma.HomeStatCreateManyInput>(
          tables.homeStat ?? [],
          ['position', 'label', 'value', 'suffix', 'deletedAt'],
        ),
      });

      await tx.service.createMany({
        data: mapRecords<Prisma.ServiceCreateManyInput>(tables.service ?? [], [
          'position',
          'icon',
          'name',
          'handle',
          'summary',
          'deletedAt',
        ]),
      });

      await tx.serviceCapability.createMany({
        data: mapRecords<Prisma.ServiceCapabilityCreateManyInput>(
          tables.serviceCapability ?? [],
          ['serviceId', 'position', 'value'],
        ),
      });

      await tx.serviceStackItem.createMany({
        data: mapRecords<Prisma.ServiceStackItemCreateManyInput>(
          tables.serviceStackItem ?? [],
          ['serviceId', 'position', 'value'],
        ),
      });

      await tx.serviceInterconnect.createMany({
        data: mapRecords<Prisma.ServiceInterconnectCreateManyInput>(
          tables.serviceInterconnect ?? [],
          ['serviceId', 'position', 'value'],
        ),
      });

      await tx.servicePipelineStep.createMany({
        data: mapRecords<Prisma.ServicePipelineStepCreateManyInput>(
          tables.servicePipelineStep ?? [],
          ['position', 'icon', 'label', 'step', 'deletedAt'],
        ),
      });

      await tx.workFilter.createMany({
        data: mapRecords<Prisma.WorkFilterCreateManyInput>(
          tables.workFilter ?? [],
          ['position', 'value', 'deletedAt'],
        ),
      });

      await tx.workProject.createMany({
        data: mapRecords<Prisma.WorkProjectCreateManyInput>(
          tables.workProject ?? [],
          [
            'position',
            'projectKey',
            'title',
            'client',
            'year',
            'summary',
            'coverImageUrl',
            'challenge',
            'approach',
            'outcome',
            'featured',
            'featuredPosition',
            'deletedAt',
          ],
        ),
      });

      await tx.workProjectDiscipline.createMany({
        data: mapRecords<Prisma.WorkProjectDisciplineCreateManyInput>(
          tables.workProjectDiscipline ?? [],
          ['projectId', 'position', 'value'],
        ),
      });

      await tx.labPrinciple.createMany({
        data: mapRecords<Prisma.LabPrincipleCreateManyInput>(
          tables.labPrinciple ?? [],
          ['position', 'icon', 'name', 'desc', 'deletedAt'],
        ),
      });

      await tx.labMatrixRow.createMany({
        data: mapRecords<Prisma.LabMatrixRowCreateManyInput>(
          tables.labMatrixRow ?? [],
          ['position', 'label', 'value', 'deletedAt'],
        ),
      });

      await tx.labSpec.createMany({
        data: mapRecords<Prisma.LabSpecCreateManyInput>(tables.labSpec ?? [], [
          'position',
          'label',
          'value',
          'deletedAt',
        ]),
      });
    });

    console.log(`Restored content tables from ${options.input}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

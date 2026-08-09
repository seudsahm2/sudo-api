import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

interface CliOptions {
  output: string;
  help: boolean;
}

interface ContentBackupDocument {
  generatedAt: string;
  tables: {
    siteConfig: Array<Record<string, unknown>>;
    primaryNavigation: Array<Record<string, unknown>>;
    inquiryProjectType: Array<Record<string, unknown>>;
    inquiryBudgetRange: Array<Record<string, unknown>>;
    homeManifesto: Array<Record<string, unknown>>;
    homeEcosystemTag: Array<Record<string, unknown>>;
    homeStat: Array<Record<string, unknown>>;
    service: Array<Record<string, unknown>>;
    serviceCapability: Array<Record<string, unknown>>;
    serviceStackItem: Array<Record<string, unknown>>;
    serviceInterconnect: Array<Record<string, unknown>>;
    servicePipelineStep: Array<Record<string, unknown>>;
    workFilter: Array<Record<string, unknown>>;
    workProject: Array<Record<string, unknown>>;
    workProjectDiscipline: Array<Record<string, unknown>>;
    labPrinciple: Array<Record<string, unknown>>;
    labMatrixRow: Array<Record<string, unknown>>;
    labSpec: Array<Record<string, unknown>>;
  };
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
      continue;
    }

    if (argument.startsWith('--output=')) {
      options.output = resolve(
        process.cwd(),
        argument.slice('--output='.length),
      );
      continue;
    }

    if (argument === '--output') {
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
      'Backup content tables to a JSON snapshot file.',
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

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
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
    const [
      siteConfig,
      primaryNavigation,
      inquiryProjectType,
      inquiryBudgetRange,
      homeManifesto,
      homeEcosystemTag,
      homeStat,
      service,
      servicePipelineStep,
      workFilter,
      workProject,
      labPrinciple,
      labMatrixRow,
      labSpec,
    ] = await Promise.all([
      prisma.siteConfig.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.primaryNavigation.findMany({ orderBy: { position: 'asc' } }),
      prisma.inquiryProjectType.findMany({ orderBy: { position: 'asc' } }),
      prisma.inquiryBudgetRange.findMany({ orderBy: { position: 'asc' } }),
      prisma.homeManifesto.findMany({ orderBy: { position: 'asc' } }),
      prisma.homeEcosystemTag.findMany({ orderBy: { position: 'asc' } }),
      prisma.homeStat.findMany({ orderBy: { position: 'asc' } }),
      prisma.service.findMany({
        orderBy: { position: 'asc' },
        include: {
          capabilities: {
            orderBy: { position: 'asc' },
          },
          stackItems: {
            orderBy: { position: 'asc' },
          },
          interconnects: {
            orderBy: { position: 'asc' },
          },
        },
      }),
      prisma.servicePipelineStep.findMany({ orderBy: { position: 'asc' } }),
      prisma.workFilter.findMany({ orderBy: { position: 'asc' } }),
      prisma.workProject.findMany({
        orderBy: { position: 'asc' },
        include: {
          disciplines: {
            orderBy: { position: 'asc' },
          },
        },
      }),
      prisma.labPrinciple.findMany({ orderBy: { position: 'asc' } }),
      prisma.labMatrixRow.findMany({ orderBy: { position: 'asc' } }),
      prisma.labSpec.findMany({ orderBy: { position: 'asc' } }),
    ]);

    const document: ContentBackupDocument = {
      generatedAt: new Date().toISOString(),
      tables: {
        siteConfig: siteConfig.map((item) => ({
          id: item.id,
          name: item.name,
          shortName: item.shortName,
          descriptor: item.descriptor,
          defaultTitle: item.defaultTitle,
          description: item.description,
          contactEmail: item.contactEmail,
          responseWindow: item.responseWindow,
          statusLabel: item.statusLabel,
          intakeMode: item.intakeMode,
          heroHeadline: item.heroHeadline,
          positionTitle: item.positionTitle,
          positionBody: item.positionBody,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        primaryNavigation: primaryNavigation.map((item) => ({
          id: item.id,
          position: item.position,
          to: item.to,
          label: item.label,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        inquiryProjectType: inquiryProjectType.map((item) => ({
          id: item.id,
          position: item.position,
          value: item.value,
          label: item.label,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        inquiryBudgetRange: inquiryBudgetRange.map((item) => ({
          id: item.id,
          position: item.position,
          value: item.value,
          label: item.label,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        homeManifesto: homeManifesto.map((item) => ({
          id: item.id,
          position: item.position,
          icon: item.icon,
          kicker: item.kicker,
          title: item.title,
          copy: item.copy,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        homeEcosystemTag: homeEcosystemTag.map((item) => ({
          id: item.id,
          position: item.position,
          tag: item.tag,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        homeStat: homeStat.map((item) => ({
          id: item.id,
          position: item.position,
          label: item.label,
          value: item.value,
          suffix: item.suffix,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        service: service.map((item) => ({
          id: item.id,
          position: item.position,
          icon: item.icon,
          name: item.name,
          handle: item.handle,
          summary: item.summary,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        serviceCapability: service.flatMap((record) =>
          record.capabilities.map((capability) => ({
            id: capability.id,
            serviceId: capability.serviceId,
            position: capability.position,
            value: capability.value,
            createdAt: capability.createdAt.toISOString(),
            updatedAt: capability.updatedAt.toISOString(),
          })),
        ),
        serviceStackItem: service.flatMap((record) =>
          record.stackItems.map((stackItem) => ({
            id: stackItem.id,
            serviceId: stackItem.serviceId,
            position: stackItem.position,
            value: stackItem.value,
            createdAt: stackItem.createdAt.toISOString(),
            updatedAt: stackItem.updatedAt.toISOString(),
          })),
        ),
        serviceInterconnect: service.flatMap((record) =>
          record.interconnects.map((interconnect) => ({
            id: interconnect.id,
            serviceId: interconnect.serviceId,
            position: interconnect.position,
            value: interconnect.value,
            createdAt: interconnect.createdAt.toISOString(),
            updatedAt: interconnect.updatedAt.toISOString(),
          })),
        ),
        servicePipelineStep: servicePipelineStep.map((item) => ({
          id: item.id,
          position: item.position,
          icon: item.icon,
          label: item.label,
          step: item.step,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        workFilter: workFilter.map((item) => ({
          id: item.id,
          position: item.position,
          value: item.value,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        workProject: workProject.map((item) => ({
          id: item.id,
          position: item.position,
          projectKey: item.projectKey,
          title: item.title,
          client: item.client,
          year: item.year,
          summary: item.summary,
          coverImageUrl: item.coverImageUrl,
          challenge: item.challenge,
          approach: item.approach,
          outcome: item.outcome,
          featured: item.featured,
          featuredPosition: item.featuredPosition,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        workProjectDiscipline: workProject.flatMap((project) =>
          project.disciplines.map((discipline) => ({
            id: discipline.id,
            projectId: discipline.projectId,
            position: discipline.position,
            value: discipline.value,
            createdAt: discipline.createdAt.toISOString(),
            updatedAt: discipline.updatedAt.toISOString(),
          })),
        ),
        labPrinciple: labPrinciple.map((item) => ({
          id: item.id,
          position: item.position,
          icon: item.icon,
          name: item.name,
          desc: item.desc,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        labMatrixRow: labMatrixRow.map((item) => ({
          id: item.id,
          position: item.position,
          label: item.label,
          value: item.value,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        labSpec: labSpec.map((item) => ({
          id: item.id,
          position: item.position,
          label: item.label,
          value: item.value,
          deletedAt: serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
      },
    };

    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(
      options.output,
      `${JSON.stringify(document, null, 2)}\n`,
      'utf8',
    );

    console.log(`Backup written to ${options.output}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

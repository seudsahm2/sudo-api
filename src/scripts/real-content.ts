import { PrismaClient } from '@prisma/client';
import { loadCliEnvironment } from './cli-environment';

/**
 * Takes the invented placeholder content out of the live site, so it shows
 * only what has really been built.
 *
 *   npm run content:backup
 *   npm run content:real-content -- confirm
 *
 * - The six seeded placeholder projects are archived (soft-deleted), with
 *   their screenshots, highlights and prototype screens. They stay restorable
 *   from the admin.
 * - The four seeded figures (142 projects, 38 clients, 99.98% uptime, 24
 *   engineers) are archived and replaced with figures counted from published
 *   work: projects shipped, clients, mobile apps and websites.
 * - The About page facts that state the same seeded counts are archived.
 *
 * Every match is on the exact seeded wording, so a record that has been edited
 * since — or a real project that happens to reuse a key — is never touched.
 * Running it again changes nothing.
 */

const PLACEHOLDER_PROJECTS: Record<string, string> = {
  'north-shield': 'North Shield - Sovereign Banking',
  'orbital-labs': 'Orbital Labs - Aerospace Identity',
  'cipher-os': 'Cipher OS - Agentic Workflow',
  'atlas-foundry': 'Atlas Foundry - Manufacturing OS',
  'void-records': 'Void Records - Label Identity',
  'helix-md': 'Helix MD - Clinical Intelligence',
};

const SEEDED_STATS = [
  { label: 'Projects delivered', value: 142 },
  { label: 'Clients supported', value: 38 },
  { label: 'Uptime', value: 99 },
  { label: 'Engineers', value: 24 },
];

const SEEDED_FACTS = [
  { label: 'Engineers', value: '24, across six time zones' },
  { label: 'Clients served', value: '38, from seed stage to public' },
  { label: 'Projects delivered', value: '142, at 99.98% uptime' },
  // Not confirmed by the owner, so not stated.
  { label: 'Founded', value: '2022, independent' },
];

/** Seeded facts the owner has corrected (2026-10-28). */
const CORRECTED_FACTS = [
  {
    label: 'Headquarters',
    seeded: 'Remote, with people in New York, Berlin and Singapore',
    value: 'Addis Ababa, Ethiopia',
  },
  {
    label: 'Languages',
    seeded: 'English, German, French, Japanese, Portuguese',
    value: 'English and Amharic',
  },
];

/**
 * The seeded "stack" rows named tools nobody confirmed (Rust, Go, Cloudflare,
 * Cinema 4D…). They are replaced with what the studio's own work shows it
 * uses: Flutter for its apps, and the stack this site is built on.
 */
const SEEDED_STACK = [
  'Frontend',
  'Backend',
  'Edge',
  'Intelligence',
  'Design',
  'Motion',
];
const CONFIRMED_STACK = [
  { label: 'Mobile', value: 'Flutter and Dart, for Android and iOS' },
  { label: 'Web', value: 'React, TypeScript, TanStack, Tailwind CSS' },
  { label: 'Backend', value: 'Node.js, NestJS, PostgreSQL, Prisma' },
];

/** The description as seeded, and with a stray test word at the end. */
const SEEDED_DESCRIPTIONS = [
  'Sudo Tech Labs is an engineering-led studio building high-performance web, brand, AI, and motion systems.',
  'Sudo Tech Labs is an engineering-led studio building high-performance web, brand, AI, and motion systems ok.',
];
const DESCRIPTION =
  'Sudo Tech Labs is an engineering and design studio in Addis Ababa, building mobile apps, websites and brand systems for companies that want them done properly.';

/** Shown in this order on the home page once there is work to count. */
const DERIVED_STATS = [
  { label: 'Projects shipped', source: 'projects' },
  { label: 'Clients', source: 'clients' },
  { label: 'Mobile apps', source: 'mobile_apps' },
  { label: 'Websites', source: 'websites' },
];

async function main() {
  loadCliEnvironment();

  if (
    !process.argv
      .slice(2)
      .some((argument) => ['confirm', '--confirm', '--yes'].includes(argument))
  ) {
    throw new Error(
      'This archives the placeholder projects and figures. Take a backup first, then run: npm run content:real-content -- confirm',
    );
  }

  const prisma = new PrismaClient();
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      // Projects, matched on key and seeded title together.
      const placeholders = await tx.workProject.findMany({
        where: {
          deletedAt: null,
          OR: Object.entries(PLACEHOLDER_PROJECTS).map(
            ([projectKey, title]) => ({
              projectKey,
              title,
            }),
          ),
        },
        select: { id: true, projectKey: true },
      });
      const keys = placeholders.map((project) => project.projectKey);

      if (keys.length > 0) {
        await tx.workProject.updateMany({
          where: { id: { in: placeholders.map((project) => project.id) } },
          data: { deletedAt: now, status: 'draft', featured: false },
        });
        for (const model of [
          'workProjectMedia',
          'workProjectHighlight',
          'prototypeScreen',
        ] as const) {
          await (
            tx[model] as { updateMany: (args: object) => Promise<unknown> }
          ).updateMany({
            where: { projectKey: { in: keys }, deletedAt: null },
            data: { deletedAt: now },
          });
        }
      }
      console.log(
        `Placeholder projects archived: ${keys.length ? keys.join(', ') : 'none left'}`,
      );

      // Figures.
      const seededStats = await tx.homeStat.updateMany({
        where: {
          deletedAt: null,
          source: 'manual',
          OR: SEEDED_STATS.map((stat) => ({
            label: stat.label,
            value: stat.value,
          })),
        },
        data: { deletedAt: now },
      });
      console.log(`Seeded figures archived: ${seededStats.count}`);

      const derivedAlready = await tx.homeStat.count({
        where: { deletedAt: null, source: { not: 'manual' } },
      });
      if (derivedAlready === 0) {
        // Positions are unique across archived rows too, so new ones go after
        // the highest ever used.
        const highest = await tx.homeStat.aggregate({
          _max: { position: true },
        });
        let position = (highest._max.position ?? -1) + 1;
        for (const stat of DERIVED_STATS) {
          await tx.homeStat.create({
            data: {
              label: stat.label,
              source: stat.source,
              value: 0,
              position,
            },
          });
          position += 1;
        }
        console.log(
          `Counted figures added: ${DERIVED_STATS.map((stat) => stat.label).join(', ')}`,
        );
      } else {
        console.log('Counted figures already present; none added.');
      }

      // About page facts that repeat the seeded counts.
      const facts = await tx.labSpec.updateMany({
        where: {
          deletedAt: null,
          OR: SEEDED_FACTS.map((fact) => ({
            label: fact.label,
            value: fact.value,
          })),
        },
        data: { deletedAt: now },
      });
      console.log(`Seeded About-page facts archived: ${facts.count}`);

      let corrected = 0;
      for (const fact of CORRECTED_FACTS) {
        const result = await tx.labSpec.updateMany({
          where: { deletedAt: null, label: fact.label, value: fact.seeded },
          data: { value: fact.value },
        });
        corrected += result.count;
      }
      console.log(`About-page facts corrected: ${corrected}`);

      // The stack: only replaced while every seeded row is still as seeded,
      // so a stack the owner has started editing is left to them.
      const seededStack = await tx.labMatrixRow.findMany({
        where: { deletedAt: null },
        select: { id: true, label: true },
      });
      const untouched =
        seededStack.length === SEEDED_STACK.length &&
        seededStack.every((row) => SEEDED_STACK.includes(row.label));
      if (untouched) {
        await tx.labMatrixRow.updateMany({
          where: { id: { in: seededStack.map((row) => row.id) } },
          data: { deletedAt: now },
        });
        const highest = await tx.labMatrixRow.aggregate({
          _max: { position: true },
        });
        let position = (highest._max.position ?? -1) + 1;
        for (const row of CONFIRMED_STACK) {
          await tx.labMatrixRow.create({ data: { ...row, position } });
          position += 1;
        }
        console.log('Stack replaced with Mobile, Web and Backend.');
      } else {
        console.log('Stack already changed from the seed; left alone.');
      }

      const description = await tx.siteConfig.updateMany({
        where: { deletedAt: null, description: { in: SEEDED_DESCRIPTIONS } },
        data: { description: DESCRIPTION },
      });
      console.log(`Site description rewritten: ${description.count}`);
    });
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

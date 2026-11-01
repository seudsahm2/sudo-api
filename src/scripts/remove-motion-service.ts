/**
 * One-off: the firm does not offer film or motion work, so that service, its
 * filter and its enquiry option are retired, and the copy stops mentioning it.
 *
 * Safe to run more than once. Rows are soft-deleted, and copy changes only if
 * it still holds the old wording, so anything edited by hand is left alone.
 *
 *   npx ts-node --transpile-only src/scripts/remove-motion-service.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COPY: [string, string, string][] = [
  [
    'home.capabilities.title',
    'Four disciplines,\none accountable team.',
    'Three disciplines,\none accountable team.',
  ],
  [
    'services.meta.description',
    'Web platforms, brand systems, applied intelligence, and motion — run by one team, against one standard.',
    'Web platforms, brand systems and applied intelligence, run by one team, against one standard.',
  ],
  [
    'services.meta.share-description',
    'Four disciplines, one team, one standard.',
    'Three disciplines, one team, one standard.',
  ],
  [
    'services.hero.title',
    'Four disciplines,\none standard.',
    'Three disciplines,\none standard.',
  ],
  [
    'services.hero.body',
    'Engineering, identity, intelligence and motion, run by one team with shared access to the whole product surface. Nothing is handed to a subcontractor and hoped for.',
    'Engineering, identity and intelligence, run by one team with shared access to the whole product surface. Nothing is handed to a subcontractor and hoped for.',
  ],
];

async function main() {
  const now = new Date();
  const live = { deletedAt: null };
  const report = {
    services: await prisma.service.updateMany({
      where: { handle: 'service/video', ...live },
      data: { deletedAt: now },
    }),
    filters: await prisma.workFilter.updateMany({
      where: { value: { equals: 'Video', mode: 'insensitive' }, ...live },
      data: { deletedAt: now },
    }),
    tags: await prisma.homeEcosystemTag.updateMany({
      where: { tag: { equals: 'Video', mode: 'insensitive' }, ...live },
      data: { deletedAt: now },
    }),
    enquiryTypes: await prisma.inquiryProjectType.updateMany({
      where: { value: 'video', ...live },
      data: { deletedAt: now },
    }),
    interconnects: await prisma.serviceInterconnect.deleteMany({ where: { value: 'video' } }),
  };
  let copy = 0;
  for (const [key, before, after] of COPY) {
    const { count } = await prisma.siteCopy.updateMany({
      where: { key, value: before },
      data: { value: after },
    });
    copy += count;
  }
  console.log(
    Object.fromEntries(Object.entries(report).map(([name, { count }]) => [name, count])),
    { copy },
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

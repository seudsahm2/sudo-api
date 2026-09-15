/**
 * Backfills the showcase fields added with the work page rebuild.
 *
 * Safe to run more than once. Every statement matches on the old value, so a
 * second run changes nothing, and anything already edited by hand is left
 * alone. Nothing is deleted.
 *
 *   npx ts-node --transpile-only src/scripts/showcase-backfill.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Which frame each of the seeded placeholder projects is drawn in, so both the
 * phone and the browser frame are visible before any real work is loaded.
 * Replace these rows with your own projects and set `surface` per project in
 * the work projects editor.
 */
const SURFACES: Record<string, string> = {
  'north-shield': 'both',
  'orbital-labs': 'web',
  'cipher-os': 'web',
  'atlas-foundry': 'both',
  'void-records': 'mobile',
  'helix-md': 'mobile',
};

const INTAKE_MODE_OLD =
  'Your brief is prepared here and sent from your own email app, so nothing is stored on our servers before you press send.';
const INTAKE_MODE_NEW =
  'Enquiries are sent straight to the studio and held in our own system. Nothing is passed to a third-party form service, a mailing list, or an ad platform.';

async function main() {
  let surfaceChanges = 0;

  for (const [projectKey, surface] of Object.entries(SURFACES)) {
    const result = await prisma.workProject.updateMany({
      // Only touch rows still on the default, so a deliberate choice stands.
      where: { projectKey, surface: 'web' },
      data: { surface },
    });
    surfaceChanges += result.count;
  }

  // The old copy described the mailto flow, which no longer exists.
  const intake = await prisma.siteConfig.updateMany({
    where: { intakeMode: INTAKE_MODE_OLD },
    data: { intakeMode: INTAKE_MODE_NEW },
  });

  console.log(`surfaces set: ${surfaceChanges}`);
  console.log(`intake copy rewritten: ${intake.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

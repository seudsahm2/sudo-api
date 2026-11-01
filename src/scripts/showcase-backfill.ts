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

const INTAKE_MODE_OLD =
  'Your brief is prepared here and sent from your own email app, so nothing is stored on our servers before you press send.';
const INTAKE_MODE_NEW =
  'Enquiries are sent straight to the studio and held in our own system. Nothing is passed to a third-party form service, a mailing list, or an ad platform.';

async function main() {
  // The old copy described the mailto flow, which no longer exists.
  const intake = await prisma.siteConfig.updateMany({
    where: { intakeMode: INTAKE_MODE_OLD },
    data: { intakeMode: INTAKE_MODE_NEW },
  });

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

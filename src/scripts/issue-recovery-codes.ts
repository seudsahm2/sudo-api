/**
 * Issues a fresh set of one-time recovery codes for an admin and prints them.
 *
 * This is the zero-configuration way back into the admin panel: no mail server,
 * no SMS gateway, no third-party account. Keep the printed codes somewhere you
 * would keep a spare key — each one can set a new password exactly once, at
 * /admin/login, under "Lost your password?".
 *
 * Issuing replaces every code the admin currently has, so any set printed
 * earlier stops working.
 *
 *   npx ts-node --transpile-only src/scripts/issue-recovery-codes.ts --email you@example.com
 *   npm run admin:recoverycodes -- --email you@example.com --count 10
 */
import { PrismaClient } from '@prisma/client';
import { createHash, randomInt } from 'node:crypto';

const prisma = new PrismaClient();

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode(): string {
  const groups: string[] = [];
  for (let group = 0; group < 3; group += 1) {
    let block = '';
    for (let index = 0; index < 4; index += 1) {
      block += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    groups.push(block);
  }
  return groups.join('-');
}

/** Must match AdminRecoveryService.fingerprint exactly. */
function fingerprint(code: string): string {
  const normalised = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return createHash('sha256').update(normalised).digest('hex');
}

function argValue(flag: string): string | undefined {
  const argv = process.argv.slice(2);
  const inline = argv.find((entry) => entry.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);

  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function main() {
  const email = argValue('--email')?.trim().toLowerCase();
  const count = Number(argValue('--count') ?? 8);

  if (!email) {
    throw new Error('Pass --email <address>.');
  }
  if (!Number.isInteger(count) || count < 1 || count > 24) {
    throw new Error('--count must be a whole number between 1 and 24.');
  }

  const admin = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true, email: true, displayName: true },
  });

  if (!admin) {
    const all = await prisma.adminUser.findMany({ select: { email: true } });
    throw new Error(
      `No admin with email ${email}. Existing admins: ${all.map((a) => a.email).join(', ') || 'none'}`,
    );
  }

  const codes = Array.from({ length: count }, () => newCode());

  await prisma.$transaction([
    prisma.adminRecoveryCode.deleteMany({ where: { adminUserId: admin.id } }),
    prisma.adminRecoveryCode.createMany({
      data: codes.map((code) => ({
        adminUserId: admin.id,
        codeHash: fingerprint(code),
      })),
    }),
  ]);

  console.log('');
  console.log(`Recovery codes for ${admin.email} (${admin.displayName})`);
  console.log('Each one works once. Any set printed earlier no longer works.');
  console.log('');
  for (const code of codes) {
    console.log(`  ${code}`);
  }
  console.log('');
  console.log('Use one at /admin/login under "Lost your password?".');
  console.log('');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

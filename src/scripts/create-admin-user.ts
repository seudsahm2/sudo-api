import { hash } from 'bcrypt';
import { Client as PgClient } from 'pg';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { randomUUID } from 'node:crypto';

interface CliOptions {
  email?: string;
  displayName?: string;
  password?: string;
  role?: string;
  force: boolean;
  help: boolean;
}

function parseSchemaFromDatabaseUrl(databaseUrl: string) {
  try {
    const parsed = new URL(databaseUrl);
    const schema = parsed.searchParams.get('schema')?.trim();
    if (!schema) {
      return null;
    }

    // Keep this strict because schema names are interpolated into SQL identifier quoting.
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
      throw new Error(
        `Invalid schema value "${schema}" in DATABASE_URL. Use letters, numbers, and underscores only.`,
      );
    }

    return schema;
  } catch {
    return null;
  }
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
  // Support running from both sudo-api/ and workspace root directories.
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), 'sudo-api/.env'),
    resolve(process.cwd(), 'sudo-api/.env.local'),
  ];

  for (const path of candidates) {
    loadEnvFile(path);
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    role: 'super_admin',
    force: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }

    if (argument === '--force') {
      options.force = true;
      continue;
    }

    if (argument.startsWith('--email=')) {
      options.email = argument.slice('--email='.length);
      continue;
    }

    if (argument === '--email') {
      options.email = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument.startsWith('--display-name=')) {
      options.displayName = argument.slice('--display-name='.length);
      continue;
    }

    if (argument === '--display-name') {
      options.displayName = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument.startsWith('--password=')) {
      options.password = argument.slice('--password='.length);
      continue;
    }

    if (argument === '--password') {
      options.password = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument.startsWith('--role=')) {
      options.role = argument.slice('--role='.length);
      continue;
    }

    if (argument === '--role') {
      options.role = argv[index + 1];
      index += 1;
      continue;
    }
  }

  return options;
}

function printHelp() {
  output.write(
    [
      'Create or update an admin user for Sudo API.',
      '',
      'Usage:',
      '  npm run admin:createsuperuser',
      '  npm run admin:createsuperuser -- --email admin@example.com --display-name "Admin" --password "StrongPass123" --role super_admin --force',
      '',
      'Flags:',
      '  --email <value>         Admin email address',
      '  --display-name <value>  Admin display name',
      '  --password <value>      Admin password (min 8 chars)',
      '  --role <key>            Admin role key (default: super_admin)',
      '  --force                 Update existing admin with same email',
      '  --help                  Show this help message',
      '',
    ].join('\n'),
  );
}

async function promptMissingValues(options: CliOptions): Promise<CliOptions> {
  const readline = createInterface({ input, output });

  try {
    if (!options.email) {
      options.email = await readline.question('Admin email: ');
    }

    if (!options.displayName) {
      options.displayName = await readline.question('Display name: ');
    }

    if (!options.password) {
      options.password = await readline.question(
        'Password (input is visible in terminal): ',
      );
    }

    if (!options.role) {
      options.role = await readline.question(
        'Role key (default super_admin): ',
      );
    }
  } finally {
    readline.close();
  }

  return options;
}

async function run() {
  loadCliEnvironment();

  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  await promptMissingValues(options);

  const email = options.email?.trim().toLowerCase();
  const displayName = options.displayName?.trim();
  const password = options.password ?? '';
  const roleKey = options.role?.trim() || 'super_admin';

  if (!email || !displayName) {
    throw new Error('Email and display name are required.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required. Add it to sudo-api/.env or your shell environment.',
    );
  }

  const pgClient = new PgClient({
    connectionString: databaseUrl,
  });

  const dbSchema = parseSchemaFromDatabaseUrl(databaseUrl) ?? 'public';

  try {
    await pgClient.connect();
    await pgClient.query(`SET search_path TO "${dbSchema}"`);

    const targetRoleResult = await pgClient.query<{
      id: string;
      key: string;
    }>('SELECT "id", "key" FROM "AdminRole" WHERE "key" = $1 LIMIT 1', [
      roleKey,
    ]);

    const targetRole = targetRoleResult.rows[0];

    if (!targetRole) {
      const availableRolesResult = await pgClient.query<{ key: string }>(
        'SELECT "key" FROM "AdminRole" ORDER BY "key" ASC',
      );
      const roleList = availableRolesResult.rows
        .map((roleRow) => roleRow.key)
        .join(', ');
      throw new Error(
        `Role "${roleKey}" not found. Available roles: ${roleList || 'none'}. Run prisma seed first if roles are missing.`,
      );
    }

    const existingUserResult = await pgClient.query<{ id: string }>(
      'SELECT "id" FROM "AdminUser" WHERE "email" = $1 LIMIT 1',
      [email],
    );
    const existingUser = existingUserResult.rows[0] ?? null;

    const passwordHash = await hash(password, 10);

    if (existingUser && !options.force) {
      throw new Error(
        `Admin user ${email} already exists. Re-run with --force to update password/profile/role.`,
      );
    }

    if (existingUser) {
      const userRoleAssignmentId = randomUUID();

      await pgClient.query('BEGIN');
      try {
        await pgClient.query(
          'UPDATE "AdminUser" SET "displayName" = $1, "passwordHash" = $2, "isActive" = true, "updatedAt" = NOW() WHERE "id" = $3',
          [displayName, passwordHash, existingUser.id],
        );

        await pgClient.query(
          'DELETE FROM "AdminUserRole" WHERE "adminUserId" = $1',
          [existingUser.id],
        );

        await pgClient.query(
          'INSERT INTO "AdminUserRole" ("id", "adminUserId", "adminRoleId", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
          [userRoleAssignmentId, existingUser.id, targetRole.id],
        );

        await pgClient.query('COMMIT');
      } catch (error) {
        await pgClient.query('ROLLBACK');
        throw error;
      }

      output.write(
        [
          '',
          'Admin user updated successfully.',
          `  email: ${email}`,
          `  role: ${targetRole.key}`,
          '',
        ].join('\n'),
      );
      return;
    }

    const createdUserId = randomUUID();
    const userRoleAssignmentId = randomUUID();

    await pgClient.query('BEGIN');
    try {
      await pgClient.query(
        'INSERT INTO "AdminUser" ("id", "email", "displayName", "passwordHash", "isActive", "twoFactorEnabled", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, true, false, NOW(), NOW())',
        [createdUserId, email, displayName, passwordHash],
      );

      await pgClient.query(
        'INSERT INTO "AdminUserRole" ("id", "adminUserId", "adminRoleId", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
        [userRoleAssignmentId, createdUserId, targetRole.id],
      );

      await pgClient.query('COMMIT');
    } catch (error) {
      await pgClient.query('ROLLBACK');
      throw error;
    }

    output.write(
      [
        '',
        'Admin user created successfully.',
        `  email: ${email}`,
        `  role: ${targetRole.key}`,
        '',
      ].join('\n'),
    );
  } finally {
    await pgClient.end();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';

  const looksLikeConnectionStringError =
    message.includes('Invalid connection string') ||
    message.includes('ECONNREFUSED') ||
    message.includes('password authentication failed');

  if (looksLikeConnectionStringError) {
    output.write(
      [
        '\nDatabase connection error while creating admin user.',
        'Verify DATABASE_URL in sudo-api/.env points to a reachable PostgreSQL instance.',
        '',
      ].join('\n'),
    );
  }

  const looksLikeMissingAdminTables =
    message.includes('relation "AdminRole" does not exist') ||
    message.includes('relation "AdminUser" does not exist');

  if (looksLikeMissingAdminTables) {
    const databaseUrl = process.env.DATABASE_URL ?? '';
    const schema = parseSchemaFromDatabaseUrl(databaseUrl) ?? 'public';

    output.write(
      [
        '\nAdmin tables are missing in the target database/schema.',
        `Resolved schema for this command: ${schema}`,
        'Run these commands in sudo-api to create tables and seed roles:',
        '  npm run prisma:db:push',
        '  npm run prisma:seed',
        'Then run admin creation again:',
        '  npm run admin:createsuperuser',
        '',
      ].join('\n'),
    );
  }

  output.write(`\nError: ${message}\n\n`);
  process.exitCode = 1;
});

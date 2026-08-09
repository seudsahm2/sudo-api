import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function applyEnvFile(filePath: string): void {
  const contents = readFileSync(filePath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

const envPath = resolve(__dirname, '..', '.env.test.integration');

if (!existsSync(envPath)) {
  throw new Error(
    `Missing integration env file at ${envPath}. Create it before running Prisma integration e2e tests.`,
  );
}

applyEnvFile(envPath);
process.env.NODE_ENV = 'test';

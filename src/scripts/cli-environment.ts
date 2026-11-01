import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

/** Reads .env the way the API does, without overriding the real environment. */
export function loadCliEnvironment() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), 'sudo-api/.env'),
    resolve(process.cwd(), 'sudo-api/.env.local'),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    for (const line of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      if (!process.env[key]) {
        process.env[key] = stripWrappingQuotes(trimmed.slice(separator + 1));
      }
    }
  }
}

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z
    .string()
    .url()
    .default(
      'postgresql://postgres:postgres@localhost:5432/sudo_api?schema=public',
    ),
  JWT_SECRET: z
    .string()
    .min(32)
    .default('replace-this-with-a-long-random-jwt-secret-before-production'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  // "true", "false", or a hop count. Read in main.ts before Nest boots, and
  // declared here so it survives the whitelist and is documented in one place.
  // Defaults to on in production, where the app is always behind a proxy.
  TRUST_PROXY: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_TIME_WINDOW: z.string().default('1 minute'),
  ADMIN_EMAIL: z.string().email().default('admin@sudotechlabs.com'),
  ADMIN_PASSWORD_HASH: z
    .string()
    .min(20)
    .default('$2b$10$JfQb6T4vrA2aTQdzYJ8m5eY4i8VmEvFziW0o0zjY2xXn47jRd5GRe'),
  ADMIN_JWT_SECRET: z
    .string()
    .min(32)
    .default('replace-this-with-a-separate-admin-jwt-secret-before-production'),
  ADMIN_ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  ADMIN_REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  ADMIN_2FA_ENCRYPTION_KEY: z
    .string()
    .min(32)
    .default('replace-this-with-a-separate-admin-2fa-encryption-key'),
  ADMIN_2FA_ISSUER: z.string().default('Sudo Tech Labs Admin'),

  // Admin session cookies. The console keeps no tokens of its own — the
  // httpOnly cookies are the session — so when the site and the API sit on
  // different domains (Vercel and Render, say) the cookies are third-party and
  // must say so, or the browser drops them and every request after login is
  // anonymous. Left unset, production assumes that split.
  ADMIN_COOKIE_SAMESITE: z.enum(['lax', 'none', 'strict']).optional(),
  // Set to a shared parent (".example.com") when the site and the API are
  // subdomains of one domain, which keeps the cookies first-party.
  ADMIN_COOKIE_DOMAIN: z.string().optional(),

  // S3-compatible object storage for project photography. Provider-neutral:
  // Supabase Storage, R2, and S3 itself all speak this. Upload is disabled
  // unless every one of these is present.
  STORAGE_S3_ENDPOINT: z.string().url().optional(),
  STORAGE_S3_REGION: z.string().optional(),
  STORAGE_S3_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_PUBLIC_URL_BASE: z.string().url().optional(),
  STORAGE_MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const parsed = envSchema.parse(config);

  if (
    parsed.NODE_ENV === 'production' &&
    (parsed.JWT_SECRET.includes('replace-this') ||
      parsed.ADMIN_PASSWORD_HASH.includes(
        'JfQb6T4vrA2aTQdzYJ8m5eY4i8VmEvFziW0o0zjY2xXn47jRd5GRe',
      ) ||
      parsed.ADMIN_JWT_SECRET.includes('replace-this') ||
      parsed.ADMIN_2FA_ENCRYPTION_KEY.includes('replace-this'))
  ) {
    throw new Error(
      'Production environment requires secure JWT_SECRET, ADMIN_JWT_SECRET, ADMIN_2FA_ENCRYPTION_KEY, and ADMIN_PASSWORD_HASH values.',
    );
  }

  return parsed;
}

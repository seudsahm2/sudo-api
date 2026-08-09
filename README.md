# Sudo API

Production-ready backend foundation for Sudo Tech Labs.

## Stack

- NestJS 11
- Fastify adapter
- Prisma + PostgreSQL
- JWT auth (Passport)
- OpenAPI (Swagger)
- Security defaults: Helmet, CORS allowlist, rate limiting, DTO validation

## Quick Start

1. Copy environment template:

```bash
cp .env.example .env
```

1. Install dependencies:

```bash
npm install
```

1. Generate Prisma client:

```bash
npm run prisma:generate
```

1. Apply Prisma schema changes (creates content storage table):

```bash
npm run prisma:db:push
```

1. Run in development:

```bash
npm run start:dev
```

API base URL: `http://localhost:4000/api`

Swagger docs: `http://localhost:4000/api/docs`

## Scripts

- `npm run start:dev` - start in watch mode
- `npm run start:dev:nest` - start in watch mode using Nest CLI (legacy path)
- `npm run build` - compile production build
- `npm run lint` - run ESLint
- `npm run test` - run unit tests
- `npm run test:e2e` - run lightweight e2e tests (no Prisma dependency)
- `npm run test:e2e:light` - run lightweight endpoint e2e tests only
- `npm run test:e2e:integration` - run Prisma integration e2e tests against test DB
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:db:push` - sync Prisma schema to local database
- `npm run prisma:migrate:dev` - create/apply local migration
- `npm run prisma:migrate:deploy` - apply migrations in deployment
- `npm run admin:createsuperuser` - create/update an admin user from terminal
- `npm run content:backup` - export the managed content tables to a JSON snapshot
- `npm run content:restore` - restore the managed content tables from a JSON snapshot

## Create Admin User (Terminal)

Use this command to create the first admin account or rotate credentials manually.

Interactive mode:

```bash
npm run admin:createsuperuser
```

Non-interactive mode:

```bash
npm run admin:createsuperuser -- --email admin@sudotechlabs.com --display-name "Sudo Admin" --password "StrongPass123" --role super_admin
```

If the admin already exists and you want to overwrite display name/password/role, add `--force`.

## Content Backup and Restore

These scripts operate on the managed content tables only. They do not touch admin users, sessions, or audit logs.

Create a backup:

```bash
npm run content:backup -- --output backups/content-backup.json
```

Restore from a backup:

```bash
npm run content:restore -- backups/content-backup.json confirm
```

Restore procedure:

1. Take a fresh backup first.
2. Stop write traffic to the API.
3. Run the restore command with `confirm` as the safety token.
4. Restart the API and verify the public site shell and admin collections.

If your shell forwards npm flags normally, this also works:

```bash
npm run content:restore -- --input backups/content-backup.json --confirm
```

## Request Logging

All incoming API requests are logged in the backend terminal via middleware.

Example log line:

```txt
[Nest] ... LOG [HTTP] GET /api/content
```

## E2E Conventions

This project uses two e2e layers:

- Lightweight endpoint e2e: `*.e2e-spec.ts`
- Prisma integration e2e: `*.integration.e2e-spec.ts`

Lightweight tests should import only the feature module they validate.
Integration tests can import `AppModule` and must use the dedicated test database.

## Prisma Integration E2E Setup

1. Create a dedicated PostgreSQL database for integration tests:

```bash
CREATE DATABASE sudo_api_e2e;
```

1. Set `DATABASE_URL` in `.env.test.integration` to your local PostgreSQL credentials and database.

Example:

```bash
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/sudo_api_e2e?schema=public
```

1. Run Prisma integration e2e:

```bash
npm run test:e2e:integration
```

Integration env values are loaded from `.env.test.integration`.

## Authentication

Endpoint:

`POST /api/auth/login`

Body:

```json
{
  "email": "admin@sudotechlabs.com",
  "password": "<plain-password>"
}
```

Use returned `accessToken` as `Authorization: Bearer <token>` for protected endpoints such as `GET /api/auth/me`.

## Security Notes

- Keep `JWT_SECRET` long and random.
- Store only bcrypt hashes in `ADMIN_PASSWORD_HASH`.
- Restrict `CORS_ORIGIN` to trusted frontend/mobile origins.
- Tune rate limits per route/workload in production.

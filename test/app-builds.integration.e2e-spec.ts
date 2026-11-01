import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import helmet from '@fastify/helmet';
import { ConfigModule } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { AppBuildServeController } from '../src/app-builds/app-build.controllers';
import { AppBuildService } from '../src/app-builds/app-build.service';
import { ContentModule } from '../src/content/content.module';
import { ContentService } from '../src/content/content.service';
import { MediaService } from '../src/media/media.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

/** The path an app build is requested on (the apps origin is the inject host). */
function served(status: { buildId: string | null }) {
  return `/api/apps/${status.buildId}/`;
}

/** A minimal zip writer, so the tests can build honest and hostile archives. */
function makeZip(
  entries: Array<{ name: string; data: Buffer; claimSize?: number }>,
): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const compressed = deflateRawSync(entry.data);
    const size = entry.claimSize ?? entry.data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += 30 + name.length + compressed.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, directory, end]);
}

const FLUTTER_INDEX = Buffer.from(
  '<!DOCTYPE html><html><head><base href="/"><meta charset="UTF-8"></head><body><script src="flutter_bootstrap.js" async></script></body></html>',
);

function flutterZip(marker = 'one') {
  return makeZip([
    { name: 'build/web/index.html', data: FLUTTER_INDEX },
    {
      name: 'build/web/flutter_bootstrap.js',
      data: Buffer.from(`// ${marker}`),
    },
    {
      name: 'build/web/main.dart.js',
      data: Buffer.from('void 0;'.repeat(2000)),
    },
    {
      name: 'build/web/canvaskit/canvaskit.wasm',
      data: Buffer.from([0, 0x61, 0x73, 0x6d]),
    },
    { name: 'build/web/assets/NOTICES', data: Buffer.from('licences') },
    { name: '__MACOSX/build/web/._index.html', data: Buffer.from('junk') },
    { name: 'build/other.txt', data: Buffer.from('outside the site') },
  ]);
}

describe('Uploaded app builds (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let builds: AppBuildService;
  let content: ContentService;
  let projectId: string;
  const projectKey = `app-${Math.random().toString(36).slice(2, 8)}`;
  const folder = mkdtempSync(join(tmpdir(), 'app-builds-'));

  beforeAll(async () => {
    const url = process.env.DATABASE_URL ?? '';
    if (!/_e2e/.test(url)) {
      throw new Error(
        'Refusing to run: DATABASE_URL must name an _e2e database, because this suite writes rows.',
      );
    }

    // No bucket, so builds go to disk. Set empty rather than deleted: the
    // Prisma client loads .env on start and fills in any key that is missing.
    for (const key of ['STORAGE_S3_ENDPOINT', 'STORAGE_BUCKET']) {
      process.env[key] = '';
    }
    // Pinned here too: the Prisma client copies .env (which may set a dev
    // apps origin) into process.env, and ConfigService reads that first.
    process.env.APP_BUILDS_ORIGIN = 'http://localhost:80';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          // No bucket configured, so builds go to disk.
          load: [
            () => ({
              APP_BUILDS_DIR: folder,
              APP_BUILD_MAX_UNPACKED_BYTES: 1024 * 1024,
              CORS_ORIGIN: 'https://site.example',
              // inject() sends Host: localhost:80.
              APP_BUILDS_ORIGIN: 'http://localhost:80',
              NODE_ENV: 'production',
            }),
          ],
        }),
        PrismaModule,
        ContentModule,
      ],
      controllers: [AppBuildServeController],
      providers: [AppBuildService, MediaService],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    // Helmet's defaults are what the serve route has to undo.
    await app.register(helmet);
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = moduleRef.get(PrismaService);
    builds = moduleRef.get(AppBuildService);
    content = moduleRef.get(ContentService);

    const project = await prisma.workProject.create({
      data: {
        position: Math.floor(Math.random() * 1_000_000) + 2_000_000,
        projectKey,
        title: 'Hosted app',
        client: 'Acme',
        year: '2026',
        summary: 'Runs in the phone.',
        status: 'published',
        publishedAt: new Date(),
        platforms: ['android'],
        surface: 'phone',
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.workProject.updateMany({
      where: { projectKey },
      data: { deletedAt: new Date(), position: -Date.now() % 1_000_000_000 },
    });
    await app.close();
    rmSync(folder, { recursive: true, force: true });
  });

  it('unpacks a build, finds the site inside the zip and points it at its address', async () => {
    const status = await builds.upload(projectId, flutterZip(), 'demo_app.zip');

    expect(status.buildId).toMatch(/^[a-z0-9]{20}$/);
    expect(status.path).toBe(`http://localhost:80/api/apps/${status.buildId}/`);
    // index, bootstrap, main, wasm, NOTICES — not the macOS junk or build/other.txt.
    expect(status.files).toBe(5);
    expect(status.filename).toBe('demo_app.zip');
    expect(status.storage).toBe('disk');

    const index = await app.inject({
      method: 'GET',
      url: `${served(status)}`,
    });
    expect(index.statusCode).toBe(200);
    expect(index.headers['content-type']).toContain('text/html');
    expect(index.body).toContain(`<base href="/api/apps/${status.buildId}/">`);
    expect(index.body).not.toContain('<base href="/">');
    // The shim that lets Flutter start on an opaque origin.
    expect(index.body).toContain('localStorage');
    expect(index.body).toContain('Navigator.prototype.serviceWorker');

    // The bundle tells the site where the app lives.
    const bundle = await content.getAll();
    const listed = bundle.work.projects.find(
      (entry) => entry.id === projectKey,
    );
    expect(listed?.appPath).toBe(status.path);
  });

  it('serves the files framed by the site only, sandboxed, and cached for good', async () => {
    const status = await builds.status(projectKey);
    const response = await app.inject({
      method: 'GET',
      url: `${served(status)}canvaskit/canvaskit.wasm`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/wasm');
    expect(response.headers['x-frame-options']).toBeUndefined();
    expect(response.headers['cross-origin-opener-policy']).toBeUndefined();
    expect(response.headers['cross-origin-resource-policy']).toBe(
      'cross-origin',
    );
    const csp = String(response.headers['content-security-policy']);
    // No sandbox: the app needs a real origin for its own backend to accept it.
    expect(csp).not.toContain('sandbox');
    expect(csp).toContain("frame-ancestors 'self' https://site.example");
    expect(csp).not.toContain('localhost');
    expect(response.headers['cache-control']).toContain('immutable');

    const notices = await app.inject({
      method: 'GET',
      url: `${served(status)}assets/NOTICES`,
    });
    expect(notices.headers['content-type']).toBe('application/octet-stream');
  });

  it('serves apps only on their own origin, never on the API host', async () => {
    const status = await builds.status(projectKey);
    const onApiHost = await app.inject({
      method: 'GET',
      url: `${served(status)}index.html`,
      headers: { host: 'api.example.com' },
    });
    expect(onApiHost.statusCode).toBe(404);
  });

  it('falls back to index.html for app routes, but not for missing files or escapes', async () => {
    const status = await builds.status(projectKey);
    const base = `${served(status)}`;

    const deepLink = await app.inject({
      method: 'GET',
      url: `${base}orders/42`,
    });
    expect(deepLink.statusCode).toBe(200);
    expect(deepLink.body).toContain('flutter_bootstrap.js');

    expect(
      (await app.inject({ method: 'GET', url: `${base}missing.js` }))
        .statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `${base}..%2F..%2Fpackage.json`,
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/apps/not-a-build/index.html',
        })
      ).statusCode,
    ).toBe(404);

    const bare = await app.inject({
      method: 'GET',
      url: `/api/apps/${status.buildId}`,
    });
    expect(bare.statusCode).toBe(301);
    expect(bare.headers.location).toBe(`${status.buildId}/`);
  });

  it('replaces the old build and deletes its files', async () => {
    const before = await builds.status(projectKey);
    const after = await builds.upload(projectId, flutterZip('two'), 'v2.zip');

    expect(after.buildId).not.toBe(before.buildId);
    expect(existsSync(join(folder, before.buildId!))).toBe(false);
    const bootstrap = await app.inject({
      method: 'GET',
      url: `${served(after)}flutter_bootstrap.js`,
    });
    expect(bootstrap.body).toBe('// two');
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `${served(before)}index.html`,
        })
      ).statusCode,
    ).toBe(404);
  });

  it('refuses hostile and wrong archives', async () => {
    const upload = (zip: Buffer) => builds.upload(projectId, zip, 'x.zip');

    await expect(
      upload(
        makeZip([
          { name: 'index.html', data: FLUTTER_INDEX },
          { name: '../evil.js', data: Buffer.from('x') },
        ]),
      ),
    ).rejects.toThrow('outside');

    // Two megabytes of zeros claiming to be ten bytes, past a 1MB budget.
    await expect(
      upload(
        makeZip([
          {
            name: 'index.html',
            data: Buffer.alloc(2 * 1024 * 1024),
            claimSize: 10,
          },
        ]),
      ),
    ).rejects.toThrow(/larger than 1MB|not the size/);

    await expect(
      upload(makeZip([{ name: 'readme.txt', data: Buffer.from('hi') }])),
    ).rejects.toThrow('index.html');
    await expect(
      upload(Buffer.from('not a zip at all, just text')),
    ).rejects.toThrow('not a zip');

    // The project's source web folder: index.html and icons, no compiled app.
    await expect(
      upload(
        makeZip([
          { name: 'web/index.html', data: FLUTTER_INDEX },
          { name: 'web/manifest.json', data: Buffer.from('{}') },
          { name: 'web/icons/Icon-192.png', data: Buffer.from('png') },
        ]),
      ),
    ).rejects.toThrow('build/web');

    // None of that replaced the working build.
    const status = await builds.status(projectKey);
    expect(status.filename).toBe('v2.zip');
  });

  it('removes the build and the site stops offering it', async () => {
    const before = await builds.status(projectKey);
    const status = await builds.remove(projectKey);

    expect(status.buildId).toBeNull();
    expect(existsSync(join(folder, before.buildId!))).toBe(false);
    const bundle = await content.getAll();
    expect(
      bundle.work.projects.find((entry) => entry.id === projectKey)?.appPath,
    ).toBe('');
  });
});

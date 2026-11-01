import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZipError, readZip, type ZipFile } from './zip-reader';

export interface AppBuildStatus {
  buildId: string | null;
  path: string | null;
  files: number;
  bytes: number;
  filename: string | null;
  uploadedAt: string | null;
  storage: 'bucket' | 'disk';
}

export type ServedFile =
  | { body: Buffer; contentType: string }
  /** Fetched straight from the bucket's CDN instead of through the API. */
  | { redirect: string };

const IMMUTABLE = 'public, max-age=31536000, immutable';

/** Build ids are generated here and checked on the way back in. */
const BUILD_ID = /^[a-z0-9]{20}$/;
const BUCKET_PREFIX = 'app-builds';

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  webmanifest: 'application/manifest+json',
  map: 'application/json; charset=utf-8',
  wasm: 'application/wasm',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

export function contentTypeFor(path: string): string {
  const extension = path.includes('.')
    ? path.split('.').pop()!.toLowerCase()
    : '';
  // Flutter also ships extensionless and odd files (NOTICES, AssetManifest.bin,
  // shaders, canvaskit symbols). They are only ever fetched as data.
  return CONTENT_TYPES[extension] ?? 'application/octet-stream';
}

/**
 * Lets an app run on an opaque origin (see AppBuildServeController). There,
 * several browser features throw the moment they are read, and plenty of apps
 * read them on start:
 *
 * - localStorage / sessionStorage (Flutter's shared_preferences): replaced with
 *   an in-memory store, so the app runs and simply forgets between visits.
 * - navigator.serviceWorker (Flutter's loader): removed, so the loader sees no
 *   service worker support and loads the app directly.
 * - document.cookie: reads as empty, writes are dropped.
 *
 * Each is only touched if reading it actually throws.
 */
const SANDBOX_SHIM =
  '<script>(function(){function memory(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}' +
  ';["localStorage","sessionStorage"].forEach(function(n){try{window[n].getItem("_")}catch(e){try{Object.defineProperty(window,n,{value:memory(),configurable:true})}catch(_){}}})' +
  ';try{navigator.serviceWorker}catch(e){try{delete Navigator.prototype.serviceWorker}catch(_){}}' +
  ';try{document.cookie}catch(e){try{Object.defineProperty(document,"cookie",{get:function(){return""},set:function(){},configurable:true})}catch(_){}}' +
  '})();</script>';

/**
 * Uploaded web builds of the studio's apps.
 *
 * The owner runs `flutter build web` and zips build/web. The zip is unpacked
 * here, its index.html is pointed at the address it will be served from, and
 * every file is stored under a fresh build id. The API serves them back at
 * /api/apps/<buildId>/, so the real app runs inside the phone frame on the
 * site. Any static web build works the same way; Flutter is the usual case.
 *
 * A bucket is preferred, and is the only option that survives a redeploy on
 * hosts with a throwaway disk. Without one, builds go to a folder on disk.
 */
@Injectable()
export class AppBuildService {
  private readonly logger = new Logger(AppBuildService.name);
  private readonly diskRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly config: ConfigService,
  ) {
    this.diskRoot = resolve(
      this.config.get<string>('APP_BUILDS_DIR') ?? 'storage/app-builds',
    );
  }

  get maxUploadBytes(): number {
    return (
      this.config.get<number>('APP_BUILD_MAX_UPLOAD_BYTES') ?? 100 * 1024 * 1024
    );
  }

  async status(projectId: string): Promise<AppBuildStatus> {
    return this.toStatus(await this.findProject(projectId));
  }

  async upload(
    projectId: string,
    archive: Buffer,
    filename: string,
  ): Promise<AppBuildStatus> {
    const project = await this.findProject(projectId);

    let files: ZipFile[];
    try {
      files = readZip(archive, {
        maxTotalBytes:
          this.config.get<number>('APP_BUILD_MAX_UNPACKED_BYTES') ??
          300 * 1024 * 1024,
        maxFiles: 5000,
      });
    } catch (error) {
      if (error instanceof ZipError)
        throw new BadRequestException(error.message);
      throw error;
    }

    const site = this.locateSite(files);
    const buildId = randomBytes(10).toString('hex');
    const bytes = site.reduce((sum, file) => sum + file.data.length, 0);

    for (const file of site) {
      const body =
        file.path === 'index.html'
          ? this.prepareIndex(file.data, buildId)
          : file.data;
      await this.write(buildId, file.path, body);
    }

    const previous = project.appBuildId;
    const updated = await this.prisma.workProject.update({
      where: { id: project.id },
      data: {
        appBuildId: buildId,
        appBuildFiles: site.length,
        appBuildBytes: bytes,
        appBuildFilename: filename.split(/[\\/]/).pop()?.slice(0, 200) ?? null,
        appBuildAt: new Date(),
      },
    });

    if (previous) await this.removeFiles(previous);

    return this.toStatus(updated);
  }

  async remove(projectId: string): Promise<AppBuildStatus> {
    const project = await this.findProject(projectId);
    const updated = await this.prisma.workProject.update({
      where: { id: project.id },
      data: {
        appBuildId: null,
        appBuildFiles: null,
        appBuildBytes: null,
        appBuildFilename: null,
        appBuildAt: null,
      },
    });
    if (project.appBuildId) await this.removeFiles(project.appBuildId);
    return this.toStatus(updated);
  }

  /**
   * One file of a build. Paths without an extension that do not exist fall
   * back to index.html, so an app's own deep links survive a reload.
   */
  async read(buildId: string, requestPath: string): Promise<ServedFile | null> {
    if (!BUILD_ID.test(buildId)) return null;

    let path: string;
    try {
      path = decodeURIComponent(requestPath.split('?')[0] ?? '');
    } catch {
      return null;
    }
    path = path.replace(/^\/+/, '') || 'index.html';
    if (path.endsWith('/')) path += 'index.html';
    if (
      path
        .split('/')
        .some(
          (segment) => segment === '..' || segment === '.' || segment === '',
        )
    ) {
      return null;
    }

    const last = path.split('/').pop() ?? '';
    // An app's own routes (/orders/42) have no extension; Flutter's extension-
    // less files (assets/NOTICES) all live under assets/.
    const appRoute = !last.includes('.') && !path.startsWith('assets/');

    if (this.media.isConfigured) {
      // Only index.html comes through the API: it was rewritten for this
      // address, and the bucket would serve HTML as plain text anyway. The
      // rest — megabytes of JavaScript and wasm — goes straight from the CDN,
      // which is ~25x faster than reading it through the storage API.
      if (path === 'index.html' || appRoute) return this.readIndex(buildId);
      return {
        redirect: this.media.publicUrlFor(
          `${BUCKET_PREFIX}/${buildId}/${path}`,
        ),
      };
    }

    const body = await this.readStored(buildId, path);
    if (body) return { body, contentType: contentTypeFor(path) };
    return appRoute ? this.readIndex(buildId) : null;
  }

  /** index.html is tiny and asked for on every start, so it is kept in memory. */
  private readonly indexCache = new Map<string, Buffer>();

  private async readIndex(buildId: string): Promise<ServedFile | null> {
    let body = this.indexCache.get(buildId) ?? null;
    if (!body) {
      body = await this.readStored(buildId, 'index.html');
      if (!body) return null;
      if (this.indexCache.size > 50) this.indexCache.clear();
      this.indexCache.set(buildId, body);
    }
    return { body, contentType: contentTypeFor('index.html') };
  }

  /**
   * The address the site loads the app from: absolute on APP_BUILDS_ORIGIN
   * when that is set, otherwise relative to the API base.
   */
  static addressFor(buildId: string | null): string {
    if (!buildId) return '';
    const origin = (process.env.APP_BUILDS_ORIGIN ?? '').replace(/\/+$/, '');
    return origin
      ? `${origin}/api/${AppBuildService.pathFor(buildId)}`
      : AppBuildService.pathFor(buildId);
  }

  /** The path under the API base, e.g. apps/<id>/. */
  static pathFor(buildId: string | null): string {
    return buildId ? `apps/${buildId}/` : '';
  }

  private async findProject(projectId: string) {
    const project = await this.prisma.workProject.findFirst({
      where: {
        OR: [{ id: projectId }, { projectKey: projectId }],
        deletedAt: null,
      },
    });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  private toStatus(project: {
    appBuildId: string | null;
    appBuildFiles: number | null;
    appBuildBytes: number | null;
    appBuildFilename: string | null;
    appBuildAt: Date | null;
  }): AppBuildStatus {
    return {
      buildId: project.appBuildId,
      path: project.appBuildId
        ? AppBuildService.addressFor(project.appBuildId)
        : null,
      files: project.appBuildFiles ?? 0,
      bytes: project.appBuildBytes ?? 0,
      filename: project.appBuildFilename,
      uploadedAt: project.appBuildAt?.toISOString() ?? null,
      storage: this.media.isConfigured ? 'bucket' : 'disk',
    };
  }

  /**
   * People zip build/web itself, its contents, or the whole build folder. The
   * shallowest index.html marks the site; everything outside it is dropped.
   */
  private locateSite(files: ZipFile[]): ZipFile[] {
    const indexes = files
      .filter(
        (file) =>
          file.path === 'index.html' || file.path.endsWith('/index.html'),
      )
      .sort((a, b) => a.path.split('/').length - b.path.split('/').length);

    if (indexes.length === 0) {
      throw new BadRequestException(
        'There is no index.html in this zip. Run “flutter build web”, then zip the build/web folder.',
      );
    }

    const root = indexes[0].path.slice(0, -'index.html'.length);
    const site = files
      .filter((file) => file.path.startsWith(root))
      .map((file) => ({ path: file.path.slice(root.length), data: file.data }));

    this.requireScripts(site);
    return site;
  }

  /**
   * Every script index.html loads from the build itself must be in the zip.
   * The usual miss: zipping the project's source `web` folder (index.html,
   * icons, manifest) instead of `build/web`, which holds the compiled app.
   * That uploads fine and then shows a blank phone, so it is refused here
   * with the fix spelled out.
   */
  private requireScripts(site: ZipFile[]) {
    const index = site.find((file) => file.path === 'index.html');
    if (!index) return;
    const present = new Set(site.map((file) => file.path));
    const html = index.data.toString('utf8').replace(/<!--[\s\S]*?-->/g, '');
    const missing = [
      ...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi),
    ]
      .map((match) => match[1].split(/[?#]/)[0].replace(/^\.?\//, ''))
      .filter((src) => src && !/^([a-z]+:|\/\/)/i.test(src))
      .filter((src) => !present.has(src));

    if (missing.length === 0) return;

    const flutterSource =
      missing.includes('flutter_bootstrap.js') && !present.has('main.dart.js');
    throw new BadRequestException(
      flutterSource
        ? `This is the web folder from the app's source code, not the built app (${site.length} files; a built app has main.dart.js and is usually 20–40 MB). In the app's folder, run “flutter build web”, then zip build/web — the web folder inside build — and upload that.`
        : `index.html loads ${missing.join(', ')}, which ${missing.length === 1 ? 'is' : 'are'} not in the zip. Zip the whole build output folder and upload it again.`,
    );
  }

  /**
   * Points the build at its own address (Flutter writes `<base href="/">`) and
   * adds the sandbox shim before any of the app's scripts run.
   */
  private prepareIndex(data: Buffer, buildId: string): Buffer {
    const base = `<base href="/api/${AppBuildService.pathFor(buildId)}">`;
    let html = data.toString('utf8');

    if (/<base\b[^>]*>/i.test(html)) {
      html = html.replace(/<base\b[^>]*>/i, `${base}${SANDBOX_SHIM}`);
    } else if (/<head\b[^>]*>/i.test(html)) {
      html = html.replace(
        /<head\b[^>]*>/i,
        (head) => `${head}${base}${SANDBOX_SHIM}`,
      );
    } else {
      html = `${base}${SANDBOX_SHIM}${html}`;
    }

    return Buffer.from(html, 'utf8');
  }

  private async write(buildId: string, path: string, body: Buffer) {
    if (this.media.isConfigured) {
      await this.bucket(() =>
        this.media.putObject(
          `${BUCKET_PREFIX}/${buildId}/${path}`,
          body,
          contentTypeFor(path),
          IMMUTABLE,
        ),
      );
      return;
    }
    const target = this.diskPath(buildId, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
  }

  private async readStored(
    buildId: string,
    path: string,
  ): Promise<Buffer | null> {
    if (this.media.isConfigured) {
      return this.bucket(() =>
        this.media.getObject(`${BUCKET_PREFIX}/${buildId}/${path}`),
      );
    }
    try {
      return await readFile(this.diskPath(buildId, path));
    } catch {
      return null;
    }
  }

  /**
   * A bucket that is down is an outage, not a missing file: say so plainly
   * rather than surfacing the S3 client's parse error. (A paused Supabase
   * project answers every call with HTTP 540 and a line of plain text.)
   */
  private async bucket<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      this.logger.error(
        `Object storage failed (HTTP ${status ?? '?'}): ${String(error)}`,
      );
      throw new ServiceUnavailableException(
        status === 540
          ? 'File storage is unavailable: the Supabase project is paused. Restore it in the Supabase dashboard, then try again.'
          : 'File storage is unavailable right now. Try again in a moment.',
      );
    }
  }

  private async removeFiles(buildId: string) {
    try {
      if (this.media.isConfigured) {
        await this.media.deletePrefix(`${BUCKET_PREFIX}/${buildId}/`);
      } else {
        await rm(this.diskPath(buildId, ''), { recursive: true, force: true });
      }
    } catch (error) {
      // The row no longer points at it, so a leftover is waste, not breakage.
      this.logger.warn(
        `Could not delete old app build ${buildId}: ${String(error)}`,
      );
    }
  }

  /** Belt and braces: the resolved path must stay inside the build's folder. */
  private diskPath(buildId: string, path: string): string {
    const folder = resolve(this.diskRoot, buildId);
    const target = resolve(folder, path);
    if (target !== folder && !target.startsWith(folder + sep)) {
      throw new BadRequestException('Invalid path.');
    }
    return target;
  }
}

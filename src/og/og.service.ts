import { Injectable, Logger } from '@nestjs/common';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import satori from 'satori';
import { ContentService } from '../content/content.service';

export interface OgCard {
  /** Small line above the title: a client, a service, or the page's label. */
  eyebrow: string;
  title: string;
  subtitle: string;
  siteName: string;
  /** #rrggbb; lights the card. */
  glow: string;
  /** A screenshot to show in a phone on the right. */
  imageUrl?: string;
}

const PAGES = [
  'home',
  'work',
  'services',
  'about',
  'contact',
  'links',
] as const;
export type OgPage = (typeof PAGES)[number];

export function isOgPage(value: string): value is OgPage {
  return (PAGES as readonly string[]).includes(value);
}

type Node = {
  type: string;
  props: { style?: Record<string, unknown>; children?: unknown; src?: string };
};

/** satori's element shape, without pulling React into the API. */
function h(
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
  extra: Record<string, unknown> = {},
): Node {
  return {
    type,
    props: { style: { display: 'flex', ...style }, children, ...extra },
  };
}

/**
 * The WebAssembly build of resvg, not the native one: a native panic takes
 * the whole API process down with it, while a WebAssembly trap is an
 * ordinary exception that one image request can catch.
 */
let wasmReady: Promise<void> | null = null;
function ensureWasm() {
  wasmReady ??= initWasm(
    readFileSync(
      join(dirname(require.resolve('@resvg/resvg-wasm')), 'index_bg.wasm'),
    ),
  );
  return wasmReady;
}

const FONT_DIR = join(
  require.resolve('@fontsource/archivo/package.json'),
  '..',
  'files',
);

/**
 * Link-preview images, drawn in the brand: the night ground lit in the
 * project's colour, the brass square, the title at poster size, and the
 * project's own screen in a phone when there is one. 1200 × 630, the size
 * WhatsApp, Telegram, X and Facebook all crop well.
 *
 * Rendered on request and kept in memory, keyed by what is drawn, so an
 * edit in admin produces a new image and an unchanged page costs nothing.
 */
@Injectable()
export class OgService {
  private readonly logger = new Logger(OgService.name);
  private readonly cache = new Map<string, Buffer>();
  private fonts?: Array<{
    name: string;
    data: Buffer;
    weight: 400 | 600 | 800;
    style: 'normal';
  }>;

  constructor(private readonly content: ContentService) {}

  async page(page: OgPage): Promise<Buffer> {
    const bundle = await this.content.getAll();
    const copy = bundle.copy as Record<string, string>;
    const site = bundle.siteConfig;
    const title =
      page === 'home'
        ? site.heroHeadline.replace(/\\n|\n/g, ' ')
        : (
            copy[`${page}.hero.title`] ??
            copy[`${page}.meta.title`] ??
            site.name
          ).replace(/\\n|\n/g, ' ');
    return this.render({
      eyebrow:
        page === 'home'
          ? site.descriptor || site.name
          : (copy[`${page}.meta.title`] ?? ''),
      title,
      subtitle:
        copy[`${page}.meta.share-description`] ??
        copy[`${page}.meta.description`] ??
        '',
      siteName: site.name,
      glow: '#17573F',
    });
  }

  async project(key: string): Promise<Buffer | null> {
    const bundle = await this.content.getAll();
    const project = bundle.work.projects.find((item) => item.id === key);
    if (!project) return null;
    const phone = project.gallery.find((shot) => shot.kind === 'phone');
    return this.render({
      eyebrow: [project.client, project.year].filter(Boolean).join(' · '),
      title: project.title,
      subtitle: project.tagline || project.summary,
      siteName: bundle.siteConfig.name,
      glow: /^#[0-9a-f]{6}$/i.test(project.brandColor)
        ? project.brandColor
        : '#17573F',
      imageUrl:
        phone?.url ||
        project.coverImageUrl ||
        project.gallery[0]?.url ||
        undefined,
    });
  }

  async service(slug: string): Promise<Buffer | null> {
    const bundle = await this.content.getAll();
    const service = bundle.services.services.find((item) => item.slug === slug);
    if (!service) return null;
    return this.render({
      eyebrow: service.name,
      title: service.tagline || service.name,
      subtitle:
        [service.timeline, service.startingFrom].filter(Boolean).join(' · ') ||
        service.summary,
      siteName: bundle.siteConfig.name,
      glow: '#17573F',
      imageUrl: service.imageUrl || undefined,
    });
  }

  private async render(card: OgCard): Promise<Buffer> {
    const key = createHash('sha1').update(JSON.stringify(card)).digest('hex');
    const cached = this.cache.get(key);
    if (cached) return cached;

    const image = card.imageUrl ? await this.fetchImage(card.imageUrl) : null;
    let png: Buffer;
    try {
      png = await this.draw(card, image);
    } catch (error) {
      // A screen that will not draw must not cost the card: try without it.
      if (!image) throw error;
      this.logger.warn(
        `Share image drawn without its screen: ${String(error)}`,
      );
      png = await this.draw(card, null);
    }

    if (this.cache.size > 200) this.cache.clear();
    this.cache.set(key, png);
    return png;
  }

  private async draw(card: OgCard, image: string | null): Promise<Buffer> {
    await ensureWasm();
    const svg = await satori(this.layout(card, image) as never, {
      width: 1200,
      height: 630,
      fonts: this.loadFonts(),
    });
    const renderer = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
    try {
      return Buffer.from(renderer.render().asPng());
    } finally {
      renderer.free();
    }
  }

  /** Screens are inlined: a remote image that fails must not fail the card. */
  private async fetchImage(url: string): Promise<string | null> {
    if (!/^https?:\/\//.test(url)) return null;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) return null;
      const type = response.headers.get('content-type') ?? 'image/png';
      if (!/^image\/(png|jpe?g|webp|gif)/.test(type)) return null;
      const body = Buffer.from(await response.arrayBuffer());
      return `data:${type};base64,${body.toString('base64')}`;
    } catch (error) {
      this.logger.warn(`Could not fetch share image ${url}: ${String(error)}`);
      return null;
    }
  }

  private loadFonts() {
    this.fonts ??= ([400, 600, 800] as const).map((weight) => ({
      name: 'Archivo',
      data: readFileSync(join(FONT_DIR, `archivo-latin-${weight}-normal.woff`)),
      weight,
      style: 'normal' as const,
    }));
    return this.fonts;
  }

  private layout(card: OgCard, image: string | null): Node {
    const title =
      card.title.length > 60 ? `${card.title.slice(0, 57)}…` : card.title;
    const subtitle =
      card.subtitle.length > 120
        ? `${card.subtitle.slice(0, 117)}…`
        : card.subtitle;
    const titleSize = title.length > 34 ? 64 : title.length > 20 ? 80 : 96;

    return h(
      'div',
      {
        // Pixel sizes, not percentages: satori resolved 100% heights larger
        // than the card and pushed the footer off the bottom.
        width: '1200px',
        height: '630px',
        position: 'relative',
        backgroundColor: '#0b120e',
        backgroundImage: `radial-gradient(circle at 78% 30%, ${card.glow}cc 0%, ${card.glow}33 38%, #0b120e 70%)`,
        fontFamily: 'Archivo',
        color: '#f1ede4',
        overflow: 'hidden',
      },
      [
        h(
          'div',
          {
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 72px',
            // satori adds padding outside these sizes: 630 - 2 × 64.
            width: image ? '616px' : '1056px',
            height: '502px',
          },
          [
            h('div', { alignItems: 'center', gap: '16px' }, [
              h('div', {
                width: '22px',
                height: '22px',
                backgroundColor: '#c19a63',
              }),
              h(
                'div',
                {
                  fontSize: '22px',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#8fa89a',
                },
                card.eyebrow,
              ),
            ]),
            h('div', { flexDirection: 'column', gap: '24px' }, [
              h(
                'div',
                {
                  fontSize: `${titleSize}px`,
                  fontWeight: 800,
                  lineHeight: 0.98,
                  letterSpacing: '-0.045em',
                },
                title,
              ),
              subtitle
                ? h(
                    'div',
                    {
                      fontSize: '28px',
                      fontWeight: 400,
                      lineHeight: 1.35,
                      color: '#f1ede4b8',
                    },
                    subtitle,
                  )
                : h('div', {}),
            ]),
            h('div', { alignItems: 'center', gap: '14px' }, [
              h('div', {
                width: '14px',
                height: '14px',
                backgroundColor: '#c19a63',
              }),
              h('div', { fontSize: '24px', fontWeight: 600 }, card.siteName),
            ]),
          ],
        ),
        image
          ? h(
              'div',
              {
                position: 'absolute',
                right: '84px',
                top: '64px',
                // Fits inside the 630px card: anything taller stretches the
                // layout and pushes the footer off the bottom.
                width: '262px',
                height: '502px',
                padding: '10px',
                borderRadius: '44px',
                backgroundColor: '#1c1f1d',
                boxShadow: '0 30px 60px rgba(0,0,0,0.55)',
              },
              // The rounding is on this inner frame, which clips; a radius on
              // the image itself is what crashed the native renderer.
              h(
                'div',
                {
                  width: '242px',
                  height: '482px',
                  borderRadius: '34px',
                  overflow: 'hidden',
                  backgroundColor: '#0b120e',
                },
                h(
                  'img',
                  { width: '242px', height: '482px', objectFit: 'cover' },
                  undefined,
                  {
                    src: image,
                  },
                ),
              ),
            )
          : h('div', { display: 'none' }),
      ],
    );
  }
}

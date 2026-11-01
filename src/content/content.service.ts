import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppBuildService } from '../app-builds/app-build.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContentBundle, defaultContentBundle } from './default-content.bundle';
import { catalogueMap } from './site-copy.catalogue';

/** Only these reach the public site. Drafts stay in the admin. */
const PUBLISHED = { deletedAt: null, status: 'published' } as const;

type PublishedProjectFacts = {
  client: string;
  surface: string;
  platforms: string[];
  industry: string | null;
};

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<ContentBundle> {
    const [site, copy, home, proof, faqs, services, work, lab] =
      await Promise.all([
        this.getSite(),
        this.getCopy(),
        this.getHome(),
        this.getProof(),
        this.getFaqs(),
        this.getServices(),
        this.getWork(),
        this.getLab(),
      ]);

    return {
      ...site,
      copy,
      home,
      proof,
      faqs,
      services,
      work,
      lab,
    };
  }

  async getSite() {
    try {
      const [siteConfig, primaryNavigation, projectTypes, budgetRanges] =
        await Promise.all([
          this.prisma.siteConfig.findFirst({
            where: {
              deletedAt: null,
            },
            orderBy: { createdAt: 'asc' },
          }),
          this.prisma.primaryNavigation.findMany({
            where: {
              deletedAt: null,
            },
            orderBy: { position: 'asc' },
          }),
          this.prisma.inquiryProjectType.findMany({
            where: {
              deletedAt: null,
            },
            orderBy: { position: 'asc' },
          }),
          this.prisma.inquiryBudgetRange.findMany({
            where: {
              deletedAt: null,
            },
            orderBy: { position: 'asc' },
          }),
        ]);

      if (!siteConfig) {
        return {
          siteConfig: defaultContentBundle.siteConfig,
          primaryNavigation: defaultContentBundle.primaryNavigation,
          inquiryOptions: defaultContentBundle.inquiryOptions,
        };
      }

      return {
        siteConfig: {
          name: siteConfig.name,
          shortName: siteConfig.shortName,
          descriptor: siteConfig.descriptor,
          defaultTitle: siteConfig.defaultTitle,
          description: siteConfig.description,
          contactEmail: siteConfig.contactEmail,
          responseWindow: siteConfig.responseWindow,
          statusLabel: siteConfig.statusLabel,
          intakeMode: siteConfig.intakeMode,
          heroHeadline: siteConfig.heroHeadline,
          positionTitle: siteConfig.positionTitle,
          positionBody: siteConfig.positionBody,
          socialTiktok: siteConfig.socialTiktok ?? '',
          socialInstagram: siteConfig.socialInstagram ?? '',
          socialFacebook: siteConfig.socialFacebook ?? '',
          socialX: siteConfig.socialX ?? '',
          socialLinkedin: siteConfig.socialLinkedin ?? '',
          socialYoutube: siteConfig.socialYoutube ?? '',
          whatsappNumber: siteConfig.whatsappNumber ?? '',
          telegramHandle: siteConfig.telegramHandle ?? '',
          // An announcement without words is not shown, whatever the switch says.
          announcement: {
            enabled:
              siteConfig.announcementEnabled &&
              Boolean(siteConfig.announcementText?.trim()),
            text: siteConfig.announcementText ?? '',
            link: siteConfig.announcementLink ?? '',
          },
          analyticsDomain: siteConfig.analyticsDomain ?? '',
          analyticsScriptUrl: siteConfig.analyticsScriptUrl ?? '',
          ogImageUrl: siteConfig.ogImageUrl ?? '',
        },
        primaryNavigation: this.normalizePublicNavigation(
          primaryNavigation.map((item) => ({
            to: item.to,
            label: item.label,
          })),
        ),
        inquiryOptions: {
          projectTypes: projectTypes.map((item) => ({
            value: item.value,
            label: item.label,
          })),
          budgetRanges: budgetRanges.map((item) => ({
            value: item.value,
            label: item.label,
          })),
        },
      };
    } catch {
      this.logger.warn(
        'Failed to read site content from database. Using fallback.',
      );
      return {
        siteConfig: defaultContentBundle.siteConfig,
        primaryNavigation: defaultContentBundle.primaryNavigation,
        inquiryOptions: defaultContentBundle.inquiryOptions,
      };
    }
  }

  /**
   * The catalogue's wording, overlaid with whatever has been edited in admin.
   * A key that exists in code but not yet in the database still has words, so
   * a deploy that adds a section never shows a blank.
   */
  async getCopy(): Promise<Record<string, string>> {
    const copy = catalogueMap();
    try {
      const rows = await this.prisma.siteCopy.findMany({
        where: { deletedAt: null },
        select: { key: true, value: true },
      });
      for (const row of rows) copy[row.key] = row.value;
    } catch {
      this.logger.warn(
        'Failed to read site copy from database. Using defaults.',
      );
    }
    return copy;
  }

  private normalizePublicNavigation(
    items: Array<{ to: string; label: string }>,
  ): Array<{ to: string; label: string }> {
    const normalized = items
      .map((item) => {
        const label = (item.label ?? '').trim();
        const isHomeLabel = label.toLowerCase() === 'home';
        const candidatePath = isHomeLabel
          ? '/'
          : this.sanitizePublicPath(item.to);

        if (!candidatePath) {
          return null;
        }

        return {
          to: candidatePath,
          label: label || (isHomeLabel ? 'home' : 'link'),
        };
      })
      .filter((item): item is { to: string; label: string } => item !== null);

    const hasHome = normalized.some(
      (item) => item.to === '/' || item.label.toLowerCase() === 'home',
    );

    if (!hasHome) {
      normalized.unshift({ to: '/', label: 'home' });
    }

    return normalized.length > 0
      ? normalized
      : [...defaultContentBundle.primaryNavigation];
  }

  private sanitizePublicPath(path: string): string | null {
    const normalized = (path ?? '').trim();

    if (!normalized) {
      return null;
    }

    if (/^https?:\/\//i.test(normalized)) {
      return null;
    }

    if (!normalized.startsWith('/')) {
      return `/${normalized}`;
    }

    if (/^\/admin(?:\/|$)/i.test(normalized)) {
      return null;
    }

    return normalized;
  }

  async getHome() {
    try {
      const [manifesto, ecosystemTags, featuredProjects, stats, published] =
        await Promise.all([
          this.prisma.homeManifesto.findMany({
            where: {
              deletedAt: null,
            },
            orderBy: { position: 'asc' },
          }),
          this.prisma.homeEcosystemTag.findMany({
            where: {
              deletedAt: null,
            },
            orderBy: { position: 'asc' },
          }),
          // Featured work is curated on the work projects themselves — there is
          // no separate table duplicating them.
          this.prisma.workProject.findMany({
            where: { ...PUBLISHED, featured: true },
            orderBy: [{ featuredPosition: 'asc' }, { position: 'asc' }],
            include: {
              disciplines: {
                orderBy: { position: 'asc' },
              },
            },
          }),
          this.prisma.homeStat.findMany({
            where: {
              deletedAt: null,
            },
            orderBy: { position: 'asc' },
          }),
          this.prisma.workProject.findMany({
            where: PUBLISHED,
            select: {
              client: true,
              surface: true,
              platforms: true,
              industry: true,
            },
          }),
        ]);

      return {
        manifesto: manifesto.map((item) => ({
          icon: item.icon,
          kicker: item.kicker,
          title: item.title,
          copy: item.copy,
        })),
        ecosystemTags: ecosystemTags.map((item) => item.tag),
        featuredProjects: featuredProjects.map((project) => ({
          // `id` lets the home page link straight to the case study.
          id: project.projectKey,
          tag: project.client,
          title: project.title,
          discipline: project.disciplines.map((discipline) => discipline.value),
          year: project.year,
          summary: project.summary,
          coverImageUrl: project.coverImageUrl ?? '',
          surface: project.surface,
        })),
        stats: stats
          .map((item) => ({
            item,
            value:
              item.source === 'manual'
                ? item.value
                : this.countFrom(published, item.source),
          }))
          // A counted figure of zero says "we have done nothing", which is
          // never the message. It reappears as soon as there is work to count.
          .filter(({ item, value }) => item.source === 'manual' || value > 0)
          .map(({ item, value }) => ({
            label: item.label,
            value,
            ...(item.suffix ? { suffix: item.suffix } : {}),
          })),
      };
    } catch {
      this.logger.warn(
        'Failed to read home content from database. Using fallback.',
      );
      return defaultContentBundle.home;
    }
  }

  /** Figures counted from published work, so they cannot drift from it. */
  private countFrom(projects: PublishedProjectFacts[], source: string): number {
    const isMobile = (project: PublishedProjectFacts) =>
      project.platforms.includes('android') ||
      project.platforms.includes('ios') ||
      (project.platforms.length === 0 && project.surface !== 'web');
    const isWeb = (project: PublishedProjectFacts) =>
      project.platforms.includes('web') ||
      (project.platforms.length === 0 && project.surface !== 'mobile');
    const distinct = (values: Array<string | null>) =>
      new Set(
        values
          .map((value) => value?.trim().toLowerCase())
          .filter((value): value is string => Boolean(value)),
      ).size;

    switch (source) {
      case 'projects':
        return projects.length;
      case 'clients':
        return distinct(projects.map((project) => project.client));
      case 'mobile_apps':
        return projects.filter(isMobile).length;
      case 'websites':
        return projects.filter(isWeb).length;
      case 'industries':
        return distinct(projects.map((project) => project.industry));
      default:
        return 0;
    }
  }

  async getProof() {
    try {
      const [testimonials, clients] = await Promise.all([
        this.prisma.testimonial.findMany({
          where: { deletedAt: null, featured: true },
          orderBy: { position: 'asc' },
        }),
        this.prisma.clientLogo.findMany({
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
        }),
      ]);

      return {
        testimonials: testimonials.map((item) => ({
          quote: item.quote,
          name: item.name,
          role: item.role,
          company: item.company,
          avatarUrl: item.avatarUrl ?? '',
          projectKey: item.projectKey ?? '',
        })),
        clients: clients.map((item) => ({
          name: item.name,
          logoUrl: item.logoUrl ?? '',
          siteUrl: item.siteUrl ?? '',
          outcomeValue: item.outcomeValue ?? '',
          outcomeLabel: item.outcomeLabel ?? '',
        })),
      };
    } catch {
      this.logger.warn('Failed to read proof from database. Using fallback.');
      return defaultContentBundle.proof;
    }
  }

  async getFaqs() {
    try {
      const faqs = await this.prisma.faq.findMany({
        where: { deletedAt: null },
        orderBy: [{ scope: 'asc' }, { position: 'asc' }],
      });
      return faqs.map((item) => ({
        scope: item.scope,
        question: item.question,
        answer: item.answer,
      }));
    } catch {
      this.logger.warn('Failed to read FAQs from database. Using fallback.');
      return defaultContentBundle.faqs;
    }
  }

  async getServices() {
    try {
      const [services, pipeline] = await Promise.all([
        this.prisma.service.findMany({
          where: {
            deletedAt: null,
          },
          orderBy: { position: 'asc' },
          include: {
            capabilities: {
              orderBy: { position: 'asc' },
            },
            stackItems: {
              orderBy: { position: 'asc' },
            },
            interconnects: {
              orderBy: { position: 'asc' },
            },
          },
        }),
        this.prisma.servicePipelineStep.findMany({
          where: {
            deletedAt: null,
          },
          orderBy: { position: 'asc' },
        }),
      ]);

      return {
        services: services.map((service) => ({
          icon: service.icon,
          name: service.name,
          handle: service.handle,
          summary: service.summary,
          slug: service.slug ?? '',
          tagline: service.tagline ?? '',
          imageUrl: service.imageUrl ?? '',
          deliverables: service.deliverables,
          timeline: service.timeline ?? '',
          startingFrom: service.startingFrom ?? '',
          capabilities: service.capabilities.map((item) => item.value),
          stack: service.stackItems.map((item) => item.value),
          interconnects: service.interconnects.map((item) => item.value),
        })),
        pipeline: pipeline.map((item) => ({
          icon: item.icon,
          label: item.label,
          step: item.step,
        })),
      };
    } catch {
      this.logger.warn(
        'Failed to read services content from database. Using fallback.',
      );
      return defaultContentBundle.services;
    }
  }

  async getWork() {
    try {
      const [filters, projects] = await Promise.all([
        this.prisma.workFilter.findMany({
          where: {
            deletedAt: null,
          },
          orderBy: { position: 'asc' },
        }),
        this.prisma.workProject.findMany({
          where: PUBLISHED,
          orderBy: { position: 'asc' },
          include: {
            disciplines: {
              orderBy: { position: 'asc' },
            },
            stackItems: {
              orderBy: { position: 'asc' },
            },
          },
        }),
      ]);

      const keys = projects.map((project) => project.projectKey);

      // Read in one query each and grouped in memory: a gallery per project
      // would be one round trip each, and there is no page size to hold it down.
      const [media, highlights, screenCounts] = await Promise.all([
        this.prisma.workProjectMedia.findMany({
          where: { deletedAt: null, projectKey: { in: keys } },
          orderBy: [{ projectKey: 'asc' }, { position: 'asc' }],
        }),
        this.prisma.workProjectHighlight.findMany({
          where: { deletedAt: null, projectKey: { in: keys } },
          orderBy: [{ projectKey: 'asc' }, { position: 'asc' }],
        }),
        this.prisma.prototypeScreen.groupBy({
          by: ['projectKey'],
          where: { deletedAt: null, projectKey: { in: keys } },
          _count: { _all: true },
        }),
      ]);

      const galleryByProject = this.groupBy(media, (shot) => shot.projectKey);
      const highlightsByProject = this.groupBy(
        highlights,
        (item) => item.projectKey,
      );
      const screensByProject = new Map(
        screenCounts.map((row) => [row.projectKey, row._count._all]),
      );

      return {
        filters: filters.map((item) => item.value),
        projects: projects.map((project) => ({
          id: project.projectKey,
          title: project.title,
          client: project.client,
          year: project.year,
          discipline: project.disciplines.map((discipline) => discipline.value),
          summary: project.summary,
          coverImageUrl: project.coverImageUrl ?? '',
          challenge: project.challenge ?? '',
          approach: project.approach ?? '',
          outcome: project.outcome ?? '',
          surface: project.surface,
          liveUrl: project.liveUrl ?? '',
          appStoreUrl: project.appStoreUrl ?? '',
          playStoreUrl: project.playStoreUrl ?? '',
          demoUrl: project.demoUrl ?? '',
          appPath: AppBuildService.addressFor(project.appBuildId),
          featured: project.featured,
          metricValue: project.metricValue ?? '',
          metricLabel: project.metricLabel ?? '',
          stack: project.stackItems.map((entry) => entry.value),
          tagline: project.tagline ?? '',
          industry: project.industry ?? '',
          platforms: project.platforms,
          duration: project.duration ?? '',
          brandColor: project.brandColor ?? '',
          publishedAt: project.publishedAt?.toISOString() ?? '',
          gallery: (galleryByProject.get(project.projectKey) ?? []).map(
            (shot) => ({
              url: shot.url,
              kind: shot.kind,
              caption: shot.caption ?? '',
              pageLabel: shot.pageLabel ?? '',
              videoUrl: shot.videoUrl ?? '',
            }),
          ),
          highlights: (highlightsByProject.get(project.projectKey) ?? []).map(
            (item) => ({
              title: item.title,
              body: item.body,
              mediaUrl: item.mediaUrl ?? '',
            }),
          ),
          prototypeScreenCount: screensByProject.get(project.projectKey) ?? 0,
        })),
      };
    } catch {
      this.logger.warn(
        'Failed to read work content from database. Using fallback.',
      );
      return defaultContentBundle.work;
    }
  }

  /**
   * One project's tap-through prototype. Kept out of the main bundle, which
   * every page loads: a prototype is dozens of screens and hotspots, and is
   * only wanted once someone opens it.
   */
  async getPrototype(projectKey: string) {
    const project = await this.prisma.workProject.findFirst({
      where: { ...PUBLISHED, projectKey },
      select: { projectKey: true },
    });
    if (!project) {
      throw new NotFoundException('No published project has that key.');
    }

    const screens = await this.prisma.prototypeScreen.findMany({
      where: { projectKey, deletedAt: null },
      orderBy: { position: 'asc' },
      include: {
        hotspots: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
        },
      },
    });

    // Every screen key that still exists, so a hotspot pointing at a deleted
    // screen is dropped rather than leading the visitor nowhere.
    const live = new Set(screens.map((screen) => screen.screenKey));
    const start =
      screens.find((screen) => screen.isStart)?.screenKey ??
      screens[0]?.screenKey ??
      '';

    return {
      projectKey,
      start,
      screens: screens.map((screen) => ({
        key: screen.screenKey,
        title: screen.title,
        imageUrl: screen.imageUrl,
        width: screen.width,
        height: screen.height,
        scrollable: screen.scrollable,
        statusBarTone: screen.statusBarTone,
        hotspots: screen.hotspots
          .filter(
            (hotspot) =>
              hotspot.action !== 'goto' ||
              (hotspot.targetScreenKey !== null &&
                live.has(hotspot.targetScreenKey)),
          )
          .map((hotspot) => ({
            x: hotspot.x,
            y: hotspot.y,
            w: hotspot.w,
            h: hotspot.h,
            action: hotspot.action,
            target: hotspot.targetScreenKey ?? '',
            url: hotspot.url ?? '',
            transition: hotspot.transition,
            label: hotspot.label ?? '',
          })),
      })),
    };
  }

  async getLab() {
    try {
      const [principles, matrix, labSpecs] = await Promise.all([
        this.prisma.labPrinciple.findMany({
          where: {
            deletedAt: null,
          },
          orderBy: { position: 'asc' },
        }),
        this.prisma.labMatrixRow.findMany({
          where: {
            deletedAt: null,
          },
          orderBy: { position: 'asc' },
        }),
        this.prisma.labSpec.findMany({
          where: {
            deletedAt: null,
          },
          orderBy: { position: 'asc' },
        }),
      ]);

      return {
        principles: principles.map((item) => ({
          icon: item.icon,
          name: item.name,
          desc: item.desc,
        })),
        matrix: matrix.map((item) => [item.label, item.value]),
        labSpecs: labSpecs.map((item) => [item.label, item.value]),
      };
    } catch {
      this.logger.warn(
        'Failed to read lab content from database. Using fallback.',
      );
      return defaultContentBundle.lab;
    }
  }

  private groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    for (const item of items) {
      const key = keyOf(item);
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    }
    return groups;
  }
}

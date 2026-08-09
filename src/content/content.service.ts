import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentBundle, defaultContentBundle } from './default-content.bundle';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<ContentBundle> {
    const [site, home, services, work, lab] = await Promise.all([
      this.getSite(),
      this.getHome(),
      this.getServices(),
      this.getWork(),
      this.getLab(),
    ]);

    return {
      ...site,
      home,
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
      const [manifesto, ecosystemTags, featuredProjects, stats] =
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
            where: { deletedAt: null, featured: true },
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
        })),
        stats: stats.map((item) => ({
          label: item.label,
          value: item.value,
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
          where: {
            deletedAt: null,
          },
          orderBy: { position: 'asc' },
          include: {
            disciplines: {
              orderBy: { position: 'asc' },
            },
          },
        }),
      ]);

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
        })),
      };
    } catch {
      this.logger.warn(
        'Failed to read work content from database. Using fallback.',
      );
      return defaultContentBundle.work;
    }
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
}

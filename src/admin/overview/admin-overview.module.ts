import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';

const DAY = 24 * 60 * 60 * 1000;
const WEEKS = 8;

export interface AdminOverview {
  enquiries: {
    new: number;
    total: number;
    latest: Array<{
      id: string;
      reference: string;
      name: string;
      company: string | null;
      projectType: string;
      status: string;
      utmSource: string | null;
      createdAt: string;
    }>;
    /** Last 90 days, by the platform the visit came from. */
    bySource: Array<{ source: string; count: number }>;
    /** Oldest first, one entry per week, ending this week. */
    weekly: Array<{ weekStart: string; count: number }>;
  };
  projects: {
    published: number;
    drafts: number;
    withoutScreens: Array<{ id: string; title: string }>;
    withoutStory: Array<{ id: string; title: string }>;
  };
  proof: { testimonials: number; clients: number; faqs: number };
  site: {
    announcementEnabled: boolean;
    socialLinks: number;
    whatsapp: boolean;
  };
}

/** Lower case, and "direct" for visits with no source. */
function sourceName(value: string | null): string {
  return value?.trim().toLowerCase() || 'direct';
}

/** Monday 00:00 UTC of the week containing `date`. */
function weekStart(date: Date): Date {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = (start.getUTCDay() + 6) % 7;
  return new Date(start.getTime() - day * DAY);
}

/**
 * Everything the admin dashboard shows in one request: what needs a reply,
 * where enquiries come from, and what is missing from the site.
 */
@Injectable()
export class AdminOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<AdminOverview> {
    const now = new Date();
    const firstWeek = new Date(
      weekStart(now).getTime() - (WEEKS - 1) * 7 * DAY,
    );
    const ninetyDays = new Date(now.getTime() - 90 * DAY);
    const live = { deletedAt: null };

    const [
      newCount,
      total,
      latest,
      recent,
      projects,
      mediaKeys,
      testimonials,
      clients,
      faqs,
      config,
    ] = await Promise.all([
      this.prisma.inquiry.count({ where: { ...live, status: 'new' } }),
      this.prisma.inquiry.count({ where: live }),
      this.prisma.inquiry.findMany({
        where: live,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          reference: true,
          name: true,
          company: true,
          projectType: true,
          status: true,
          utmSource: true,
          createdAt: true,
        },
      }),
      this.prisma.inquiry.findMany({
        where: {
          ...live,
          createdAt: { gte: firstWeek < ninetyDays ? firstWeek : ninetyDays },
        },
        select: { createdAt: true, utmSource: true },
      }),
      this.prisma.workProject.findMany({
        where: live,
        select: {
          id: true,
          title: true,
          projectKey: true,
          status: true,
          coverImageUrl: true,
          challenge: true,
          approach: true,
          outcome: true,
        },
      }),
      this.prisma.workProjectMedia.groupBy({ by: ['projectKey'], where: live }),
      this.prisma.testimonial.count({ where: live }),
      this.prisma.clientLogo.count({ where: live }),
      this.prisma.faq.count({ where: live }),
      this.prisma.siteConfig.findFirst({
        where: live,
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const sources = new Map<string, number>();
    for (const row of recent) {
      if (row.createdAt < ninetyDays) continue;
      const key = sourceName(row.utmSource);
      sources.set(key, (sources.get(key) ?? 0) + 1);
    }

    const weekly = Array.from({ length: WEEKS }, (_, index) => ({
      weekStart: new Date(firstWeek.getTime() + index * 7 * DAY),
      count: 0,
    }));
    for (const row of recent) {
      const index = Math.floor(
        (weekStart(row.createdAt).getTime() - firstWeek.getTime()) / (7 * DAY),
      );
      if (index >= 0 && index < WEEKS) weekly[index].count += 1;
    }

    const withMedia = new Set(mediaKeys.map((row) => row.projectKey));

    return {
      enquiries: {
        new: newCount,
        total,
        latest: latest.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
        bySource: [...sources.entries()]
          .map(([source, count]) => ({ source, count }))
          .sort((left, right) => right.count - left.count),
        weekly: weekly.map((week) => ({
          weekStart: week.weekStart.toISOString(),
          count: week.count,
        })),
      },
      projects: {
        published: projects.filter((project) => project.status === 'published')
          .length,
        drafts: projects.filter((project) => project.status !== 'published')
          .length,
        withoutScreens: projects
          .filter(
            (project) =>
              !withMedia.has(project.projectKey) && !project.coverImageUrl,
          )
          .map((project) => ({ id: project.id, title: project.title })),
        withoutStory: projects
          .filter(
            (project) =>
              !project.challenge && !project.approach && !project.outcome,
          )
          .map((project) => ({ id: project.id, title: project.title })),
      },
      proof: { testimonials, clients, faqs },
      site: {
        announcementEnabled: Boolean(
          config?.announcementEnabled && config.announcementText,
        ),
        socialLinks: config
          ? [
              config.socialTiktok,
              config.socialInstagram,
              config.socialFacebook,
              config.socialX,
              config.socialLinkedin,
              config.socialYoutube,
            ].filter(Boolean).length
          : 0,
        whatsapp: Boolean(config?.whatsappNumber),
      },
    };
  }
}

@ApiTags('admin-overview')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/overview')
export class AdminOverviewController {
  constructor(private readonly overview: AdminOverviewService) {}

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'Dashboard summary: enquiries, sources and missing content',
  })
  get(): Promise<AdminOverview> {
    return this.overview.get();
  }
}

@Module({
  controllers: [AdminOverviewController],
  providers: [AdminOverviewService],
})
export class AdminOverviewModule {}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminAuditService } from '../admin-audit.service';
import { AdminPrincipal } from '../interfaces/admin-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminWorkProjectListQueryDto,
  AdminWorkProjectSortBy,
  AdminWorkProjectStatusFilter,
  AdminSortOrder,
} from './dto/admin-work-project-list-query.dto';
import {
  CreateAdminWorkProjectDto,
  WORK_PROJECT_PLATFORMS,
  WORK_PROJECT_STATUSES,
  WORK_PROJECT_SURFACES,
} from './dto/create-admin-work-project.dto';
import {
  AdminWorkProjectBulkAction,
  AdminWorkProjectBulkDto,
} from './dto/admin-work-project-bulk.dto';
import { UpdateAdminWorkProjectDto } from './dto/update-admin-work-project.dto';

/** An optional field arriving empty means "no value", not an empty string. */
function emptyToNull(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Same, for a PATCH: an absent field is left alone, an empty one is cleared. */
function emptyToUndefinedNull(value?: string): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * The frame follows from where the product runs, so the two can never
 * disagree. No platforms recorded means "keep whatever surface was set".
 */
function surfaceFor(platforms?: string[]): string | undefined {
  if (!platforms || platforms.length === 0) return undefined;
  const web = platforms.includes('web');
  const mobile = platforms.includes('android') || platforms.includes('ios');
  if (web && mobile) return 'both';
  return mobile ? 'mobile' : 'web';
}

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminWorkProjectSnapshot {
  id: string;
  position: number;
  projectKey: string;
  title: string;
  client: string;
  year: string;
  summary: string;
  coverImageUrl: string | null;
  challenge: string | null;
  approach: string | null;
  outcome: string | null;
  surface: string;
  liveUrl: string | null;
  appStoreUrl: string | null;
  playStoreUrl: string | null;
  demoUrl: string | null;
  metricValue: string | null;
  metricLabel: string | null;
  featured: boolean;
  featuredPosition: number | null;
  status: string;
  publishedAt: string | null;
  tagline: string | null;
  industry: string | null;
  platforms: string[];
  duration: string | null;
  brandColor: string | null;
  disciplines: string[];
  stack: string[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWorkProjectModel {
  id: string;
  position: number;
  projectKey: string;
  title: string;
  client: string;
  year: string;
  summary: string;
  coverImageUrl: string | null;
  challenge: string | null;
  approach: string | null;
  outcome: string | null;
  surface: string;
  liveUrl: string | null;
  appStoreUrl: string | null;
  playStoreUrl: string | null;
  demoUrl: string | null;
  metricValue: string | null;
  metricLabel: string | null;
  featured: boolean;
  featuredPosition: number | null;
  status: string;
  publishedAt: string | null;
  tagline: string | null;
  industry: string | null;
  platforms: string[];
  duration: string | null;
  brandColor: string | null;
  disciplines: string[];
  stack: string[];
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWorkProjectListResponse {
  items: AdminWorkProjectModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminWorkProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'work_project',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'position', type: 'number', required: true },
        { key: 'projectKey', type: 'string', required: true, maxLength: 120 },
        { key: 'title', type: 'string', required: true, maxLength: 160 },
        { key: 'client', type: 'string', required: true, maxLength: 160 },
        { key: 'year', type: 'string', required: true, maxLength: 32 },
        { key: 'summary', type: 'string', required: true, maxLength: 500 },
        {
          key: 'coverImageUrl',
          type: 'string',
          required: false,
          maxLength: 500,
        },
        { key: 'challenge', type: 'string', required: false, maxLength: 2000 },
        { key: 'approach', type: 'string', required: false, maxLength: 2000 },
        { key: 'outcome', type: 'string', required: false, maxLength: 2000 },
        {
          key: 'surface',
          type: 'enum',
          required: false,
          options: [...WORK_PROJECT_SURFACES],
        },
        { key: 'liveUrl', type: 'string', required: false, maxLength: 500 },
        { key: 'appStoreUrl', type: 'string', required: false, maxLength: 500 },
        {
          key: 'playStoreUrl',
          type: 'string',
          required: false,
          maxLength: 500,
        },
        { key: 'demoUrl', type: 'string', required: false, maxLength: 500 },
        { key: 'metricValue', type: 'string', required: false, maxLength: 32 },
        { key: 'metricLabel', type: 'string', required: false, maxLength: 120 },
        {
          key: 'status',
          type: 'enum',
          required: false,
          options: [...WORK_PROJECT_STATUSES],
        },
        { key: 'tagline', type: 'string', required: false, maxLength: 160 },
        { key: 'industry', type: 'string', required: false, maxLength: 80 },
        {
          key: 'platforms',
          type: 'string[]',
          required: false,
          options: [...WORK_PROJECT_PLATFORMS],
        },
        { key: 'duration', type: 'string', required: false, maxLength: 40 },
        { key: 'brandColor', type: 'string', required: false, maxLength: 7 },
        { key: 'publishedAt', type: 'datetime', readOnly: true },
        { key: 'featured', type: 'boolean', required: false },
        { key: 'featuredPosition', type: 'number', required: false },
        { key: 'disciplines', type: 'string[]', required: true },
        { key: 'stack', type: 'string[]', required: false },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminWorkProjectSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminWorkProjectStatusFilter),
      },
      bulkActions: Object.values(AdminWorkProjectBulkAction),
    };
  }

  async list(
    query: AdminWorkProjectListQueryDto,
  ): Promise<AdminWorkProjectListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminWorkProjectSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.WorkProjectOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.workProject.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          disciplines: {
            orderBy: { position: 'asc' },
          },
          stackItems: {
            orderBy: { position: 'asc' },
          },
        },
      }),
      this.prisma.workProject.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toModel(item)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getById(id: string): Promise<AdminWorkProjectModel> {
    const item = await this.prisma.workProject.findUnique({
      where: { id },
      include: {
        disciplines: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Work project not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminWorkProjectDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminWorkProjectModel> {
    const created = await this.prisma.workProject.create({
      data: {
        position: dto.position,
        projectKey: dto.projectKey,
        title: dto.title,
        client: dto.client,
        year: dto.year,
        summary: dto.summary,
        coverImageUrl: dto.coverImageUrl ?? null,
        challenge: dto.challenge ?? null,
        approach: dto.approach ?? null,
        outcome: dto.outcome ?? null,
        surface: surfaceFor(dto.platforms) ?? dto.surface ?? 'web',
        status: dto.status ?? 'draft',
        publishedAt: dto.status === 'published' ? new Date() : null,
        tagline: emptyToNull(dto.tagline),
        industry: emptyToNull(dto.industry),
        platforms: dto.platforms ?? [],
        duration: emptyToNull(dto.duration),
        brandColor: emptyToNull(dto.brandColor)?.toUpperCase() ?? null,
        liveUrl: emptyToNull(dto.liveUrl),
        appStoreUrl: emptyToNull(dto.appStoreUrl),
        playStoreUrl: emptyToNull(dto.playStoreUrl),
        demoUrl: emptyToNull(dto.demoUrl),
        metricValue: emptyToNull(dto.metricValue),
        metricLabel: emptyToNull(dto.metricLabel),
        featured: dto.featured ?? false,
        featuredPosition: dto.featuredPosition ?? null,
        disciplines: {
          create: dto.disciplines.map((value, index) => ({
            position: index,
            value,
          })),
        },
        stackItems: {
          create: (dto.stack ?? []).map((value, index) => ({
            position: index,
            value,
          })),
        },
      },
      include: {
        disciplines: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.work_project.create',
      resource: 'work_project',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/work-projects',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminWorkProjectDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminWorkProjectModel> {
    const existing = await this.prisma.workProject.findUnique({
      where: { id },
      include: {
        disciplines: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    this.assertOptimisticConcurrency(existing.updatedAt, dto.expectedUpdatedAt);

    const updated = await this.prisma.$transaction(async (tx) => {
      const project = await tx.workProject.update({
        where: { id },
        data: {
          position: dto.position,
          projectKey: dto.projectKey,
          title: dto.title,
          client: dto.client,
          year: dto.year,
          summary: dto.summary,
          coverImageUrl: emptyToUndefinedNull(dto.coverImageUrl),
          challenge: dto.challenge,
          approach: dto.approach,
          outcome: dto.outcome,
          surface: surfaceFor(dto.platforms) ?? dto.surface,
          status: dto.status,
          // Stamped the first time it goes live, and kept through later
          // unpublish/republish so "new" badges stay honest.
          publishedAt:
            dto.status === 'published' && !existing.publishedAt
              ? new Date()
              : undefined,
          tagline: emptyToUndefinedNull(dto.tagline),
          industry: emptyToUndefinedNull(dto.industry),
          platforms: dto.platforms,
          duration: emptyToUndefinedNull(dto.duration),
          // An empty value clears the colour; `?.` alone would turn that
          // null into undefined and leave the old colour in place.
          brandColor:
            dto.brandColor === undefined
              ? undefined
              : (emptyToNull(dto.brandColor)?.toUpperCase() ?? null),
          liveUrl: emptyToUndefinedNull(dto.liveUrl),
          appStoreUrl: emptyToUndefinedNull(dto.appStoreUrl),
          playStoreUrl: emptyToUndefinedNull(dto.playStoreUrl),
          demoUrl: emptyToUndefinedNull(dto.demoUrl),
          metricValue: emptyToUndefinedNull(dto.metricValue),
          metricLabel: emptyToUndefinedNull(dto.metricLabel),
          featured: dto.featured,
          featuredPosition: dto.featuredPosition,
        },
      });

      if (dto.disciplines) {
        await tx.workProjectDiscipline.deleteMany({
          where: { projectId: id },
        });
        await tx.workProjectDiscipline.createMany({
          data: dto.disciplines.map((value, index) => ({
            projectId: id,
            position: index,
            value,
          })),
        });
      }

      if (dto.stack) {
        await tx.workProjectStackItem.deleteMany({
          where: { projectId: id },
        });
        await tx.workProjectStackItem.createMany({
          data: dto.stack.map((value, index) => ({
            projectId: id,
            position: index,
            value,
          })),
        });
      }

      return tx.workProject.findUniqueOrThrow({
        where: { id: project.id },
        include: {
          disciplines: {
            orderBy: { position: 'asc' },
          },
          stackItems: {
            orderBy: { position: 'asc' },
          },
        },
      });
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.work_project.update',
      resource: 'work_project',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/work-projects/${id}`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(updated),
    });

    return this.toModel(updated);
  }

  async softDelete(
    id: string,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{ id: string; deletedAt: string }> {
    const existing = await this.prisma.workProject.findUnique({
      where: { id },
      include: {
        disciplines: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Work project is already deleted');
    }

    const deleted = await this.prisma.workProject.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        disciplines: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.work_project.delete',
      resource: 'work_project',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/work-projects/${id}`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(deleted),
    });

    return {
      id: deleted.id,
      deletedAt: deleted.deletedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async restore(
    id: string,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminWorkProjectModel> {
    const existing = await this.prisma.workProject.findUnique({
      where: { id },
      include: {
        disciplines: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Work project is not deleted');
    }

    const restored = await this.prisma.workProject.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        disciplines: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.work_project.restore',
      resource: 'work_project',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/work-projects/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminWorkProjectBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminWorkProjectBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.WorkProjectUpdateManyMutationInput =
      dto.action === AdminWorkProjectBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.WorkProjectWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminWorkProjectBulkAction.DELETE ? null : { not: null },
    };

    const result = await this.prisma.workProject.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.work_project.bulk.${dto.action}`,
      resource: 'work_project',
      method: 'POST',
      path: '/api/admin/work-projects/bulk',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      metadata: {
        ids: uniqueIds,
        reason: dto.reason ?? null,
        affectedCount: result.count,
      } as Prisma.InputJsonObject,
    });

    return {
      action: dto.action,
      count: result.count,
      ids: uniqueIds,
    };
  }
  private assertOptimisticConcurrency(
    actualUpdatedAt: Date,
    expectedUpdatedAt?: string,
  ): void {
    if (!expectedUpdatedAt) {
      throw new BadRequestException(
        'expectedUpdatedAt is required for update operations',
      );
    }

    if (actualUpdatedAt.toISOString() !== expectedUpdatedAt) {
      throw new ConflictException(
        'This record has changed since you opened it. Refresh and retry your edit.',
      );
    }
  }
  private buildWhere(
    query: AdminWorkProjectListQueryDto,
  ): Prisma.WorkProjectWhereInput {
    const where: Prisma.WorkProjectWhereInput = {};

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { client: { contains: query.search, mode: 'insensitive' } },
        { year: { contains: query.search, mode: 'insensitive' } },
        { summary: { contains: query.search, mode: 'insensitive' } },
        {
          projectKey: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          disciplines: {
            some: {
              value: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
        {
          stackItems: {
            some: {
              value: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    if (
      (query.status ?? AdminWorkProjectStatusFilter.ACTIVE) ===
      AdminWorkProjectStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminWorkProjectStatusFilter.ACTIVE) ===
      AdminWorkProjectStatusFilter.DELETED
    ) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: {
    id: string;
    position: number;
    projectKey: string;
    title: string;
    client: string;
    year: string;
    summary: string;
    coverImageUrl: string | null;
    challenge: string | null;
    approach: string | null;
    outcome: string | null;
    surface: string;
    liveUrl: string | null;
    appStoreUrl: string | null;
    playStoreUrl: string | null;
    demoUrl: string | null;
    metricValue: string | null;
    metricLabel: string | null;
    featured: boolean;
    featuredPosition: number | null;
    status: string;
    publishedAt: Date | null;
    tagline: string | null;
    industry: string | null;
    platforms: string[];
    duration: string | null;
    brandColor: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    disciplines: Array<{ value: string }>;
    stackItems: Array<{ value: string }>;
  }): Prisma.InputJsonObject {
    return {
      id: item.id,
      position: item.position,
      projectKey: item.projectKey,
      title: item.title,
      client: item.client,
      year: item.year,
      summary: item.summary,
      coverImageUrl: item.coverImageUrl,
      challenge: item.challenge,
      approach: item.approach,
      outcome: item.outcome,
      surface: item.surface,
      liveUrl: item.liveUrl,
      appStoreUrl: item.appStoreUrl,
      playStoreUrl: item.playStoreUrl,
      demoUrl: item.demoUrl,
      metricValue: item.metricValue,
      metricLabel: item.metricLabel,
      featured: item.featured,
      featuredPosition: item.featuredPosition,
      status: item.status,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      tagline: item.tagline,
      industry: item.industry,
      platforms: item.platforms,
      duration: item.duration,
      brandColor: item.brandColor,
      disciplines: item.disciplines.map((discipline) => discipline.value),
      stack: item.stackItems.map((entry) => entry.value),
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: {
    id: string;
    position: number;
    projectKey: string;
    title: string;
    client: string;
    year: string;
    summary: string;
    coverImageUrl: string | null;
    challenge: string | null;
    approach: string | null;
    outcome: string | null;
    surface: string;
    liveUrl: string | null;
    appStoreUrl: string | null;
    playStoreUrl: string | null;
    demoUrl: string | null;
    metricValue: string | null;
    metricLabel: string | null;
    featured: boolean;
    featuredPosition: number | null;
    status: string;
    publishedAt: Date | null;
    tagline: string | null;
    industry: string | null;
    platforms: string[];
    duration: string | null;
    brandColor: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    disciplines: Array<{ value: string }>;
    stackItems: Array<{ value: string }>;
  }): AdminWorkProjectModel {
    return {
      id: item.id,
      position: item.position,
      projectKey: item.projectKey,
      title: item.title,
      client: item.client,
      year: item.year,
      summary: item.summary,
      coverImageUrl: item.coverImageUrl,
      challenge: item.challenge,
      approach: item.approach,
      outcome: item.outcome,
      surface: item.surface,
      liveUrl: item.liveUrl,
      appStoreUrl: item.appStoreUrl,
      playStoreUrl: item.playStoreUrl,
      demoUrl: item.demoUrl,
      metricValue: item.metricValue,
      metricLabel: item.metricLabel,
      featured: item.featured,
      featuredPosition: item.featuredPosition,
      status: item.status,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      tagline: item.tagline,
      industry: item.industry,
      platforms: item.platforms,
      duration: item.duration,
      brandColor: item.brandColor,
      disciplines: item.disciplines.map((discipline) => discipline.value),
      stack: item.stackItems.map((entry) => entry.value),
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

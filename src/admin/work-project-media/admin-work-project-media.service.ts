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
  AdminSortOrder,
  AdminWorkProjectMediaListQueryDto,
  AdminWorkProjectMediaSortBy,
  AdminWorkProjectMediaStatusFilter,
} from './dto/admin-work-project-media-list-query.dto';
import {
  CreateAdminWorkProjectMediaDto,
  WORK_PROJECT_MEDIA_KINDS,
} from './dto/create-admin-work-project-media.dto';
import {
  AdminWorkProjectMediaBulkAction,
  AdminWorkProjectMediaBulkDto,
} from './dto/admin-work-project-media-bulk.dto';
import { UpdateAdminWorkProjectMediaDto } from './dto/update-admin-work-project-media.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminWorkProjectMediaModel {
  id: string;
  projectKey: string;
  position: number;
  url: string;
  kind: string;
  caption: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWorkProjectMediaListResponse {
  items: AdminWorkProjectMediaModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

type MediaRow = {
  id: string;
  projectKey: string;
  position: number;
  url: string;
  kind: string;
  caption: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AdminWorkProjectMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'work_project_media',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'projectKey', type: 'string', required: true, maxLength: 120 },
        { key: 'position', type: 'number', required: true },
        { key: 'url', type: 'string', required: true, maxLength: 500 },
        {
          key: 'kind',
          type: 'enum',
          required: false,
          options: [...WORK_PROJECT_MEDIA_KINDS],
        },
        { key: 'caption', type: 'string', required: false, maxLength: 160 },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminWorkProjectMediaSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminWorkProjectMediaStatusFilter),
      },
      bulkActions: Object.values(AdminWorkProjectMediaBulkAction),
    };
  }

  async list(
    query: AdminWorkProjectMediaListQueryDto,
  ): Promise<AdminWorkProjectMediaListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const sortBy = query.sortBy ?? AdminWorkProjectMediaSortBy.PROJECT_KEY;
    const sortOrder = query.sortOrder ?? AdminSortOrder.ASC;
    // Sorting by project alone would scatter each gallery, so position always
    // acts as the tie-break.
    const orderBy: Prisma.WorkProjectMediaOrderByWithRelationInput[] =
      sortBy === AdminWorkProjectMediaSortBy.PROJECT_KEY
        ? [{ projectKey: sortOrder }, { position: 'asc' }]
        : [{ [sortBy]: sortOrder }];

    const [items, total] = await Promise.all([
      this.prisma.workProjectMedia.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.workProjectMedia.count({ where }),
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

  async getById(id: string): Promise<AdminWorkProjectMediaModel> {
    const item = await this.prisma.workProjectMedia.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Screenshot not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminWorkProjectMediaDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminWorkProjectMediaModel> {
    await this.assertProjectExists(dto.projectKey);

    const created = await this.runWrite(() =>
      this.prisma.workProjectMedia.create({
        data: {
          projectKey: dto.projectKey,
          position: dto.position,
          url: dto.url,
          kind: dto.kind ?? 'browser',
          caption: dto.caption?.trim() ? dto.caption.trim() : null,
        },
      }),
    );

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.work_project_media.create',
      resource: 'work_project_media',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/work-project-media',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminWorkProjectMediaDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminWorkProjectMediaModel> {
    const existing = await this.prisma.workProjectMedia.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    this.assertOptimisticConcurrency(existing.updatedAt, dto.expectedUpdatedAt);

    if (dto.projectKey && dto.projectKey !== existing.projectKey) {
      await this.assertProjectExists(dto.projectKey);
    }

    const updated = await this.runWrite(() =>
      this.prisma.workProjectMedia.update({
        where: { id },
        data: {
          projectKey: dto.projectKey,
          position: dto.position,
          url: dto.url,
          kind: dto.kind,
          caption:
            dto.caption === undefined
              ? undefined
              : dto.caption.trim()
                ? dto.caption.trim()
                : null,
        },
      }),
    );

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.work_project_media.update',
      resource: 'work_project_media',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/work-project-media/${id}`,
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
    const existing = await this.prisma.workProjectMedia.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Screenshot is already deleted');
    }

    const deleted = await this.prisma.workProjectMedia.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.work_project_media.delete',
      resource: 'work_project_media',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/work-project-media/${id}`,
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
  ): Promise<AdminWorkProjectMediaModel> {
    const existing = await this.prisma.workProjectMedia.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Screenshot is not deleted');
    }

    const restored = await this.prisma.workProjectMedia.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.work_project_media.restore',
      resource: 'work_project_media',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/work-project-media/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminWorkProjectMediaBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminWorkProjectMediaBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const isDelete = dto.action === AdminWorkProjectMediaBulkAction.DELETE;
    const result = await this.prisma.workProjectMedia.updateMany({
      where: {
        id: { in: uniqueIds },
        deletedAt: isDelete ? null : { not: null },
      },
      data: isDelete ? { deletedAt: new Date() } : { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.work_project_media.bulk.${dto.action}`,
      resource: 'work_project_media',
      method: 'POST',
      path: '/api/admin/work-project-media/bulk',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      metadata: {
        ids: uniqueIds,
        reason: dto.reason ?? null,
        affectedCount: result.count,
      } as Prisma.InputJsonObject,
    });

    return { action: dto.action, count: result.count, ids: uniqueIds };
  }

  /** Turns the two constraint failures this table can hit into plain English. */
  private async runWrite<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'That project already has a screenshot at this position. Give this one a different position.',
          );
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(
            'No work project has that project key.',
          );
        }
      }
      throw error;
    }
  }

  private async assertProjectExists(projectKey: string): Promise<void> {
    const project = await this.prisma.workProject.findUnique({
      where: { projectKey },
      select: { id: true },
    });

    if (!project) {
      throw new BadRequestException(
        `No work project has the key "${projectKey}".`,
      );
    }
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
    query: AdminWorkProjectMediaListQueryDto,
  ): Prisma.WorkProjectMediaWhereInput {
    const where: Prisma.WorkProjectMediaWhereInput = {};

    if (query.search) {
      where.OR = [
        { projectKey: { contains: query.search, mode: 'insensitive' } },
        { caption: { contains: query.search, mode: 'insensitive' } },
        { url: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const status = query.status ?? AdminWorkProjectMediaStatusFilter.ACTIVE;
    if (status === AdminWorkProjectMediaStatusFilter.ACTIVE) {
      where.deletedAt = null;
    } else if (status === AdminWorkProjectMediaStatusFilter.DELETED) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: MediaRow): Prisma.InputJsonObject {
    return {
      id: item.id,
      projectKey: item.projectKey,
      position: item.position,
      url: item.url,
      kind: item.kind,
      caption: item.caption,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: MediaRow): AdminWorkProjectMediaModel {
    return {
      id: item.id,
      projectKey: item.projectKey,
      position: item.position,
      url: item.url,
      kind: item.kind,
      caption: item.caption,
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

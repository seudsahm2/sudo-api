import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../admin-audit.service';
import { AdminPrincipal } from '../interfaces/admin-principal.interface';
import {
  AdminHomeStatListQueryDto,
  AdminHomeStatSortBy,
  AdminHomeStatStatusFilter,
  AdminSortOrder,
} from './dto/admin-home-stat-list-query.dto';
import {
  CreateAdminHomeStatDto,
  HOME_STAT_SOURCES,
} from './dto/create-admin-home-stat.dto';
import { UpdateAdminHomeStatDto } from './dto/update-admin-home-stat.dto';
import {
  AdminHomeStatBulkAction,
  AdminHomeStatBulkDto,
} from './dto/admin-home-stat-bulk.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminHomeStatModel {
  id: string;
  position: number;
  label: string;
  value: number;
  suffix: string | null;
  source: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminHomeStatListResponse {
  items: AdminHomeStatModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminHomeStatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'home_stat',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'position', type: 'number', required: true },
        { key: 'label', type: 'string', required: true, maxLength: 120 },
        {
          key: 'source',
          type: 'enum',
          required: false,
          options: [...HOME_STAT_SOURCES],
        },
        { key: 'value', type: 'number', required: false },
        { key: 'suffix', type: 'string', required: false, maxLength: 16 },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminHomeStatSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminHomeStatStatusFilter),
      },
      bulkActions: Object.values(AdminHomeStatBulkAction),
    };
  }

  async list(
    query: AdminHomeStatListQueryDto,
  ): Promise<AdminHomeStatListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminHomeStatSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.HomeStatOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.homeStat.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.homeStat.count({ where }),
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

  async getById(id: string): Promise<AdminHomeStatModel> {
    const item = await this.prisma.homeStat.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('Home stat not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminHomeStatDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminHomeStatModel> {
    const created = await this.prisma.homeStat.create({
      data: {
        position: dto.position,
        label: dto.label,
        value: dto.value ?? 0,
        suffix: dto.suffix,
        source: dto.source ?? 'manual',
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.home_stat.create',
      resource: 'home_stat',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/home-stats',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminHomeStatDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminHomeStatModel> {
    const existing = await this.prisma.homeStat.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Home stat not found');
    }

    const updated = await this.prisma.homeStat.update({
      where: { id },
      data: {
        position: dto.position,
        label: dto.label,
        value: dto.value,
        suffix: dto.suffix,
        source: dto.source,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.home_stat.update',
      resource: 'home_stat',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/home-stats/${id}`,
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
    const existing = await this.prisma.homeStat.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Home stat not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Home stat is already deleted');
    }

    const deleted = await this.prisma.homeStat.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.home_stat.delete',
      resource: 'home_stat',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/home-stats/${id}`,
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
  ): Promise<AdminHomeStatModel> {
    const existing = await this.prisma.homeStat.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Home stat not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Home stat is not deleted');
    }

    const restored = await this.prisma.homeStat.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.home_stat.restore',
      resource: 'home_stat',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/home-stats/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminHomeStatBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminHomeStatBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.HomeStatUpdateManyMutationInput =
      dto.action === AdminHomeStatBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.HomeStatWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminHomeStatBulkAction.DELETE ? null : { not: null },
    };

    const result = await this.prisma.homeStat.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.home_stat.bulk.${dto.action}`,
      resource: 'home_stat',
      method: 'POST',
      path: '/api/admin/home-stats/bulk',
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

  private buildWhere(
    query: AdminHomeStatListQueryDto,
  ): Prisma.HomeStatWhereInput {
    const where: Prisma.HomeStatWhereInput = {};

    if (query.search) {
      where.OR = [
        { label: { contains: query.search, mode: 'insensitive' } },
        { suffix: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (
      (query.status ?? AdminHomeStatStatusFilter.ACTIVE) ===
      AdminHomeStatStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminHomeStatStatusFilter.ACTIVE) ===
      AdminHomeStatStatusFilter.DELETED
    ) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: {
    id: string;
    position: number;
    label: string;
    value: number;
    suffix: string | null;
    source: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Prisma.InputJsonObject {
    return {
      id: item.id,
      position: item.position,
      label: item.label,
      value: item.value,
      suffix: item.suffix,
      source: item.source,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: {
    id: string;
    position: number;
    label: string;
    value: number;
    suffix: string | null;
    source: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AdminHomeStatModel {
    return {
      id: item.id,
      position: item.position,
      label: item.label,
      value: item.value,
      suffix: item.suffix,
      source: item.source,
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

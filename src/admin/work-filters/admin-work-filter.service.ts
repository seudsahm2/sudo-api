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
  AdminWorkFilterListQueryDto,
  AdminWorkFilterSortBy,
  AdminWorkFilterStatusFilter,
  AdminSortOrder,
} from './dto/admin-work-filter-list-query.dto';
import { CreateAdminWorkFilterDto } from './dto/create-admin-work-filter.dto';
import {
  AdminWorkFilterBulkAction,
  AdminWorkFilterBulkDto,
} from './dto/admin-work-filter-bulk.dto';
import { UpdateAdminWorkFilterDto } from './dto/update-admin-work-filter.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminWorkFilterSnapshot {
  id: string;
  position: number;
  value: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWorkFilterModel {
  id: string;
  position: number;
  value: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWorkFilterListResponse {
  items: AdminWorkFilterModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminWorkFilterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'work_filter',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'position', type: 'number', required: true },
        { key: 'value', type: 'string', required: true, maxLength: 80 },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminWorkFilterSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminWorkFilterStatusFilter),
      },
      bulkActions: Object.values(AdminWorkFilterBulkAction),
    };
  }

  async list(
    query: AdminWorkFilterListQueryDto,
  ): Promise<AdminWorkFilterListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminWorkFilterSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.WorkFilterOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.workFilter.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.workFilter.count({ where }),
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

  async getById(id: string): Promise<AdminWorkFilterModel> {
    const item = await this.prisma.workFilter.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Work filter not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminWorkFilterDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminWorkFilterModel> {
    const created = await this.prisma.workFilter.create({
      data: {
        position: dto.position,
        value: dto.value,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.work_filter.create',
      resource: 'work_filter',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/work-filters',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminWorkFilterDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminWorkFilterModel> {
    const existing = await this.prisma.workFilter.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    this.assertOptimisticConcurrency(existing.updatedAt, dto.expectedUpdatedAt);

    const updated = await this.prisma.workFilter.update({
      where: { id },
      data: {
        position: dto.position,
        value: dto.value,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.work_filter.update',
      resource: 'work_filter',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/work-filters/${id}`,
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
  ): Promise<{
    id: string;
    deletedAt: string;
  }> {
    const existing = await this.prisma.workFilter.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Work filter is already deleted');
    }

    const deleted = await this.prisma.workFilter.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.work_filter.delete',
      resource: 'work_filter',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/work-filters/${id}`,
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
  ): Promise<AdminWorkFilterModel> {
    const existing = await this.prisma.workFilter.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Work filter is not deleted');
    }

    const restored = await this.prisma.workFilter.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.work_filter.restore',
      resource: 'work_filter',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/work-filters/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminWorkFilterBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminWorkFilterBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.WorkFilterUpdateManyMutationInput =
      dto.action === AdminWorkFilterBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.WorkFilterWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminWorkFilterBulkAction.DELETE ? null : { not: null },
    };

    const result = await this.prisma.workFilter.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.work_filter.bulk.${dto.action}`,
      resource: 'work_filter',
      method: 'POST',
      path: '/api/admin/work-filters/bulk',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      metadata: {
        ids: uniqueIds,
        reason: dto.reason ?? null,
        affectedCount: result.count,
      } as Prisma.InputJsonValue,
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
    query: AdminWorkFilterListQueryDto,
  ): Prisma.WorkFilterWhereInput {
    const where: Prisma.WorkFilterWhereInput = {};

    if (query.search) {
      where.OR = [
        {
          value: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (
      (query.status ?? AdminWorkFilterStatusFilter.ACTIVE) ===
      AdminWorkFilterStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminWorkFilterStatusFilter.ACTIVE) ===
      AdminWorkFilterStatusFilter.DELETED
    ) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: {
    id: string;
    position: number;
    value: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Prisma.InputJsonObject {
    return {
      id: item.id,
      position: item.position,
      value: item.value,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: {
    id: string;
    position: number;
    value: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AdminWorkFilterModel {
    return {
      id: item.id,
      position: item.position,
      value: item.value,
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

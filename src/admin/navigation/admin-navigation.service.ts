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
  AdminNavigationListQueryDto,
  AdminNavigationSortBy,
  AdminNavigationStatusFilter,
  AdminSortOrder,
} from './dto/admin-navigation-list-query.dto';
import { CreateAdminNavigationItemDto } from './dto/create-admin-navigation-item.dto';
import {
  AdminNavigationBulkAction,
  AdminNavigationBulkDto,
} from './dto/admin-navigation-bulk.dto';
import { UpdateAdminNavigationItemDto } from './dto/update-admin-navigation-item.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminNavigationRecordSnapshot {
  id: string;
  position: number;
  to: string;
  label: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNavigationModel {
  id: string;
  position: number;
  to: string;
  label: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNavigationListResponse {
  items: AdminNavigationModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminNavigationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'primary_navigation',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'position', type: 'number', required: true },
        { key: 'to', type: 'string', required: true, maxLength: 120 },
        { key: 'label', type: 'string', required: true, maxLength: 120 },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminNavigationSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminNavigationStatusFilter),
      },
      bulkActions: Object.values(AdminNavigationBulkAction),
    };
  }

  async list(
    query: AdminNavigationListQueryDto,
  ): Promise<AdminNavigationListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminNavigationSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.PrimaryNavigationOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.primaryNavigation.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.primaryNavigation.count({ where }),
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

  async getById(id: string): Promise<AdminNavigationModel> {
    const item = await this.prisma.primaryNavigation.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Navigation item not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminNavigationItemDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminNavigationModel> {
    const safeTo = this.ensurePublicNavigationPath(dto.to);

    const created = await this.prisma.primaryNavigation.create({
      data: {
        position: dto.position,
        to: safeTo,
        label: dto.label,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.primary_navigation.create',
      resource: 'primary_navigation',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/navigation',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminNavigationItemDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminNavigationModel> {
    const existing = await this.prisma.primaryNavigation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    this.assertOptimisticConcurrency(existing.updatedAt, dto.expectedUpdatedAt);

    const safeTo = dto.to ? this.ensurePublicNavigationPath(dto.to) : undefined;

    const updated = await this.prisma.primaryNavigation.update({
      where: { id },
      data: {
        position: dto.position,
        to: safeTo,
        label: dto.label,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.primary_navigation.update',
      resource: 'primary_navigation',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/navigation/${id}`,
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
    const existing = await this.prisma.primaryNavigation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Navigation item is already deleted');
    }

    const deleted = await this.prisma.primaryNavigation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.primary_navigation.delete',
      resource: 'primary_navigation',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/navigation/${id}`,
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
  ): Promise<AdminNavigationModel> {
    const existing = await this.prisma.primaryNavigation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Navigation item is not deleted');
    }

    const restored = await this.prisma.primaryNavigation.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.primary_navigation.restore',
      resource: 'primary_navigation',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/navigation/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminNavigationBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminNavigationBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];

    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.PrimaryNavigationUpdateManyMutationInput =
      dto.action === AdminNavigationBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.PrimaryNavigationWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminNavigationBulkAction.DELETE ? null : { not: null },
    };

    const result = await this.prisma.primaryNavigation.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.primary_navigation.bulk.${dto.action}`,
      resource: 'primary_navigation',
      method: 'POST',
      path: '/api/admin/navigation/bulk',
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
    query: AdminNavigationListQueryDto,
  ): Prisma.PrimaryNavigationWhereInput {
    const where: Prisma.PrimaryNavigationWhereInput = {};

    if (query.search) {
      where.OR = [
        {
          label: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          to: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (
      (query.status ?? AdminNavigationStatusFilter.ACTIVE) ===
      AdminNavigationStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminNavigationStatusFilter.ACTIVE) ===
      AdminNavigationStatusFilter.DELETED
    ) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: {
    id: string;
    position: number;
    to: string;
    label: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Prisma.InputJsonObject {
    return {
      id: item.id,
      position: item.position,
      to: item.to,
      label: item.label,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: {
    id: string;
    position: number;
    to: string;
    label: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AdminNavigationModel {
    return {
      id: item.id,
      position: item.position,
      to: item.to,
      label: item.label,
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private ensurePublicNavigationPath(path: string): string {
    const trimmed = path.trim();

    if (!trimmed) {
      throw new BadRequestException('Navigation path cannot be empty');
    }

    if (!trimmed.startsWith('/')) {
      throw new BadRequestException(
        'Navigation path must start with / for internal public routes',
      );
    }

    if (/^\/admin(?:\/|$)/i.test(trimmed)) {
      throw new BadRequestException(
        'Navigation path cannot target admin routes',
      );
    }

    return trimmed;
  }
}

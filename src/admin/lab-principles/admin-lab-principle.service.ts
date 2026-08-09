import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../admin-audit.service';
import { AdminPrincipal } from '../interfaces/admin-principal.interface';
import {
  AdminLabPrincipleListQueryDto,
  AdminLabPrincipleSortBy,
  AdminLabPrincipleStatusFilter,
  AdminSortOrder,
} from './dto/admin-lab-principle-list-query.dto';
import { CreateAdminLabPrincipleDto } from './dto/create-admin-lab-principle.dto';
import { UpdateAdminLabPrincipleDto } from './dto/update-admin-lab-principle.dto';
import {
  AdminLabPrincipleBulkAction,
  AdminLabPrincipleBulkDto,
} from './dto/admin-lab-principle-bulk.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminLabPrincipleModel {
  id: string;
  position: number;
  icon: string;
  name: string;
  desc: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLabPrincipleListResponse {
  items: AdminLabPrincipleModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminLabPrincipleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'lab_principle',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'position', type: 'number', required: true },
        { key: 'icon', type: 'string', required: true, maxLength: 80 },
        { key: 'name', type: 'string', required: true, maxLength: 120 },
        { key: 'desc', type: 'string', required: true, maxLength: 300 },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminLabPrincipleSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminLabPrincipleStatusFilter),
      },
      bulkActions: Object.values(AdminLabPrincipleBulkAction),
    };
  }

  async list(
    query: AdminLabPrincipleListQueryDto,
  ): Promise<AdminLabPrincipleListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminLabPrincipleSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.LabPrincipleOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.labPrinciple.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.labPrinciple.count({ where }),
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

  async getById(id: string): Promise<AdminLabPrincipleModel> {
    const item = await this.prisma.labPrinciple.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Lab principle not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminLabPrincipleDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminLabPrincipleModel> {
    const created = await this.prisma.labPrinciple.create({
      data: {
        position: dto.position,
        icon: dto.icon,
        name: dto.name,
        desc: dto.desc,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.lab_principle.create',
      resource: 'lab_principle',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/lab-principles',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminLabPrincipleDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminLabPrincipleModel> {
    const existing = await this.prisma.labPrinciple.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    this.assertOptimisticConcurrency(existing.updatedAt, dto.expectedUpdatedAt);

    const updated = await this.prisma.labPrinciple.update({
      where: { id },
      data: {
        position: dto.position,
        icon: dto.icon,
        name: dto.name,
        desc: dto.desc,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.lab_principle.update',
      resource: 'lab_principle',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/lab-principles/${id}`,
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
    const existing = await this.prisma.labPrinciple.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Lab principle is already deleted');
    }

    const deleted = await this.prisma.labPrinciple.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.lab_principle.delete',
      resource: 'lab_principle',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/lab-principles/${id}`,
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
  ): Promise<AdminLabPrincipleModel> {
    const existing = await this.prisma.labPrinciple.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Lab principle is not deleted');
    }

    const restored = await this.prisma.labPrinciple.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.lab_principle.restore',
      resource: 'lab_principle',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/lab-principles/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminLabPrincipleBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminLabPrincipleBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.LabPrincipleUpdateManyMutationInput =
      dto.action === AdminLabPrincipleBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.LabPrincipleWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminLabPrincipleBulkAction.DELETE
          ? null
          : { not: null },
    };

    const result = await this.prisma.labPrinciple.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.lab_principle.bulk.${dto.action}`,
      resource: 'lab_principle',
      method: 'POST',
      path: '/api/admin/lab-principles/bulk',
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
    query: AdminLabPrincipleListQueryDto,
  ): Prisma.LabPrincipleWhereInput {
    const where: Prisma.LabPrincipleWhereInput = {};

    if (query.search) {
      where.OR = [
        { icon: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { desc: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (
      (query.status ?? AdminLabPrincipleStatusFilter.ACTIVE) ===
      AdminLabPrincipleStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminLabPrincipleStatusFilter.ACTIVE) ===
      AdminLabPrincipleStatusFilter.DELETED
    ) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: {
    id: string;
    position: number;
    icon: string;
    name: string;
    desc: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Prisma.InputJsonObject {
    return {
      id: item.id,
      position: item.position,
      icon: item.icon,
      name: item.name,
      desc: item.desc,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: {
    id: string;
    position: number;
    icon: string;
    name: string;
    desc: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AdminLabPrincipleModel {
    return {
      id: item.id,
      position: item.position,
      icon: item.icon,
      name: item.name,
      desc: item.desc,
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

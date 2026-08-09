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
  AdminLabSpecListQueryDto,
  AdminLabSpecSortBy,
  AdminLabSpecStatusFilter,
  AdminSortOrder,
} from './dto/admin-lab-spec-list-query.dto';
import { CreateAdminLabSpecDto } from './dto/create-admin-lab-spec.dto';
import { UpdateAdminLabSpecDto } from './dto/update-admin-lab-spec.dto';
import {
  AdminLabSpecBulkAction,
  AdminLabSpecBulkDto,
} from './dto/admin-lab-spec-bulk.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminLabSpecModel {
  id: string;
  position: number;
  label: string;
  value: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLabSpecListResponse {
  items: AdminLabSpecModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminLabSpecService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'lab_spec',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'position', type: 'number', required: true },
        { key: 'label', type: 'string', required: true, maxLength: 120 },
        { key: 'value', type: 'string', required: true, maxLength: 300 },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminLabSpecSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminLabSpecStatusFilter),
      },
      bulkActions: Object.values(AdminLabSpecBulkAction),
    };
  }

  async list(
    query: AdminLabSpecListQueryDto,
  ): Promise<AdminLabSpecListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminLabSpecSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.LabSpecOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.labSpec.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.labSpec.count({ where }),
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

  async getById(id: string): Promise<AdminLabSpecModel> {
    const item = await this.prisma.labSpec.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('Lab spec not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminLabSpecDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminLabSpecModel> {
    const created = await this.prisma.labSpec.create({
      data: {
        position: dto.position,
        label: dto.label,
        value: dto.value,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.lab_spec.create',
      resource: 'lab_spec',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/lab-specs',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminLabSpecDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminLabSpecModel> {
    const existing = await this.prisma.labSpec.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    this.assertOptimisticConcurrency(existing.updatedAt, dto.expectedUpdatedAt);

    const updated = await this.prisma.labSpec.update({
      where: { id },
      data: {
        position: dto.position,
        label: dto.label,
        value: dto.value,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.lab_spec.update',
      resource: 'lab_spec',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/lab-specs/${id}`,
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
    const existing = await this.prisma.labSpec.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Lab spec is already deleted');
    }

    const deleted = await this.prisma.labSpec.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.lab_spec.delete',
      resource: 'lab_spec',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/lab-specs/${id}`,
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
  ): Promise<AdminLabSpecModel> {
    const existing = await this.prisma.labSpec.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Lab spec is not deleted');
    }

    const restored = await this.prisma.labSpec.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.lab_spec.restore',
      resource: 'lab_spec',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/lab-specs/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminLabSpecBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminLabSpecBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.LabSpecUpdateManyMutationInput =
      dto.action === AdminLabSpecBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.LabSpecWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminLabSpecBulkAction.DELETE ? null : { not: null },
    };

    const result = await this.prisma.labSpec.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.lab_spec.bulk.${dto.action}`,
      resource: 'lab_spec',
      method: 'POST',
      path: '/api/admin/lab-specs/bulk',
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
    query: AdminLabSpecListQueryDto,
  ): Prisma.LabSpecWhereInput {
    const where: Prisma.LabSpecWhereInput = {};

    if (query.search) {
      where.OR = [
        { label: { contains: query.search, mode: 'insensitive' } },
        { value: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (
      (query.status ?? AdminLabSpecStatusFilter.ACTIVE) ===
      AdminLabSpecStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminLabSpecStatusFilter.ACTIVE) ===
      AdminLabSpecStatusFilter.DELETED
    ) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: {
    id: string;
    position: number;
    label: string;
    value: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Prisma.InputJsonObject {
    return {
      id: item.id,
      position: item.position,
      label: item.label,
      value: item.value,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: {
    id: string;
    position: number;
    label: string;
    value: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AdminLabSpecModel {
    return {
      id: item.id,
      position: item.position,
      label: item.label,
      value: item.value,
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

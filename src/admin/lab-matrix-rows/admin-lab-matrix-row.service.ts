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
  AdminLabMatrixRowListQueryDto,
  AdminLabMatrixRowSortBy,
  AdminLabMatrixRowStatusFilter,
  AdminSortOrder,
} from './dto/admin-lab-matrix-row-list-query.dto';
import { CreateAdminLabMatrixRowDto } from './dto/create-admin-lab-matrix-row.dto';
import { UpdateAdminLabMatrixRowDto } from './dto/update-admin-lab-matrix-row.dto';
import {
  AdminLabMatrixRowBulkAction,
  AdminLabMatrixRowBulkDto,
} from './dto/admin-lab-matrix-row-bulk.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminLabMatrixRowModel {
  id: string;
  position: number;
  label: string;
  value: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLabMatrixRowListResponse {
  items: AdminLabMatrixRowModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminLabMatrixRowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'lab_matrix_row',
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
        fields: Object.values(AdminLabMatrixRowSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminLabMatrixRowStatusFilter),
      },
      bulkActions: Object.values(AdminLabMatrixRowBulkAction),
    };
  }

  async list(
    query: AdminLabMatrixRowListQueryDto,
  ): Promise<AdminLabMatrixRowListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminLabMatrixRowSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.LabMatrixRowOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.labMatrixRow.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.labMatrixRow.count({ where }),
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

  async getById(id: string): Promise<AdminLabMatrixRowModel> {
    const item = await this.prisma.labMatrixRow.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('Lab matrix row not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminLabMatrixRowDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminLabMatrixRowModel> {
    const created = await this.prisma.labMatrixRow.create({
      data: {
        position: dto.position,
        label: dto.label,
        value: dto.value,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.lab_matrix_row.create',
      resource: 'lab_matrix_row',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/lab-matrix-rows',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminLabMatrixRowDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminLabMatrixRowModel> {
    const existing = await this.prisma.labMatrixRow.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    this.assertOptimisticConcurrency(existing.updatedAt, dto.expectedUpdatedAt);

    const updated = await this.prisma.labMatrixRow.update({
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
      action: 'content.lab_matrix_row.update',
      resource: 'lab_matrix_row',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/lab-matrix-rows/${id}`,
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
    const existing = await this.prisma.labMatrixRow.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Lab matrix row is already deleted');
    }

    const deleted = await this.prisma.labMatrixRow.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.lab_matrix_row.delete',
      resource: 'lab_matrix_row',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/lab-matrix-rows/${id}`,
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
  ): Promise<AdminLabMatrixRowModel> {
    const existing = await this.prisma.labMatrixRow.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Lab matrix row is not deleted');
    }

    const restored = await this.prisma.labMatrixRow.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.lab_matrix_row.restore',
      resource: 'lab_matrix_row',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/lab-matrix-rows/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminLabMatrixRowBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminLabMatrixRowBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.LabMatrixRowUpdateManyMutationInput =
      dto.action === AdminLabMatrixRowBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.LabMatrixRowWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminLabMatrixRowBulkAction.DELETE
          ? null
          : { not: null },
    };

    const result = await this.prisma.labMatrixRow.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.lab_matrix_row.bulk.${dto.action}`,
      resource: 'lab_matrix_row',
      method: 'POST',
      path: '/api/admin/lab-matrix-rows/bulk',
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
    query: AdminLabMatrixRowListQueryDto,
  ): Prisma.LabMatrixRowWhereInput {
    const where: Prisma.LabMatrixRowWhereInput = {};

    if (query.search) {
      where.OR = [
        { label: { contains: query.search, mode: 'insensitive' } },
        { value: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (
      (query.status ?? AdminLabMatrixRowStatusFilter.ACTIVE) ===
      AdminLabMatrixRowStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminLabMatrixRowStatusFilter.ACTIVE) ===
      AdminLabMatrixRowStatusFilter.DELETED
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
  }): AdminLabMatrixRowModel {
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

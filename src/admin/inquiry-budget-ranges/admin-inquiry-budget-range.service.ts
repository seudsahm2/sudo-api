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
  AdminInquiryBudgetRangeListQueryDto,
  AdminInquiryBudgetRangeSortBy,
  AdminInquiryBudgetRangeStatusFilter,
  AdminSortOrder,
} from './dto/admin-inquiry-budget-range-list-query.dto';
import { CreateAdminInquiryBudgetRangeDto } from './dto/create-admin-inquiry-budget-range.dto';
import { UpdateAdminInquiryBudgetRangeDto } from './dto/update-admin-inquiry-budget-range.dto';
import {
  AdminInquiryBudgetRangeBulkAction,
  AdminInquiryBudgetRangeBulkDto,
} from './dto/admin-inquiry-budget-range-bulk.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminInquiryBudgetRangeModel {
  id: string;
  position: number;
  value: string;
  label: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminInquiryBudgetRangeListResponse {
  items: AdminInquiryBudgetRangeModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminInquiryBudgetRangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'inquiry_budget_range',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'position', type: 'number', required: true },
        { key: 'value', type: 'string', required: true, maxLength: 120 },
        { key: 'label', type: 'string', required: true, maxLength: 160 },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminInquiryBudgetRangeSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminInquiryBudgetRangeStatusFilter),
      },
      bulkActions: Object.values(AdminInquiryBudgetRangeBulkAction),
    };
  }

  async list(
    query: AdminInquiryBudgetRangeListQueryDto,
  ): Promise<AdminInquiryBudgetRangeListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminInquiryBudgetRangeSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.InquiryBudgetRangeOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.inquiryBudgetRange.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.inquiryBudgetRange.count({ where }),
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

  async getById(id: string): Promise<AdminInquiryBudgetRangeModel> {
    const item = await this.prisma.inquiryBudgetRange.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Inquiry budget range not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminInquiryBudgetRangeDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminInquiryBudgetRangeModel> {
    const created = await this.prisma.inquiryBudgetRange.create({
      data: {
        position: dto.position,
        value: dto.value,
        label: dto.label,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.inquiry_budget_range.create',
      resource: 'inquiry_budget_range',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/inquiry-budget-ranges',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminInquiryBudgetRangeDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminInquiryBudgetRangeModel> {
    const existing = await this.prisma.inquiryBudgetRange.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Inquiry budget range not found');
    }

    const updated = await this.prisma.inquiryBudgetRange.update({
      where: { id },
      data: {
        position: dto.position,
        value: dto.value,
        label: dto.label,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.inquiry_budget_range.update',
      resource: 'inquiry_budget_range',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/inquiry-budget-ranges/${id}`,
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
    const existing = await this.prisma.inquiryBudgetRange.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Inquiry budget range not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Inquiry budget range is already deleted');
    }

    const deleted = await this.prisma.inquiryBudgetRange.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.inquiry_budget_range.delete',
      resource: 'inquiry_budget_range',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/inquiry-budget-ranges/${id}`,
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
  ): Promise<AdminInquiryBudgetRangeModel> {
    const existing = await this.prisma.inquiryBudgetRange.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Inquiry budget range not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Inquiry budget range is not deleted');
    }

    const restored = await this.prisma.inquiryBudgetRange.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.inquiry_budget_range.restore',
      resource: 'inquiry_budget_range',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/inquiry-budget-ranges/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminInquiryBudgetRangeBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminInquiryBudgetRangeBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.InquiryBudgetRangeUpdateManyMutationInput =
      dto.action === AdminInquiryBudgetRangeBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.InquiryBudgetRangeWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminInquiryBudgetRangeBulkAction.DELETE
          ? null
          : { not: null },
    };

    const result = await this.prisma.inquiryBudgetRange.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.inquiry_budget_range.bulk.${dto.action}`,
      resource: 'inquiry_budget_range',
      method: 'POST',
      path: '/api/admin/inquiry-budget-ranges/bulk',
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
    query: AdminInquiryBudgetRangeListQueryDto,
  ): Prisma.InquiryBudgetRangeWhereInput {
    const where: Prisma.InquiryBudgetRangeWhereInput = {};

    if (query.search) {
      where.OR = [
        { value: { contains: query.search, mode: 'insensitive' } },
        { label: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (
      (query.status ?? AdminInquiryBudgetRangeStatusFilter.ACTIVE) ===
      AdminInquiryBudgetRangeStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminInquiryBudgetRangeStatusFilter.ACTIVE) ===
      AdminInquiryBudgetRangeStatusFilter.DELETED
    ) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: {
    id: string;
    position: number;
    value: string;
    label: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Prisma.InputJsonObject {
    return {
      id: item.id,
      position: item.position,
      value: item.value,
      label: item.label,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: {
    id: string;
    position: number;
    value: string;
    label: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AdminInquiryBudgetRangeModel {
    return {
      id: item.id,
      position: item.position,
      value: item.value,
      label: item.label,
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

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
  AdminInquiryProjectTypeListQueryDto,
  AdminInquiryProjectTypeSortBy,
  AdminInquiryProjectTypeStatusFilter,
  AdminSortOrder,
} from './dto/admin-inquiry-project-type-list-query.dto';
import { CreateAdminInquiryProjectTypeDto } from './dto/create-admin-inquiry-project-type.dto';
import { UpdateAdminInquiryProjectTypeDto } from './dto/update-admin-inquiry-project-type.dto';
import {
  AdminInquiryProjectTypeBulkAction,
  AdminInquiryProjectTypeBulkDto,
} from './dto/admin-inquiry-project-type-bulk.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminInquiryProjectTypeModel {
  id: string;
  position: number;
  value: string;
  label: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminInquiryProjectTypeListResponse {
  items: AdminInquiryProjectTypeModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminInquiryProjectTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'inquiry_project_type',
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
        fields: Object.values(AdminInquiryProjectTypeSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminInquiryProjectTypeStatusFilter),
      },
      bulkActions: Object.values(AdminInquiryProjectTypeBulkAction),
    };
  }

  async list(
    query: AdminInquiryProjectTypeListQueryDto,
  ): Promise<AdminInquiryProjectTypeListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminInquiryProjectTypeSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.InquiryProjectTypeOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.inquiryProjectType.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.inquiryProjectType.count({ where }),
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

  async getById(id: string): Promise<AdminInquiryProjectTypeModel> {
    const item = await this.prisma.inquiryProjectType.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Inquiry project type not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminInquiryProjectTypeDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminInquiryProjectTypeModel> {
    const created = await this.prisma.inquiryProjectType.create({
      data: {
        position: dto.position,
        value: dto.value,
        label: dto.label,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.inquiry_project_type.create',
      resource: 'inquiry_project_type',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/inquiry-project-types',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminInquiryProjectTypeDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminInquiryProjectTypeModel> {
    const existing = await this.prisma.inquiryProjectType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Inquiry project type not found');
    }

    const updated = await this.prisma.inquiryProjectType.update({
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
      action: 'content.inquiry_project_type.update',
      resource: 'inquiry_project_type',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/inquiry-project-types/${id}`,
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
    const existing = await this.prisma.inquiryProjectType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Inquiry project type not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Inquiry project type is already deleted');
    }

    const deleted = await this.prisma.inquiryProjectType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.inquiry_project_type.delete',
      resource: 'inquiry_project_type',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/inquiry-project-types/${id}`,
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
  ): Promise<AdminInquiryProjectTypeModel> {
    const existing = await this.prisma.inquiryProjectType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Inquiry project type not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Inquiry project type is not deleted');
    }

    const restored = await this.prisma.inquiryProjectType.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.inquiry_project_type.restore',
      resource: 'inquiry_project_type',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/inquiry-project-types/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminInquiryProjectTypeBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminInquiryProjectTypeBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.InquiryProjectTypeUpdateManyMutationInput =
      dto.action === AdminInquiryProjectTypeBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.InquiryProjectTypeWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminInquiryProjectTypeBulkAction.DELETE
          ? null
          : { not: null },
    };

    const result = await this.prisma.inquiryProjectType.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.inquiry_project_type.bulk.${dto.action}`,
      resource: 'inquiry_project_type',
      method: 'POST',
      path: '/api/admin/inquiry-project-types/bulk',
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
    query: AdminInquiryProjectTypeListQueryDto,
  ): Prisma.InquiryProjectTypeWhereInput {
    const where: Prisma.InquiryProjectTypeWhereInput = {};

    if (query.search) {
      where.OR = [
        { value: { contains: query.search, mode: 'insensitive' } },
        { label: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (
      (query.status ?? AdminInquiryProjectTypeStatusFilter.ACTIVE) ===
      AdminInquiryProjectTypeStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminInquiryProjectTypeStatusFilter.ACTIVE) ===
      AdminInquiryProjectTypeStatusFilter.DELETED
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
  }): AdminInquiryProjectTypeModel {
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

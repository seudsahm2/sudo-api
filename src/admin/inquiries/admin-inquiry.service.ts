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
  AdminInquiryBulkAction,
  AdminInquiryBulkDto,
  AdminInquiryListQueryDto,
  AdminInquirySortBy,
  AdminInquiryStatusFilter,
  AdminSortOrder,
  INQUIRY_STATUSES,
  UpdateAdminInquiryDto,
} from './dto/admin-inquiry.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminInquiryModel {
  id: string;
  reference: string;
  name: string;
  email: string;
  company: string | null;
  projectType: string;
  budget: string;
  message: string;
  source: string;
  projectKey: string | null;
  status: string;
  handledAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminInquiryListResponse {
  items: AdminInquiryModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

type InquiryRow = {
  id: string;
  reference: string;
  name: string;
  email: string;
  company: string | null;
  projectType: string;
  budget: string;
  message: string;
  source: string;
  projectKey: string | null;
  status: string;
  handledAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Read-and-triage only. Everything here was typed by someone outside the
 * company, so nothing but `status` is editable — the record of what they
 * actually sent stays exactly as it arrived.
 */
@Injectable()
export class AdminInquiryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'inquiry',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'reference', type: 'string', readOnly: true },
        { key: 'name', type: 'string', readOnly: true },
        { key: 'email', type: 'string', readOnly: true },
        { key: 'company', type: 'string', readOnly: true },
        { key: 'projectType', type: 'string', readOnly: true },
        { key: 'budget', type: 'string', readOnly: true },
        { key: 'message', type: 'string', readOnly: true },
        { key: 'source', type: 'string', readOnly: true },
        { key: 'projectKey', type: 'string', readOnly: true },
        {
          key: 'status',
          type: 'enum',
          required: true,
          options: [...INQUIRY_STATUSES],
        },
        { key: 'handledAt', type: 'datetime', readOnly: true },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminInquirySortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminInquiryStatusFilter),
      },
      bulkActions: Object.values(AdminInquiryBulkAction),
    };
  }

  async list(
    query: AdminInquiryListQueryDto,
  ): Promise<AdminInquiryListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);

    const [items, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        orderBy: {
          [query.sortBy ?? AdminInquirySortBy.CREATED_AT]:
            query.sortOrder ?? AdminSortOrder.DESC,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.inquiry.count({ where }),
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

  async getById(id: string): Promise<AdminInquiryModel> {
    const item = await this.prisma.inquiry.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('Enquiry not found');
    }

    return this.toModel(item);
  }

  /** How many are still untouched — drives the badge on the admin overview. */
  async countNew(): Promise<{ count: number }> {
    const count = await this.prisma.inquiry.count({
      where: { deletedAt: null, status: 'new' },
    });

    return { count };
  }

  async update(
    id: string,
    dto: UpdateAdminInquiryDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminInquiryModel> {
    const existing = await this.prisma.inquiry.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    this.assertOptimisticConcurrency(existing.updatedAt, dto.expectedUpdatedAt);

    const leavingNew = dto.status !== undefined && dto.status !== 'new';

    const updated = await this.prisma.inquiry.update({
      where: { id },
      data: {
        status: dto.status,
        handledAt:
          leavingNew && !existing.handledAt ? new Date() : existing.handledAt,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.inquiry.update',
      resource: 'inquiry',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/inquiries/${id}`,
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
    const existing = await this.prisma.inquiry.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Enquiry is already deleted');
    }

    const deleted = await this.prisma.inquiry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.inquiry.delete',
      resource: 'inquiry',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/inquiries/${id}`,
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
  ): Promise<AdminInquiryModel> {
    const existing = await this.prisma.inquiry.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Enquiry is not deleted');
    }

    const restored = await this.prisma.inquiry.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.inquiry.restore',
      resource: 'inquiry',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/inquiries/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminInquiryBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{ action: AdminInquiryBulkAction; count: number; ids: string[] }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const isDelete = dto.action === AdminInquiryBulkAction.DELETE;
    const result = await this.prisma.inquiry.updateMany({
      where: {
        id: { in: uniqueIds },
        deletedAt: isDelete ? null : { not: null },
      },
      data: isDelete ? { deletedAt: new Date() } : { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.inquiry.bulk.${dto.action}`,
      resource: 'inquiry',
      method: 'POST',
      path: '/api/admin/inquiries/bulk',
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
    query: AdminInquiryListQueryDto,
  ): Prisma.InquiryWhereInput {
    const where: Prisma.InquiryWhereInput = {};

    if (query.search) {
      where.OR = [
        { reference: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
        { projectType: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const status = query.status ?? AdminInquiryStatusFilter.ACTIVE;
    if (status === AdminInquiryStatusFilter.ACTIVE) {
      where.deletedAt = null;
    } else if (status === AdminInquiryStatusFilter.DELETED) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: InquiryRow): Prisma.InputJsonObject {
    return {
      id: item.id,
      reference: item.reference,
      status: item.status,
      handledAt: item.handledAt?.toISOString() ?? null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: InquiryRow): AdminInquiryModel {
    return {
      id: item.id,
      reference: item.reference,
      name: item.name,
      email: item.email,
      company: item.company,
      projectType: item.projectType,
      budget: item.budget,
      message: item.message,
      source: item.source,
      projectKey: item.projectKey,
      status: item.status,
      handledAt: item.handledAt?.toISOString() ?? null,
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

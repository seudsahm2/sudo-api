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
  AdminSiteConfigListQueryDto,
  AdminSiteConfigSortBy,
  AdminSiteConfigStatusFilter,
  AdminSortOrder,
} from './dto/admin-site-config-list-query.dto';
import { CreateAdminSiteConfigDto } from './dto/create-admin-site-config.dto';
import { UpdateAdminSiteConfigDto } from './dto/update-admin-site-config.dto';
import {
  AdminSiteConfigBulkAction,
  AdminSiteConfigBulkDto,
} from './dto/admin-site-config-bulk.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminSiteConfigModel {
  id: string;
  name: string;
  shortName: string;
  descriptor: string;
  defaultTitle: string;
  description: string;
  contactEmail: string;
  responseWindow: string;
  statusLabel: string;
  intakeMode: string;
  heroHeadline: string;
  positionTitle: string;
  positionBody: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSiteConfigListResponse {
  items: AdminSiteConfigModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminSiteConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'site_config',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'name', type: 'string', required: true, maxLength: 120 },
        { key: 'shortName', type: 'string', required: true, maxLength: 40 },
        { key: 'descriptor', type: 'string', required: true, maxLength: 120 },
        { key: 'defaultTitle', type: 'string', required: true, maxLength: 220 },
        { key: 'description', type: 'string', required: true, maxLength: 500 },
        { key: 'contactEmail', type: 'string', required: true, maxLength: 254 },
        {
          key: 'responseWindow',
          type: 'string',
          required: true,
          maxLength: 120,
        },
        { key: 'statusLabel', type: 'string', required: true, maxLength: 120 },
        { key: 'intakeMode', type: 'string', required: true, maxLength: 400 },
        { key: 'heroHeadline', type: 'string', required: true, maxLength: 120 },
        {
          key: 'positionTitle',
          type: 'string',
          required: true,
          maxLength: 200,
        },
        {
          key: 'positionBody',
          type: 'string',
          required: false,
          maxLength: 600,
        },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminSiteConfigSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminSiteConfigStatusFilter),
      },
      bulkActions: Object.values(AdminSiteConfigBulkAction),
    };
  }

  async list(
    query: AdminSiteConfigListQueryDto,
  ): Promise<AdminSiteConfigListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminSiteConfigSortBy.CREATED_AT]:
        query.sortOrder ?? AdminSortOrder.DESC,
    } as Prisma.SiteConfigOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.siteConfig.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.siteConfig.count({ where }),
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

  async getById(id: string): Promise<AdminSiteConfigModel> {
    const item = await this.prisma.siteConfig.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Site config not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminSiteConfigDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminSiteConfigModel> {
    const created = await this.prisma.siteConfig.create({ data: dto });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.site_config.create',
      resource: 'site_config',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/site-configs',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminSiteConfigDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminSiteConfigModel> {
    const existing = await this.prisma.siteConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    this.assertOptimisticConcurrency(existing.updatedAt, dto.expectedUpdatedAt);

    const updated = await this.prisma.siteConfig.update({
      where: { id },
      data: {
        name: dto.name,
        shortName: dto.shortName,
        descriptor: dto.descriptor,
        defaultTitle: dto.defaultTitle,
        description: dto.description,
        contactEmail: dto.contactEmail,
        responseWindow: dto.responseWindow,
        statusLabel: dto.statusLabel,
        intakeMode: dto.intakeMode,
        heroHeadline: dto.heroHeadline,
        positionTitle: dto.positionTitle,
        positionBody: dto.positionBody,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.site_config.update',
      resource: 'site_config',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/site-configs/${id}`,
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
    const existing = await this.prisma.siteConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Site config is already deleted');
    }

    const deleted = await this.prisma.siteConfig.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.site_config.delete',
      resource: 'site_config',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/site-configs/${id}`,
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
  ): Promise<AdminSiteConfigModel> {
    const existing = await this.prisma.siteConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Site config is not deleted');
    }

    const restored = await this.prisma.siteConfig.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.site_config.restore',
      resource: 'site_config',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/site-configs/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminSiteConfigBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminSiteConfigBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.SiteConfigUpdateManyMutationInput =
      dto.action === AdminSiteConfigBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.SiteConfigWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminSiteConfigBulkAction.DELETE ? null : { not: null },
    };

    const result = await this.prisma.siteConfig.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.site_config.bulk.${dto.action}`,
      resource: 'site_config',
      method: 'POST',
      path: '/api/admin/site-configs/bulk',
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
      return;
    }

    if (actualUpdatedAt.toISOString() !== expectedUpdatedAt) {
      throw new ConflictException(
        'This record has changed since you opened it. Refresh and retry your edit.',
      );
    }
  }
  private buildWhere(
    query: AdminSiteConfigListQueryDto,
  ): Prisma.SiteConfigWhereInput {
    const where: Prisma.SiteConfigWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { shortName: { contains: query.search, mode: 'insensitive' } },
        { descriptor: { contains: query.search, mode: 'insensitive' } },
        { defaultTitle: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { contactEmail: { contains: query.search, mode: 'insensitive' } },
        { responseWindow: { contains: query.search, mode: 'insensitive' } },
        { statusLabel: { contains: query.search, mode: 'insensitive' } },
        { intakeMode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (
      (query.status ?? AdminSiteConfigStatusFilter.ACTIVE) ===
      AdminSiteConfigStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminSiteConfigStatusFilter.ACTIVE) ===
      AdminSiteConfigStatusFilter.DELETED
    ) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: {
    id: string;
    name: string;
    shortName: string;
    descriptor: string;
    defaultTitle: string;
    description: string;
    contactEmail: string;
    responseWindow: string;
    statusLabel: string;
    intakeMode: string;
    heroHeadline: string;
    positionTitle: string;
    positionBody: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Prisma.InputJsonObject {
    return {
      id: item.id,
      name: item.name,
      shortName: item.shortName,
      descriptor: item.descriptor,
      defaultTitle: item.defaultTitle,
      description: item.description,
      contactEmail: item.contactEmail,
      responseWindow: item.responseWindow,
      statusLabel: item.statusLabel,
      intakeMode: item.intakeMode,
      heroHeadline: item.heroHeadline,
      positionTitle: item.positionTitle,
      positionBody: item.positionBody,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: {
    id: string;
    name: string;
    shortName: string;
    descriptor: string;
    defaultTitle: string;
    description: string;
    contactEmail: string;
    responseWindow: string;
    statusLabel: string;
    intakeMode: string;
    heroHeadline: string;
    positionTitle: string;
    positionBody: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AdminSiteConfigModel {
    return {
      id: item.id,
      name: item.name,
      shortName: item.shortName,
      descriptor: item.descriptor,
      defaultTitle: item.defaultTitle,
      description: item.description,
      contactEmail: item.contactEmail,
      responseWindow: item.responseWindow,
      statusLabel: item.statusLabel,
      intakeMode: item.intakeMode,
      heroHeadline: item.heroHeadline,
      positionTitle: item.positionTitle,
      positionBody: item.positionBody,
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

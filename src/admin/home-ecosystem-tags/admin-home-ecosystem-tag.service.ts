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
  AdminHomeEcosystemTagListQueryDto,
  AdminHomeEcosystemTagSortBy,
  AdminHomeEcosystemTagStatusFilter,
  AdminSortOrder,
} from './dto/admin-home-ecosystem-tag-list-query.dto';
import { CreateAdminHomeEcosystemTagDto } from './dto/create-admin-home-ecosystem-tag.dto';
import { UpdateAdminHomeEcosystemTagDto } from './dto/update-admin-home-ecosystem-tag.dto';
import {
  AdminHomeEcosystemTagBulkAction,
  AdminHomeEcosystemTagBulkDto,
} from './dto/admin-home-ecosystem-tag-bulk.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminHomeEcosystemTagModel {
  id: string;
  position: number;
  tag: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminHomeEcosystemTagListResponse {
  items: AdminHomeEcosystemTagModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminHomeEcosystemTagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'home_ecosystem_tag',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'position', type: 'number', required: true },
        { key: 'tag', type: 'string', required: true, maxLength: 120 },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminHomeEcosystemTagSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminHomeEcosystemTagStatusFilter),
      },
      bulkActions: Object.values(AdminHomeEcosystemTagBulkAction),
    };
  }

  async list(
    query: AdminHomeEcosystemTagListQueryDto,
  ): Promise<AdminHomeEcosystemTagListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminHomeEcosystemTagSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.HomeEcosystemTagOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.homeEcosystemTag.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.homeEcosystemTag.count({ where }),
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

  async getById(id: string): Promise<AdminHomeEcosystemTagModel> {
    const item = await this.prisma.homeEcosystemTag.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Home ecosystem tag not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminHomeEcosystemTagDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminHomeEcosystemTagModel> {
    const created = await this.prisma.homeEcosystemTag.create({
      data: {
        position: dto.position,
        tag: dto.tag,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.home_ecosystem_tag.create',
      resource: 'home_ecosystem_tag',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/home-ecosystem-tags',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminHomeEcosystemTagDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminHomeEcosystemTagModel> {
    const existing = await this.prisma.homeEcosystemTag.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Home ecosystem tag not found');
    }

    const updated = await this.prisma.homeEcosystemTag.update({
      where: { id },
      data: {
        position: dto.position,
        tag: dto.tag,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.home_ecosystem_tag.update',
      resource: 'home_ecosystem_tag',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/home-ecosystem-tags/${id}`,
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
    const existing = await this.prisma.homeEcosystemTag.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Home ecosystem tag not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Home ecosystem tag is already deleted');
    }

    const deleted = await this.prisma.homeEcosystemTag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.home_ecosystem_tag.delete',
      resource: 'home_ecosystem_tag',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/home-ecosystem-tags/${id}`,
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
  ): Promise<AdminHomeEcosystemTagModel> {
    const existing = await this.prisma.homeEcosystemTag.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Home ecosystem tag not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Home ecosystem tag is not deleted');
    }

    const restored = await this.prisma.homeEcosystemTag.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.home_ecosystem_tag.restore',
      resource: 'home_ecosystem_tag',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/home-ecosystem-tags/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminHomeEcosystemTagBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminHomeEcosystemTagBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.HomeEcosystemTagUpdateManyMutationInput =
      dto.action === AdminHomeEcosystemTagBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.HomeEcosystemTagWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminHomeEcosystemTagBulkAction.DELETE
          ? null
          : { not: null },
    };

    const result = await this.prisma.homeEcosystemTag.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.home_ecosystem_tag.bulk.${dto.action}`,
      resource: 'home_ecosystem_tag',
      method: 'POST',
      path: '/api/admin/home-ecosystem-tags/bulk',
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
    query: AdminHomeEcosystemTagListQueryDto,
  ): Prisma.HomeEcosystemTagWhereInput {
    const where: Prisma.HomeEcosystemTagWhereInput = {};

    if (query.search) {
      where.OR = [{ tag: { contains: query.search, mode: 'insensitive' } }];
    }

    if (
      (query.status ?? AdminHomeEcosystemTagStatusFilter.ACTIVE) ===
      AdminHomeEcosystemTagStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminHomeEcosystemTagStatusFilter.ACTIVE) ===
      AdminHomeEcosystemTagStatusFilter.DELETED
    ) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: {
    id: string;
    position: number;
    tag: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Prisma.InputJsonObject {
    return {
      id: item.id,
      position: item.position,
      tag: item.tag,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: {
    id: string;
    position: number;
    tag: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AdminHomeEcosystemTagModel {
    return {
      id: item.id,
      position: item.position,
      tag: item.tag,
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

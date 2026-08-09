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
  AdminHomeManifestoListQueryDto,
  AdminHomeManifestoSortBy,
  AdminHomeManifestoStatusFilter,
  AdminSortOrder,
} from './dto/admin-home-manifesto-list-query.dto';
import { CreateAdminHomeManifestoDto } from './dto/create-admin-home-manifesto.dto';
import { UpdateAdminHomeManifestoDto } from './dto/update-admin-home-manifesto.dto';
import {
  AdminHomeManifestoBulkAction,
  AdminHomeManifestoBulkDto,
} from './dto/admin-home-manifesto-bulk.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminHomeManifestoModel {
  id: string;
  position: number;
  icon: string;
  kicker: string;
  title: string;
  copy: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminHomeManifestoListResponse {
  items: AdminHomeManifestoModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminHomeManifestoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'home_manifesto',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'position', type: 'number', required: true },
        { key: 'icon', type: 'string', required: true, maxLength: 80 },
        { key: 'kicker', type: 'string', required: true, maxLength: 120 },
        { key: 'title', type: 'string', required: true, maxLength: 180 },
        { key: 'copy', type: 'string', required: true, maxLength: 400 },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminHomeManifestoSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminHomeManifestoStatusFilter),
      },
      bulkActions: Object.values(AdminHomeManifestoBulkAction),
    };
  }

  async list(
    query: AdminHomeManifestoListQueryDto,
  ): Promise<AdminHomeManifestoListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminHomeManifestoSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.HomeManifestoOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.homeManifesto.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.homeManifesto.count({ where }),
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

  async getById(id: string): Promise<AdminHomeManifestoModel> {
    const item = await this.prisma.homeManifesto.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('Home manifesto item not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminHomeManifestoDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminHomeManifestoModel> {
    const created = await this.prisma.homeManifesto.create({
      data: {
        position: dto.position,
        icon: dto.icon,
        kicker: dto.kicker,
        title: dto.title,
        copy: dto.copy,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.home_manifesto.create',
      resource: 'home_manifesto',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/home-manifestos',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminHomeManifestoDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminHomeManifestoModel> {
    const existing = await this.prisma.homeManifesto.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    this.assertOptimisticConcurrency(existing.updatedAt, dto.expectedUpdatedAt);

    const updated = await this.prisma.homeManifesto.update({
      where: { id },
      data: {
        position: dto.position,
        icon: dto.icon,
        kicker: dto.kicker,
        title: dto.title,
        copy: dto.copy,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.home_manifesto.update',
      resource: 'home_manifesto',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/home-manifestos/${id}`,
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
    const existing = await this.prisma.homeManifesto.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Home manifesto item is already deleted');
    }

    const deleted = await this.prisma.homeManifesto.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.home_manifesto.delete',
      resource: 'home_manifesto',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/home-manifestos/${id}`,
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
  ): Promise<AdminHomeManifestoModel> {
    const existing = await this.prisma.homeManifesto.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Home manifesto item is not deleted');
    }

    const restored = await this.prisma.homeManifesto.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.home_manifesto.restore',
      resource: 'home_manifesto',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/home-manifestos/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminHomeManifestoBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminHomeManifestoBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.HomeManifestoUpdateManyMutationInput =
      dto.action === AdminHomeManifestoBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.HomeManifestoWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminHomeManifestoBulkAction.DELETE
          ? null
          : { not: null },
    };

    const result = await this.prisma.homeManifesto.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.home_manifesto.bulk.${dto.action}`,
      resource: 'home_manifesto',
      method: 'POST',
      path: '/api/admin/home-manifestos/bulk',
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
    query: AdminHomeManifestoListQueryDto,
  ): Prisma.HomeManifestoWhereInput {
    const where: Prisma.HomeManifestoWhereInput = {};

    if (query.search) {
      where.OR = [
        { icon: { contains: query.search, mode: 'insensitive' } },
        { kicker: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { copy: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (
      (query.status ?? AdminHomeManifestoStatusFilter.ACTIVE) ===
      AdminHomeManifestoStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminHomeManifestoStatusFilter.ACTIVE) ===
      AdminHomeManifestoStatusFilter.DELETED
    ) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: {
    id: string;
    position: number;
    icon: string;
    kicker: string;
    title: string;
    copy: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Prisma.InputJsonObject {
    return {
      id: item.id,
      position: item.position,
      icon: item.icon,
      kicker: item.kicker,
      title: item.title,
      copy: item.copy,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: {
    id: string;
    position: number;
    icon: string;
    kicker: string;
    title: string;
    copy: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AdminHomeManifestoModel {
    return {
      id: item.id,
      position: item.position,
      icon: item.icon,
      kicker: item.kicker,
      title: item.title,
      copy: item.copy,
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

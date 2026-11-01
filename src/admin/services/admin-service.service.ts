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
  AdminServiceListQueryDto,
  AdminServiceSortBy,
  AdminServiceStatusFilter,
  AdminSortOrder,
} from './dto/admin-service-list-query.dto';
import { CreateAdminServiceDto } from './dto/create-admin-service.dto';
import { UpdateAdminServiceDto } from './dto/update-admin-service.dto';
import {
  AdminServiceBulkAction,
  AdminServiceBulkDto,
} from './dto/admin-service-bulk.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

type ServiceWithRelations = Prisma.ServiceGetPayload<{
  include: {
    capabilities: {
      orderBy: { position: 'asc' };
    };
    stackItems: {
      orderBy: { position: 'asc' };
    };
    interconnects: {
      orderBy: { position: 'asc' };
    };
  };
}>;

export interface AdminServiceModel {
  id: string;
  position: number;
  icon: string;
  name: string;
  handle: string;
  summary: string;
  slug: string | null;
  tagline: string | null;
  imageUrl: string | null;
  deliverables: string[];
  timeline: string | null;
  startingFrom: string | null;
  capabilities: string[];
  stackItems: string[];
  interconnects: string[];
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminServiceListResponse {
  items: AdminServiceModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Absent leaves a field alone; empty clears it. */
function clearable(value?: string): string | null | undefined {
  if (value === undefined) return undefined;
  return value.trim() || null;
}

@Injectable()
export class AdminServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'service',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'position', type: 'number', required: true },
        { key: 'icon', type: 'string', required: true, maxLength: 80 },
        { key: 'name', type: 'string', required: true, maxLength: 160 },
        { key: 'handle', type: 'string', required: true, maxLength: 160 },
        { key: 'summary', type: 'string', required: true, maxLength: 500 },
        { key: 'slug', type: 'string', required: false, maxLength: 80 },
        { key: 'tagline', type: 'string', required: false, maxLength: 160 },
        { key: 'imageUrl', type: 'string', required: false, maxLength: 500 },
        { key: 'deliverables', type: 'string[]', required: false },
        { key: 'timeline', type: 'string', required: false, maxLength: 40 },
        { key: 'startingFrom', type: 'string', required: false, maxLength: 40 },
        { key: 'capabilities', type: 'string[]', required: true },
        { key: 'stackItems', type: 'string[]', required: true },
        { key: 'interconnects', type: 'string[]', required: true },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminServiceSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminServiceStatusFilter),
      },
      bulkActions: Object.values(AdminServiceBulkAction),
    };
  }

  async list(
    query: AdminServiceListQueryDto,
  ): Promise<AdminServiceListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminServiceSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.ServiceOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          capabilities: {
            orderBy: { position: 'asc' },
          },
          stackItems: {
            orderBy: { position: 'asc' },
          },
          interconnects: {
            orderBy: { position: 'asc' },
          },
        },
      }),
      this.prisma.service.count({ where }),
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

  async getById(id: string): Promise<AdminServiceModel> {
    const item = await this.prisma.service.findUnique({
      where: { id },
      include: {
        capabilities: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
        interconnects: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Service not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminServiceDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminServiceModel> {
    await this.assertSlugFree(dto.slug);

    const created = await this.prisma.service.create({
      data: {
        position: dto.position,
        icon: dto.icon,
        name: dto.name,
        handle: dto.handle,
        summary: dto.summary,
        slug: dto.slug?.trim() || null,
        tagline: dto.tagline?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        deliverables: (dto.deliverables ?? [])
          .map((entry) => entry.trim())
          .filter(Boolean),
        timeline: dto.timeline?.trim() || null,
        startingFrom: dto.startingFrom?.trim() || null,
        capabilities: {
          create: dto.capabilities.map((value, index) => ({
            position: index,
            value,
          })),
        },
        stackItems: {
          create: dto.stackItems.map((value, index) => ({
            position: index,
            value,
          })),
        },
        interconnects: {
          create: dto.interconnects.map((value, index) => ({
            position: index,
            value,
          })),
        },
      },
      include: {
        capabilities: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
        interconnects: {
          orderBy: { position: 'asc' },
        },
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.service.create',
      resource: 'service',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/services',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminServiceDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminServiceModel> {
    const existing = await this.prisma.service.findUnique({
      where: { id },
      include: {
        capabilities: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
        interconnects: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    this.assertOptimisticConcurrency(existing.updatedAt, dto.expectedUpdatedAt);
    await this.assertSlugFree(dto.slug, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const service = await tx.service.update({
        where: { id },
        data: {
          position: dto.position,
          icon: dto.icon,
          name: dto.name,
          handle: dto.handle,
          summary: dto.summary,
          slug: clearable(dto.slug),
          tagline: clearable(dto.tagline),
          imageUrl: clearable(dto.imageUrl),
          deliverables: dto.deliverables
            ?.map((entry) => entry.trim())
            .filter(Boolean),
          timeline: clearable(dto.timeline),
          startingFrom: clearable(dto.startingFrom),
        },
      });

      if (dto.capabilities) {
        await tx.serviceCapability.deleteMany({ where: { serviceId: id } });
        await tx.serviceCapability.createMany({
          data: dto.capabilities.map((value, index) => ({
            serviceId: id,
            position: index,
            value,
          })),
        });
      }

      if (dto.stackItems) {
        await tx.serviceStackItem.deleteMany({ where: { serviceId: id } });
        await tx.serviceStackItem.createMany({
          data: dto.stackItems.map((value, index) => ({
            serviceId: id,
            position: index,
            value,
          })),
        });
      }

      if (dto.interconnects) {
        await tx.serviceInterconnect.deleteMany({ where: { serviceId: id } });
        await tx.serviceInterconnect.createMany({
          data: dto.interconnects.map((value, index) => ({
            serviceId: id,
            position: index,
            value,
          })),
        });
      }

      return tx.service.findUniqueOrThrow({
        where: { id: service.id },
        include: {
          capabilities: {
            orderBy: { position: 'asc' },
          },
          stackItems: {
            orderBy: { position: 'asc' },
          },
          interconnects: {
            orderBy: { position: 'asc' },
          },
        },
      });
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.service.update',
      resource: 'service',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/services/${id}`,
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
    const existing = await this.prisma.service.findUnique({
      where: { id },
      include: {
        capabilities: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
        interconnects: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Service is already deleted');
    }

    const deleted = await this.prisma.service.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        capabilities: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
        interconnects: {
          orderBy: { position: 'asc' },
        },
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.service.delete',
      resource: 'service',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/services/${id}`,
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
  ): Promise<AdminServiceModel> {
    const existing = await this.prisma.service.findUnique({
      where: { id },
      include: {
        capabilities: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
        interconnects: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Service is not deleted');
    }

    const restored = await this.prisma.service.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        capabilities: {
          orderBy: { position: 'asc' },
        },
        stackItems: {
          orderBy: { position: 'asc' },
        },
        interconnects: {
          orderBy: { position: 'asc' },
        },
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.service.restore',
      resource: 'service',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/services/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminServiceBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminServiceBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.ServiceUpdateManyMutationInput =
      dto.action === AdminServiceBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.ServiceWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminServiceBulkAction.DELETE ? null : { not: null },
    };

    const result = await this.prisma.service.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.service.bulk.${dto.action}`,
      resource: 'service',
      method: 'POST',
      path: '/api/admin/services/bulk',
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
    query: AdminServiceListQueryDto,
  ): Prisma.ServiceWhereInput {
    const where: Prisma.ServiceWhereInput = {};

    if (query.search) {
      where.OR = [
        { icon: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { handle: { contains: query.search, mode: 'insensitive' } },
        { summary: { contains: query.search, mode: 'insensitive' } },
        {
          capabilities: {
            some: {
              value: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
        {
          stackItems: {
            some: {
              value: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
        {
          interconnects: {
            some: {
              value: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    if (
      (query.status ?? AdminServiceStatusFilter.ACTIVE) ===
      AdminServiceStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminServiceStatusFilter.ACTIVE) ===
      AdminServiceStatusFilter.DELETED
    ) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: ServiceWithRelations): Prisma.InputJsonObject {
    return {
      id: item.id,
      position: item.position,
      icon: item.icon,
      name: item.name,
      handle: item.handle,
      summary: item.summary,
      slug: item.slug,
      tagline: item.tagline,
      imageUrl: item.imageUrl,
      deliverables: item.deliverables,
      timeline: item.timeline,
      startingFrom: item.startingFrom,
      capabilities: item.capabilities.map((row) => row.value),
      stackItems: item.stackItems.map((row) => row.value),
      interconnects: item.interconnects.map((row) => row.value),
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: ServiceWithRelations): AdminServiceModel {
    return {
      id: item.id,
      position: item.position,
      icon: item.icon,
      name: item.name,
      handle: item.handle,
      summary: item.summary,
      slug: item.slug,
      tagline: item.tagline,
      imageUrl: item.imageUrl,
      deliverables: item.deliverables,
      timeline: item.timeline,
      startingFrom: item.startingFrom,
      capabilities: item.capabilities.map((row) => row.value),
      stackItems: item.stackItems.map((row) => row.value),
      interconnects: item.interconnects.map((row) => row.value),
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  /**
   * Two services cannot share a landing page address. Checked here rather than
   * by a unique index, which could not be added to the live table without a
   * data-loss prompt.
   */
  private async assertSlugFree(slug?: string, exceptId?: string) {
    const value = slug?.trim();
    if (!value) return;
    const clash = await this.prisma.service.findFirst({
      where: {
        slug: value,
        deletedAt: null,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { name: true },
    });
    if (clash) {
      throw new ConflictException(
        `${clash.name} already uses the address /services/${value}.`,
      );
    }
  }
}

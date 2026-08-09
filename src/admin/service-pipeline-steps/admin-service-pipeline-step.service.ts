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
  AdminServicePipelineStepListQueryDto,
  AdminServicePipelineStepSortBy,
  AdminServicePipelineStepStatusFilter,
  AdminSortOrder,
} from './dto/admin-service-pipeline-step-list-query.dto';
import { CreateAdminServicePipelineStepDto } from './dto/create-admin-service-pipeline-step.dto';
import { UpdateAdminServicePipelineStepDto } from './dto/update-admin-service-pipeline-step.dto';
import {
  AdminServicePipelineStepBulkAction,
  AdminServicePipelineStepBulkDto,
} from './dto/admin-service-pipeline-step-bulk.dto';

interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AdminServicePipelineStepModel {
  id: string;
  position: number;
  icon: string;
  label: string;
  step: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminServicePipelineStepListResponse {
  items: AdminServicePipelineStepModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminServicePipelineStepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  getMetadata() {
    return {
      entity: 'service_pipeline_step',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'position', type: 'number', required: true },
        { key: 'icon', type: 'string', required: true, maxLength: 80 },
        { key: 'label', type: 'string', required: true, maxLength: 120 },
        { key: 'step', type: 'string', required: true, maxLength: 20 },
        { key: 'deletedAt', type: 'datetime', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
        { key: 'updatedAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminServicePipelineStepSortBy),
        orders: Object.values(AdminSortOrder),
      },
      filters: {
        status: Object.values(AdminServicePipelineStepStatusFilter),
      },
      bulkActions: Object.values(AdminServicePipelineStepBulkAction),
    };
  }

  async list(
    query: AdminServicePipelineStepListQueryDto,
  ): Promise<AdminServicePipelineStepListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);
    const orderBy = {
      [query.sortBy ?? AdminServicePipelineStepSortBy.POSITION]:
        query.sortOrder ?? AdminSortOrder.ASC,
    } as Prisma.ServicePipelineStepOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.servicePipelineStep.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.servicePipelineStep.count({ where }),
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

  async getById(id: string): Promise<AdminServicePipelineStepModel> {
    const item = await this.prisma.servicePipelineStep.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Service pipeline step not found');
    }

    return this.toModel(item);
  }

  async create(
    dto: CreateAdminServicePipelineStepDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminServicePipelineStepModel> {
    const created = await this.prisma.servicePipelineStep.create({
      data: {
        position: dto.position,
        icon: dto.icon,
        label: dto.label,
        step: dto.step,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.service_pipeline_step.create',
      resource: 'service_pipeline_step',
      resourceId: created.id,
      method: 'POST',
      path: '/api/admin/service-pipeline-steps',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    dto: UpdateAdminServicePipelineStepDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<AdminServicePipelineStepModel> {
    const existing = await this.prisma.servicePipelineStep.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    this.assertOptimisticConcurrency(existing.updatedAt, dto.expectedUpdatedAt);

    const updated = await this.prisma.servicePipelineStep.update({
      where: { id },
      data: {
        position: dto.position,
        icon: dto.icon,
        label: dto.label,
        step: dto.step,
      },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.service_pipeline_step.update',
      resource: 'service_pipeline_step',
      resourceId: updated.id,
      method: 'PATCH',
      path: `/api/admin/service-pipeline-steps/${id}`,
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
    const existing = await this.prisma.servicePipelineStep.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Service pipeline step is already deleted');
    }

    const deleted = await this.prisma.servicePipelineStep.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.service_pipeline_step.delete',
      resource: 'service_pipeline_step',
      resourceId: deleted.id,
      method: 'DELETE',
      path: `/api/admin/service-pipeline-steps/${id}`,
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
  ): Promise<AdminServicePipelineStepModel> {
    const existing = await this.prisma.servicePipelineStep.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    if (!existing.deletedAt) {
      throw new BadRequestException('Service pipeline step is not deleted');
    }

    const restored = await this.prisma.servicePipelineStep.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.service_pipeline_step.restore',
      resource: 'service_pipeline_step',
      resourceId: restored.id,
      method: 'POST',
      path: `/api/admin/service-pipeline-steps/${id}/restore`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    dto: AdminServicePipelineStepBulkDto,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ): Promise<{
    action: AdminServicePipelineStepBulkAction;
    count: number;
    ids: string[];
  }> {
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one id is required');
    }

    const updateData: Prisma.ServicePipelineStepUpdateManyMutationInput =
      dto.action === AdminServicePipelineStepBulkAction.DELETE
        ? { deletedAt: new Date() }
        : { deletedAt: null };

    const where: Prisma.ServicePipelineStepWhereInput = {
      id: { in: uniqueIds },
      deletedAt:
        dto.action === AdminServicePipelineStepBulkAction.DELETE
          ? null
          : { not: null },
    };

    const result = await this.prisma.servicePipelineStep.updateMany({
      where,
      data: updateData,
    });

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.service_pipeline_step.bulk.${dto.action}`,
      resource: 'service_pipeline_step',
      method: 'POST',
      path: '/api/admin/service-pipeline-steps/bulk',
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
    query: AdminServicePipelineStepListQueryDto,
  ): Prisma.ServicePipelineStepWhereInput {
    const where: Prisma.ServicePipelineStepWhereInput = {};

    if (query.search) {
      where.OR = [
        { icon: { contains: query.search, mode: 'insensitive' } },
        { label: { contains: query.search, mode: 'insensitive' } },
        { step: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (
      (query.status ?? AdminServicePipelineStepStatusFilter.ACTIVE) ===
      AdminServicePipelineStepStatusFilter.ACTIVE
    ) {
      where.deletedAt = null;
    } else if (
      (query.status ?? AdminServicePipelineStepStatusFilter.ACTIVE) ===
      AdminServicePipelineStepStatusFilter.DELETED
    ) {
      where.deletedAt = { not: null };
    }

    return where;
  }

  private toSnapshot(item: {
    id: string;
    position: number;
    icon: string;
    label: string;
    step: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Prisma.InputJsonObject {
    return {
      id: item.id,
      position: item.position,
      icon: item.icon,
      label: item.label,
      step: item.step,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    } as Prisma.InputJsonObject;
  }

  private toModel(item: {
    id: string;
    position: number;
    icon: string;
    label: string;
    step: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AdminServicePipelineStepModel {
    return {
      id: item.id,
      position: item.position,
      icon: item.icon,
      label: item.label,
      step: item.step,
      isDeleted: item.deletedAt !== null,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminAuditListQueryDto,
  AdminAuditSortBy,
  AdminAuditSortOrder,
} from './dto/admin-audit-list-query.dto';

export interface AdminAuditLogModel {
  id: string;
  actorAdminUserId: string | null;
  actorEmail: string | null;
  actorDisplayName: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  method: string | null;
  path: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  before: Prisma.JsonValue | null;
  after: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  sessionId: string | null;
  createdAt: string;
}

export interface AdminAuditLogListResponse {
  items: AdminAuditLogModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetadata() {
    const [actions, resources] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      }),
      this.prisma.adminAuditLog.findMany({
        distinct: ['resource'],
        select: { resource: true },
        orderBy: { resource: 'asc' },
      }),
    ]);

    return {
      entity: 'admin_audit_logs',
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        { key: 'actorEmail', type: 'string', readOnly: true },
        { key: 'action', type: 'string', readOnly: true },
        { key: 'resource', type: 'string', readOnly: true },
        { key: 'resourceId', type: 'string', readOnly: true },
        { key: 'method', type: 'string', readOnly: true },
        { key: 'path', type: 'string', readOnly: true },
        { key: 'ipAddress', type: 'string', readOnly: true },
        { key: 'createdAt', type: 'datetime', readOnly: true },
      ],
      sort: {
        fields: Object.values(AdminAuditSortBy),
        orders: Object.values(AdminAuditSortOrder),
      },
      filters: {
        action: actions.map((item) => item.action),
        resource: resources.map((item) => item.resource),
      },
      bulkActions: [],
    };
  }

  async list(
    query: AdminAuditListQueryDto,
  ): Promise<AdminAuditLogListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.AdminAuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.resource ? { resource: query.resource } : {}),
      ...(query.search
        ? {
            OR: [
              { actorEmail: { contains: query.search, mode: 'insensitive' } },
              { action: { contains: query.search, mode: 'insensitive' } },
              { resource: { contains: query.search, mode: 'insensitive' } },
              { resourceId: { contains: query.search, mode: 'insensitive' } },
              { path: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.AdminAuditLogOrderByWithRelationInput = {
      [query.sortBy ?? AdminAuditSortBy.CREATED_AT]:
        query.sortOrder ?? AdminAuditSortOrder.DESC,
    };

    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy,
        include: {
          actorAdminUser: {
            select: {
              displayName: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        actorAdminUserId: item.actorAdminUserId,
        actorEmail: item.actorEmail,
        actorDisplayName: item.actorAdminUser?.displayName ?? null,
        action: item.action,
        resource: item.resource,
        resourceId: item.resourceId,
        method: item.method,
        path: item.path,
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        requestId: item.requestId,
        before: item.before,
        after: item.after,
        metadata: item.metadata,
        sessionId: item.sessionId,
        createdAt: item.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }
}

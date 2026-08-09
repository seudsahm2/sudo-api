import { Injectable } from '@nestjs/common';
import { Prisma, AdminAuditLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminAuditEventInput {
  actorAdminUserId?: string;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method?: string;
  path?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(event: AdminAuditEventInput): Promise<AdminAuditLog> {
    return this.prisma.adminAuditLog.create({
      data: {
        actorAdminUserId: event.actorAdminUserId ?? null,
        actorEmail: event.actorEmail ?? null,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId ?? null,
        method: event.method ?? null,
        path: event.path ?? null,
        requestId: event.requestId ?? null,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
        before: event.before ?? undefined,
        after: event.after ?? undefined,
        metadata: event.metadata ?? undefined,
      },
    });
  }
}

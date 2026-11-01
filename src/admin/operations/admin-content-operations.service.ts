import { BadRequestException, Injectable } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import type { AdminPrincipal } from '../interfaces/admin-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ContentSnapshot,
  countRows,
  restoreSnapshot,
  takeSnapshot,
} from '../../content/content-snapshot';

export const RESTORE_CONTENT_CONFIRM_TOKEN = 'RESTORE_CONTENT';

export type AdminContentBackupDocument = ContentSnapshot;

export interface AdminContentBackupResponse {
  filename: string;
  backup: AdminContentBackupDocument;
  tableCounts: Record<string, number>;
}

export interface AdminContentRestoreResponse {
  restoredAt: string;
  sourceGeneratedAt: string;
  tableCounts: Record<string, number>;
  /** Tables the file did not contain, which were left exactly as they were. */
  keptTables: string[];
  /**
   * Everything as it was a moment before the restore, so the admin can offer
   * it as a download — the undo for a restore made from the wrong file.
   */
  previousBackup: AdminContentBackupDocument;
}

interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * The admin's export and restore buttons. The work itself is in
 * content/content-snapshot.ts, shared with the command-line scripts.
 */
@Injectable()
export class AdminContentOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  async createBackup(
    admin: AdminPrincipal,
    context?: AuditContext,
  ): Promise<AdminContentBackupResponse> {
    const backup = await takeSnapshot(this.prisma);
    const tableCounts = countRows(backup);
    const filename = `content-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    await this.auditService.record({
      actorAdminUserId: admin.id,
      actorEmail: admin.email,
      action: 'content.backup.export',
      resource: 'content_backup',
      method: 'GET',
      path: '/api/admin/operations/content-backup',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      metadata: {
        generatedAt: backup.generatedAt,
        tableCounts,
        filename,
      },
    });

    return {
      filename,
      backup,
      tableCounts,
    };
  }

  async restoreBackup(
    payload: { confirmToken: string; backupJson: string },
    admin: AdminPrincipal,
    context?: AuditContext,
  ): Promise<AdminContentRestoreResponse> {
    if (payload.confirmToken !== RESTORE_CONTENT_CONFIRM_TOKEN) {
      throw new BadRequestException(
        `Invalid confirmation token. Use ${RESTORE_CONTENT_CONFIRM_TOKEN}.`,
      );
    }

    const backup = this.parseBackupDocument(payload.backupJson);
    const previous = await takeSnapshot(this.prisma);
    const summary = await restoreSnapshot(this.prisma, backup, previous);

    await this.auditService.record({
      actorAdminUserId: admin.id,
      actorEmail: admin.email,
      action: 'content.backup.restore',
      resource: 'content_backup',
      method: 'POST',
      path: '/api/admin/operations/content-restore',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      metadata: {
        sourceGeneratedAt: backup.generatedAt,
        tableCounts: summary.tableCounts,
        replaced: summary.replaced,
        kept: summary.kept,
      },
    });

    return {
      restoredAt: new Date().toISOString(),
      sourceGeneratedAt: backup.generatedAt,
      tableCounts: summary.tableCounts,
      keptTables: summary.kept,
      previousBackup: previous,
    };
  }

  private parseBackupDocument(rawBackupJson: string): ContentSnapshot {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBackupJson);
    } catch {
      throw new BadRequestException('Invalid backup JSON payload');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new BadRequestException('Invalid backup document payload');
    }

    const parsedRecord = parsed as {
      version?: unknown;
      generatedAt?: unknown;
      tables?: unknown;
    };

    if (
      !parsedRecord.generatedAt ||
      typeof parsedRecord.generatedAt !== 'string'
    ) {
      throw new BadRequestException(
        'Invalid backup document: missing generatedAt',
      );
    }

    if (!parsedRecord.tables || typeof parsedRecord.tables !== 'object') {
      throw new BadRequestException(
        'Invalid backup document: missing tables object',
      );
    }

    return {
      version:
        typeof parsedRecord.version === 'number' ? parsedRecord.version : 1,
      generatedAt: parsedRecord.generatedAt,
      tables: parsedRecord.tables as ContentSnapshot['tables'],
    };
  }
}

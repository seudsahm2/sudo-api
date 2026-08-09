import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminAuditService } from '../admin-audit.service';
import type { AdminPrincipal } from '../interfaces/admin-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';

export const RESTORE_CONTENT_CONFIRM_TOKEN = 'RESTORE_CONTENT';

interface BackupTableRecord {
  id: string;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AdminContentBackupDocument {
  generatedAt: string;
  tables: Record<string, BackupTableRecord[]>;
}

export interface AdminContentBackupResponse {
  filename: string;
  backup: AdminContentBackupDocument;
  tableCounts: Record<string, number>;
}

export interface AdminContentRestoreResponse {
  restoredAt: string;
  sourceGeneratedAt: string;
  tableCounts: Record<string, number>;
}

interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

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
    const backup = await this.buildBackupDocument();
    const tableCounts = this.countTables(backup);
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
    const tableCounts = this.countTables(backup);

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceInterconnect.deleteMany();
      await tx.serviceStackItem.deleteMany();
      await tx.serviceCapability.deleteMany();
      await tx.workProjectDiscipline.deleteMany();
      await tx.service.deleteMany();
      await tx.workProject.deleteMany();
      await tx.homeManifesto.deleteMany();
      await tx.homeEcosystemTag.deleteMany();
      await tx.homeStat.deleteMany();
      await tx.servicePipelineStep.deleteMany();
      await tx.workFilter.deleteMany();
      await tx.labPrinciple.deleteMany();
      await tx.labMatrixRow.deleteMany();
      await tx.labSpec.deleteMany();
      await tx.primaryNavigation.deleteMany();
      await tx.inquiryProjectType.deleteMany();
      await tx.inquiryBudgetRange.deleteMany();
      await tx.siteConfig.deleteMany();

      const tables = backup.tables;

      await tx.siteConfig.createMany({
        data: this.mapRecords<Prisma.SiteConfigCreateManyInput>(
          tables.siteConfig ?? [],
          [
            'name',
            'shortName',
            'descriptor',
            'defaultTitle',
            'description',
            'contactEmail',
            'responseWindow',
            'statusLabel',
            'intakeMode',
            'heroHeadline',
            'positionTitle',
            'positionBody',
            'deletedAt',
          ],
        ),
      });

      await tx.primaryNavigation.createMany({
        data: this.mapRecords<Prisma.PrimaryNavigationCreateManyInput>(
          tables.primaryNavigation ?? [],
          ['position', 'to', 'label', 'deletedAt'],
        ),
      });

      await tx.inquiryProjectType.createMany({
        data: this.mapRecords<Prisma.InquiryProjectTypeCreateManyInput>(
          tables.inquiryProjectType ?? [],
          ['position', 'value', 'label', 'deletedAt'],
        ),
      });

      await tx.inquiryBudgetRange.createMany({
        data: this.mapRecords<Prisma.InquiryBudgetRangeCreateManyInput>(
          tables.inquiryBudgetRange ?? [],
          ['position', 'value', 'label', 'deletedAt'],
        ),
      });

      await tx.homeManifesto.createMany({
        data: this.mapRecords<Prisma.HomeManifestoCreateManyInput>(
          tables.homeManifesto ?? [],
          ['position', 'icon', 'kicker', 'title', 'copy', 'deletedAt'],
        ),
      });

      await tx.homeEcosystemTag.createMany({
        data: this.mapRecords<Prisma.HomeEcosystemTagCreateManyInput>(
          tables.homeEcosystemTag ?? [],
          ['position', 'tag', 'deletedAt'],
        ),
      });

      await tx.homeStat.createMany({
        data: this.mapRecords<Prisma.HomeStatCreateManyInput>(
          tables.homeStat ?? [],
          ['position', 'label', 'value', 'suffix', 'deletedAt'],
        ),
      });

      await tx.service.createMany({
        data: this.mapRecords<Prisma.ServiceCreateManyInput>(
          tables.service ?? [],
          ['position', 'icon', 'name', 'handle', 'summary', 'deletedAt'],
        ),
      });

      await tx.serviceCapability.createMany({
        data: this.mapRecords<Prisma.ServiceCapabilityCreateManyInput>(
          tables.serviceCapability ?? [],
          ['serviceId', 'position', 'value'],
        ),
      });

      await tx.serviceStackItem.createMany({
        data: this.mapRecords<Prisma.ServiceStackItemCreateManyInput>(
          tables.serviceStackItem ?? [],
          ['serviceId', 'position', 'value'],
        ),
      });

      await tx.serviceInterconnect.createMany({
        data: this.mapRecords<Prisma.ServiceInterconnectCreateManyInput>(
          tables.serviceInterconnect ?? [],
          ['serviceId', 'position', 'value'],
        ),
      });

      await tx.servicePipelineStep.createMany({
        data: this.mapRecords<Prisma.ServicePipelineStepCreateManyInput>(
          tables.servicePipelineStep ?? [],
          ['position', 'icon', 'label', 'step', 'deletedAt'],
        ),
      });

      await tx.workFilter.createMany({
        data: this.mapRecords<Prisma.WorkFilterCreateManyInput>(
          tables.workFilter ?? [],
          ['position', 'value', 'deletedAt'],
        ),
      });

      await tx.workProject.createMany({
        data: this.mapRecords<Prisma.WorkProjectCreateManyInput>(
          tables.workProject ?? [],
          [
            'position',
            'projectKey',
            'title',
            'client',
            'year',
            'summary',
            'coverImageUrl',
            'challenge',
            'approach',
            'outcome',
            'featured',
            'featuredPosition',
            'deletedAt',
          ],
        ),
      });

      await tx.workProjectDiscipline.createMany({
        data: this.mapRecords<Prisma.WorkProjectDisciplineCreateManyInput>(
          tables.workProjectDiscipline ?? [],
          ['projectId', 'position', 'value'],
        ),
      });

      await tx.labPrinciple.createMany({
        data: this.mapRecords<Prisma.LabPrincipleCreateManyInput>(
          tables.labPrinciple ?? [],
          ['position', 'icon', 'name', 'desc', 'deletedAt'],
        ),
      });

      await tx.labMatrixRow.createMany({
        data: this.mapRecords<Prisma.LabMatrixRowCreateManyInput>(
          tables.labMatrixRow ?? [],
          ['position', 'label', 'value', 'deletedAt'],
        ),
      });

      await tx.labSpec.createMany({
        data: this.mapRecords<Prisma.LabSpecCreateManyInput>(
          tables.labSpec ?? [],
          ['position', 'label', 'value', 'deletedAt'],
        ),
      });
    });

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
        tableCounts,
      },
    });

    return {
      restoredAt: new Date().toISOString(),
      sourceGeneratedAt: backup.generatedAt,
      tableCounts,
    };
  }

  private parseBackupDocument(
    rawBackupJson: string,
  ): AdminContentBackupDocument {
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
      generatedAt: parsedRecord.generatedAt,
      tables: parsedRecord.tables as Record<string, BackupTableRecord[]>,
    };
  }

  private countTables(document: AdminContentBackupDocument) {
    const counts: Record<string, number> = {};

    for (const [tableName, records] of Object.entries(document.tables)) {
      counts[tableName] = Array.isArray(records) ? records.length : 0;
    }

    return counts;
  }

  private mapRecords<T extends object>(
    records: BackupTableRecord[],
    fields: string[],
  ) {
    return records.map((record) => this.mapRecord(record, fields)) as T[];
  }

  private mapRecord<T extends BackupTableRecord>(record: T, fields: string[]) {
    const mapped: Record<string, unknown> = { id: record.id };

    for (const field of fields) {
      if (record[field] !== undefined) {
        mapped[field] = record[field];
      }
    }

    if ('deletedAt' in record) {
      mapped.deletedAt = this.toDate(record.deletedAt);
    }

    return mapped;
  }

  private toDate(value: unknown): Date | null {
    if (typeof value !== 'string' || value.length === 0) {
      return null;
    }

    return new Date(value);
  }

  private serializeDate(value: Date | null | undefined) {
    return value ? value.toISOString() : null;
  }

  private async buildBackupDocument(): Promise<AdminContentBackupDocument> {
    const [
      siteConfig,
      primaryNavigation,
      inquiryProjectType,
      inquiryBudgetRange,
      homeManifesto,
      homeEcosystemTag,
      homeStat,
      service,
      servicePipelineStep,
      workFilter,
      workProject,
      labPrinciple,
      labMatrixRow,
      labSpec,
    ] = await Promise.all([
      this.prisma.siteConfig.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.primaryNavigation.findMany({ orderBy: { position: 'asc' } }),
      this.prisma.inquiryProjectType.findMany({ orderBy: { position: 'asc' } }),
      this.prisma.inquiryBudgetRange.findMany({ orderBy: { position: 'asc' } }),
      this.prisma.homeManifesto.findMany({ orderBy: { position: 'asc' } }),
      this.prisma.homeEcosystemTag.findMany({ orderBy: { position: 'asc' } }),
      this.prisma.homeStat.findMany({ orderBy: { position: 'asc' } }),
      this.prisma.service.findMany({
        orderBy: { position: 'asc' },
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
      this.prisma.servicePipelineStep.findMany({
        orderBy: { position: 'asc' },
      }),
      this.prisma.workFilter.findMany({ orderBy: { position: 'asc' } }),
      this.prisma.workProject.findMany({
        orderBy: { position: 'asc' },
        include: {
          disciplines: {
            orderBy: { position: 'asc' },
          },
        },
      }),
      this.prisma.labPrinciple.findMany({ orderBy: { position: 'asc' } }),
      this.prisma.labMatrixRow.findMany({ orderBy: { position: 'asc' } }),
      this.prisma.labSpec.findMany({ orderBy: { position: 'asc' } }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      tables: {
        siteConfig: siteConfig.map((item) => ({
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
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        primaryNavigation: primaryNavigation.map((item) => ({
          id: item.id,
          position: item.position,
          to: item.to,
          label: item.label,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        inquiryProjectType: inquiryProjectType.map((item) => ({
          id: item.id,
          position: item.position,
          value: item.value,
          label: item.label,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        inquiryBudgetRange: inquiryBudgetRange.map((item) => ({
          id: item.id,
          position: item.position,
          value: item.value,
          label: item.label,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        homeManifesto: homeManifesto.map((item) => ({
          id: item.id,
          position: item.position,
          icon: item.icon,
          kicker: item.kicker,
          title: item.title,
          copy: item.copy,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        homeEcosystemTag: homeEcosystemTag.map((item) => ({
          id: item.id,
          position: item.position,
          tag: item.tag,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        homeStat: homeStat.map((item) => ({
          id: item.id,
          position: item.position,
          label: item.label,
          value: item.value,
          suffix: item.suffix,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        service: service.map((item) => ({
          id: item.id,
          position: item.position,
          icon: item.icon,
          name: item.name,
          handle: item.handle,
          summary: item.summary,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        serviceCapability: service.flatMap((record) =>
          record.capabilities.map((capability) => ({
            id: capability.id,
            serviceId: capability.serviceId,
            position: capability.position,
            value: capability.value,
            createdAt: capability.createdAt.toISOString(),
            updatedAt: capability.updatedAt.toISOString(),
          })),
        ),
        serviceStackItem: service.flatMap((record) =>
          record.stackItems.map((stackItem) => ({
            id: stackItem.id,
            serviceId: stackItem.serviceId,
            position: stackItem.position,
            value: stackItem.value,
            createdAt: stackItem.createdAt.toISOString(),
            updatedAt: stackItem.updatedAt.toISOString(),
          })),
        ),
        serviceInterconnect: service.flatMap((record) =>
          record.interconnects.map((interconnect) => ({
            id: interconnect.id,
            serviceId: interconnect.serviceId,
            position: interconnect.position,
            value: interconnect.value,
            createdAt: interconnect.createdAt.toISOString(),
            updatedAt: interconnect.updatedAt.toISOString(),
          })),
        ),
        servicePipelineStep: servicePipelineStep.map((item) => ({
          id: item.id,
          position: item.position,
          icon: item.icon,
          label: item.label,
          step: item.step,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        workFilter: workFilter.map((item) => ({
          id: item.id,
          position: item.position,
          value: item.value,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        workProject: workProject.map((item) => ({
          id: item.id,
          position: item.position,
          projectKey: item.projectKey,
          title: item.title,
          client: item.client,
          year: item.year,
          summary: item.summary,
          coverImageUrl: item.coverImageUrl,
          challenge: item.challenge,
          approach: item.approach,
          outcome: item.outcome,
          featured: item.featured,
          featuredPosition: item.featuredPosition,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        workProjectDiscipline: workProject.flatMap((project) =>
          project.disciplines.map((discipline) => ({
            id: discipline.id,
            projectId: discipline.projectId,
            position: discipline.position,
            value: discipline.value,
            createdAt: discipline.createdAt.toISOString(),
            updatedAt: discipline.updatedAt.toISOString(),
          })),
        ),
        labPrinciple: labPrinciple.map((item) => ({
          id: item.id,
          position: item.position,
          icon: item.icon,
          name: item.name,
          desc: item.desc,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        labMatrixRow: labMatrixRow.map((item) => ({
          id: item.id,
          position: item.position,
          label: item.label,
          value: item.value,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        labSpec: labSpec.map((item) => ({
          id: item.id,
          position: item.position,
          label: item.label,
          value: item.value,
          deletedAt: this.serializeDate(item.deletedAt),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
      },
    };
  }
}

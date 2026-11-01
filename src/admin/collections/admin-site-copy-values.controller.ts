import {
  BadRequestException,
  Body,
  Controller,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../admin-audit.service';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';
import type { AdminPrincipal } from '../interfaces/admin-principal.interface';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

const MAX_VALUES_PER_SAVE = 300;
const MAX_VALUE_LENGTH = 2000;

/**
 * Saves a whole page of wording in one request: the page editor sends every
 * changed field at once rather than one PATCH per sentence. Only keys that
 * already exist can be written here — keys are defined by the site's code.
 */
@ApiTags('admin-site-copy')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/site-copy')
export class AdminSiteCopyValuesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Put('values')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Save several site text values by key' })
  async saveValues(
    @Body() body: Record<string, unknown>,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ updated: string[] }> {
    const values = body?.values;
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      throw new BadRequestException('values must be an object of key: text.');
    }

    const entries = Object.entries(values as Record<string, unknown>);
    if (entries.length === 0) return { updated: [] };
    if (entries.length > MAX_VALUES_PER_SAVE) {
      throw new BadRequestException(
        `At most ${MAX_VALUES_PER_SAVE} values per save.`,
      );
    }

    for (const [key, value] of entries) {
      if (typeof value !== 'string' || !value.trim()) {
        throw new BadRequestException(`${key} cannot be empty.`);
      }
      if (value.length > MAX_VALUE_LENGTH) {
        throw new BadRequestException(
          `${key} must be at most ${MAX_VALUE_LENGTH} characters.`,
        );
      }
    }

    const keys = entries.map(([key]) => key);
    const existing = await this.prisma.siteCopy.findMany({
      where: { key: { in: keys }, deletedAt: null },
      select: { key: true, value: true },
    });
    const known = new Map(existing.map((row) => [row.key, row.value]));
    const unknown = keys.filter((key) => !known.has(key));
    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown keys: ${unknown.join(', ')}`);
    }

    const changed = entries
      .map(([key, value]) => [key, (value as string).trim()] as const)
      .filter(([key, value]) => known.get(key) !== value);

    await this.prisma.$transaction(
      changed.map(([key, value]) =>
        this.prisma.siteCopy.update({ where: { key }, data: { value } }),
      ),
    );

    if (changed.length > 0) {
      const userAgent = request.headers?.['user-agent'];
      await this.auditService.record({
        actorAdminUserId: admin.id,
        actorEmail: admin.email,
        action: 'content.site_copy.save_values',
        resource: 'site_copy',
        method: 'PUT',
        path: '/api/admin/site-copy/values',
        ipAddress: request.ip,
        userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
        before: Object.fromEntries(
          changed.map(([key]) => [key, known.get(key) ?? null]),
        ) as Prisma.InputJsonObject,
        after: Object.fromEntries(changed) as Prisma.InputJsonObject,
      });
    }

    return { updated: changed.map(([key]) => key) };
  }
}

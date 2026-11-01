import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Module,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Type,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../admin-audit.service';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';
import type { AdminPrincipal } from '../interfaces/admin-principal.interface';
import {
  AdminCollectionService,
  AdminRequestContext,
} from './admin-collection.service';
import type { CollectionSpec } from './collection-spec';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

export function collectionServiceToken(spec: CollectionSpec): string {
  return `AdminCollectionService:${spec.entity}`;
}

function contextOf(request: AdminHttpRequest): AdminRequestContext {
  const userAgent = request.headers?.['user-agent'];
  return {
    ipAddress: request.ip,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    requestId: undefined,
  };
}

/**
 * The same seven routes, with the same permissions, as every hand-written
 * admin controller, mounted at /api/admin/<spec.path>.
 */
export function createCollectionController(
  spec: CollectionSpec,
): Type<unknown> {
  @ApiTags(`admin-${spec.path}`)
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
  @Controller(`admin/${spec.path}`)
  class AdminCollectionController {
    constructor(
      @Inject(collectionServiceToken(spec))
      private readonly service: AdminCollectionService,
    ) {}

    @Get('metadata')
    @AdminPermissions('content:read')
    @ApiOperation({ summary: `Return metadata for ${spec.label} management` })
    metadata() {
      return this.service.getMetadata();
    }

    @Get()
    @AdminPermissions('content:read')
    @ApiOperation({ summary: `List ${spec.label} records` })
    list(@Query() query: Record<string, unknown>) {
      return this.service.list(query);
    }

    @Get(':id')
    @AdminPermissions('content:read')
    @ApiOperation({ summary: `Get one ${spec.label}` })
    getById(@Param('id') id: string) {
      return this.service.getById(id);
    }

    @Post()
    @AdminPermissions('content:write')
    @ApiOperation({ summary: `Create a ${spec.label}` })
    create(
      @Body() body: Record<string, unknown>,
      @CurrentAdmin() admin: AdminPrincipal,
      @Req() request: AdminHttpRequest,
    ) {
      return this.service.create(body, admin, contextOf(request));
    }

    @Patch(':id')
    @AdminPermissions('content:write')
    @ApiOperation({ summary: `Update a ${spec.label}` })
    update(
      @Param('id') id: string,
      @Body() body: Record<string, unknown>,
      @CurrentAdmin() admin: AdminPrincipal,
      @Req() request: AdminHttpRequest,
    ) {
      return this.service.update(id, body, admin, contextOf(request));
    }

    @Delete(':id')
    @AdminPermissions('content:delete')
    @ApiOperation({ summary: `Soft delete a ${spec.label}` })
    softDelete(
      @Param('id') id: string,
      @CurrentAdmin() admin: AdminPrincipal,
      @Req() request: AdminHttpRequest,
    ) {
      return this.service.softDelete(id, admin, contextOf(request));
    }

    @Post(':id/restore')
    @AdminPermissions('content:restore')
    @ApiOperation({ summary: `Restore a soft-deleted ${spec.label}` })
    restore(
      @Param('id') id: string,
      @CurrentAdmin() admin: AdminPrincipal,
      @Req() request: AdminHttpRequest,
    ) {
      return this.service.restore(id, admin, contextOf(request));
    }

    @Post('bulk')
    @AdminPermissions('content:bulk')
    @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
    bulkAction(
      @Body() body: Record<string, unknown>,
      @CurrentAdmin() admin: AdminPrincipal,
      @Req() request: AdminHttpRequest,
    ) {
      return this.service.bulkAction(body, admin, contextOf(request));
    }
  }

  // Each generated class needs its own name, or Swagger and Nest's injector
  // see several controllers called the same thing.
  Object.defineProperty(AdminCollectionController, 'name', {
    value: `Admin${spec.entity
      .split('_')
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join('')}Controller`,
  });

  return AdminCollectionController;
}

/**
 * A module for one collection. `extraControllers` lets a collection add
 * routes of its own (site copy's bulk value save) beside the standard ones;
 * they can inject the service by `collectionServiceToken(spec)`.
 */
export function createCollectionModule(
  spec: CollectionSpec,
  extraControllers: Type<unknown>[] = [],
): Type<unknown> {
  @Module({
    // Extra controllers are registered first: Fastify matches in order, and
    // `PUT values` must not be shadowed by `:id` routes of the same path.
    controllers: [...extraControllers, createCollectionController(spec)],
    providers: [
      AdminAuditService,
      {
        provide: collectionServiceToken(spec),
        inject: [PrismaService, AdminAuditService],
        useFactory: (prisma: PrismaService, audit: AdminAuditService) =>
          new AdminCollectionService(spec, prisma, audit),
      },
    ],
  })
  class AdminCollectionModule {}

  Object.defineProperty(AdminCollectionModule, 'name', {
    value: `Admin${spec.entity
      .split('_')
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join('')}Module`,
  });

  return AdminCollectionModule;
}

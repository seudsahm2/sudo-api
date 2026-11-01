import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../admin-audit.service';
import { AdminPrincipal } from '../interfaces/admin-principal.interface';
import type {
  CollectionDelegate,
  CollectionField,
  CollectionRow,
  CollectionSpec,
} from './collection-spec';

export interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface CollectionListResponse {
  items: Record<string, unknown>[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const STATUS_FILTERS = ['active', 'deleted', 'all'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;
const BULK_ACTIONS = ['delete', 'restore'] as const;

/** Fields every collection has and nobody writes directly. */
const SYSTEM_FIELDS: CollectionField[] = [
  { key: 'deletedAt', type: 'datetime', readOnly: true },
  { key: 'createdAt', type: 'datetime', readOnly: true },
  { key: 'updatedAt', type: 'datetime', readOnly: true },
];

/** Sent by the editor with every update; not a column. */
const CONCURRENCY_KEY = 'expectedUpdatedAt';

/**
 * CRUD, soft delete, restore, bulk actions and audit for one collection spec.
 * Behaves exactly like the hand-written services, so the admin editor cannot
 * tell the difference.
 */
export class AdminCollectionService {
  private readonly delegate: CollectionDelegate;

  constructor(
    readonly spec: CollectionSpec,
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {
    this.delegate = spec.delegate(prisma);
  }

  getMetadata() {
    return {
      entity: this.spec.entity,
      fields: [
        { key: 'id', type: 'string', readOnly: true },
        ...this.spec.fields.map((field) => ({
          key: field.key,
          type: field.type,
          required: Boolean(field.required),
          ...(field.readOnly ? { readOnly: true } : {}),
          ...(field.maxLength ? { maxLength: field.maxLength } : {}),
          ...(field.options ? { options: [...field.options] } : {}),
        })),
        ...SYSTEM_FIELDS,
      ],
      sort: {
        fields: this.spec.sortFields,
        orders: [...SORT_ORDERS],
      },
      filters: {
        status: [...STATUS_FILTERS],
      },
      bulkActions: [...BULK_ACTIONS],
    };
  }

  async list(query: Record<string, unknown>): Promise<CollectionListResponse> {
    const page = this.positiveInt(query.page, 1, 10_000);
    const pageSize = this.positiveInt(query.pageSize, 20, 100);
    const sortBy = this.pick(
      query.sortBy,
      this.spec.sortFields,
      this.spec.defaultSort,
    );
    const sortOrder = this.pick(query.sortOrder, SORT_ORDERS, 'asc');
    const status = this.pick(query.status, STATUS_FILTERS, 'active');

    const where: Record<string, unknown> = {};
    if (status === 'active') where.deletedAt = null;
    if (status === 'deleted') where.deletedAt = { not: null };
    for (const key of this.spec.filterFields ?? []) {
      const value = query[key];
      if (typeof value === 'string' && value) where[key] = value;
    }

    const search = typeof query.search === 'string' ? query.search.trim() : '';
    if (search) {
      where.OR = this.spec.searchFields.map((key) => ({
        [key]: { contains: search, mode: 'insensitive' },
      }));
    }

    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        ...(this.spec.include ? { include: this.spec.include } : {}),
      }),
      this.delegate.count({ where }),
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

  async getById(id: string) {
    return this.toModel(await this.find(id));
  }

  async create(
    body: Record<string, unknown>,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ) {
    const data = this.coerce(body, false);

    for (const field of this.spec.fields) {
      if (field.readOnly) continue;
      if (data[field.key] === undefined && field.defaultValue !== undefined) {
        data[field.key] = field.defaultValue;
      }
      if (
        field.required &&
        (data[field.key] === undefined || data[field.key] === null)
      ) {
        throw new BadRequestException(`${field.key} is required.`);
      }
    }

    await this.spec.validate?.(this.prisma, data, null);

    const created = await this.write(() =>
      this.delegate.create({
        data,
        ...(this.spec.include ? { include: this.spec.include } : {}),
      }),
    );
    await this.spec.afterWrite?.(this.prisma, created);

    await this.audit('create', 'POST', '', actor, context, created.id, {
      after: this.toSnapshot(created),
    });

    return this.toModel(created);
  }

  async update(
    id: string,
    body: Record<string, unknown>,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ) {
    const existing = await this.find(id);

    const expected = body[CONCURRENCY_KEY];
    if (
      typeof expected === 'string' &&
      existing.updatedAt.toISOString() !== expected
    ) {
      throw new ConflictException(
        'This record has changed since you opened it. Refresh and retry your edit.',
      );
    }

    const data = this.coerce(body, true);
    for (const field of this.spec.fields) {
      if (field.required && data[field.key] === null) {
        throw new BadRequestException(`${field.key} cannot be empty.`);
      }
    }

    await this.spec.validate?.(this.prisma, { ...existing, ...data }, existing);

    const updated = await this.write(() =>
      this.delegate.update({
        where: { id },
        data,
        ...(this.spec.include ? { include: this.spec.include } : {}),
      }),
    );
    await this.spec.afterWrite?.(this.prisma, updated);

    await this.audit('update', 'PATCH', `/${id}`, actor, context, id, {
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
    const existing = await this.find(id);
    if (existing.deletedAt) {
      throw new BadRequestException(`${this.spec.label} is already deleted`);
    }

    const deleted = await this.delegate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit('delete', 'DELETE', `/${id}`, actor, context, id, {
      before: this.toSnapshot(existing),
      after: this.toSnapshot(deleted),
    });

    return {
      id,
      deletedAt: deleted.deletedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async restore(
    id: string,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ) {
    const existing = await this.find(id);
    if (!existing.deletedAt) {
      throw new BadRequestException(`${this.spec.label} is not deleted`);
    }

    const restored = await this.delegate.update({
      where: { id },
      data: { deletedAt: null },
      ...(this.spec.include ? { include: this.spec.include } : {}),
    });

    await this.audit('restore', 'POST', `/${id}/restore`, actor, context, id, {
      before: this.toSnapshot(existing),
      after: this.toSnapshot(restored),
    });

    return this.toModel(restored);
  }

  async bulkAction(
    body: Record<string, unknown>,
    actor: AdminPrincipal,
    context?: AdminRequestContext,
  ) {
    const action = body.action;
    if (action !== 'delete' && action !== 'restore') {
      throw new BadRequestException('action must be "delete" or "restore".');
    }
    if (
      !Array.isArray(body.ids) ||
      body.ids.length === 0 ||
      body.ids.length > 100 ||
      body.ids.some((value) => typeof value !== 'string')
    ) {
      throw new BadRequestException('ids must hold between 1 and 100 ids.');
    }

    const ids = [...new Set(body.ids as string[])];
    const result = await this.delegate.updateMany({
      where: {
        id: { in: ids },
        deletedAt: action === 'delete' ? null : { not: null },
      },
      data: { deletedAt: action === 'delete' ? new Date() : null },
    });

    await this.audit(
      `bulk.${action}`,
      'POST',
      '/bulk',
      actor,
      context,
      undefined,
      {
        metadata: {
          ids,
          reason:
            typeof body.reason === 'string' ? body.reason.slice(0, 500) : null,
          affectedCount: result.count,
        },
      },
    );

    return { action, count: result.count, ids };
  }

  // ------------------------------------------------------------- internals

  private async find(id: string): Promise<CollectionRow> {
    const row = await this.delegate.findUnique({
      where: { id },
      ...(this.spec.include ? { include: this.spec.include } : {}),
    });
    if (!row) {
      throw new NotFoundException(`${this.spec.label} not found`);
    }
    return row;
  }

  /**
   * Turns a request body into column values. Unknown keys are refused, the
   * way the global ValidationPipe refuses them on the hand-written modules.
   * In a partial update an absent key is left alone; an empty optional
   * string becomes null.
   */
  private coerce(
    body: Record<string, unknown>,
    partial: boolean,
  ): Record<string, unknown> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Expected a JSON object.');
    }

    const writable = new Map(
      this.spec.fields
        .filter((field) => !field.readOnly)
        .map((field) => [field.key, field]),
    );

    for (const key of Object.keys(body)) {
      if (key !== CONCURRENCY_KEY && !writable.has(key)) {
        throw new BadRequestException(`property ${key} should not exist`);
      }
    }

    const data: Record<string, unknown> = {};
    for (const [key, field] of writable) {
      if (!(key in body)) {
        if (!partial && field.type === 'string[]') data[key] = [];
        continue;
      }
      data[key] = this.coerceValue(field, body[key]);
    }
    return data;
  }

  private coerceValue(field: CollectionField, raw: unknown): unknown {
    const fail = (message: string): never => {
      throw new BadRequestException(`${field.key} ${message}`);
    };

    if (raw === null) return null;

    switch (field.type) {
      case 'string': {
        if (typeof raw !== 'string') fail('must be text.');
        const value = (raw as string).trim();
        if (!value) return null;
        if (field.maxLength && value.length > field.maxLength) {
          fail(`must be at most ${field.maxLength} characters.`);
        }
        if (field.pattern && !field.pattern.test(value)) {
          fail(field.patternMessage ?? 'has the wrong format.');
        }
        return value;
      }
      case 'enum': {
        if (typeof raw !== 'string' || !field.options?.includes(raw)) {
          fail(`must be one of: ${(field.options ?? []).join(', ')}.`);
        }
        return raw;
      }
      case 'number': {
        const value = typeof raw === 'string' && raw.trim() ? Number(raw) : raw;
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          fail('must be a number.');
        }
        const number = value as number;
        if (field.integer && !Number.isInteger(number))
          fail('must be a whole number.');
        if (field.min !== undefined && number < field.min)
          fail(`must be at least ${field.min}.`);
        if (field.max !== undefined && number > field.max)
          fail(`must be at most ${field.max}.`);
        return number;
      }
      case 'boolean': {
        if (typeof raw === 'boolean') return raw;
        if (raw === 'true' || raw === 'false') return raw === 'true';
        return fail('must be true or false.');
      }
      case 'string[]': {
        if (
          !Array.isArray(raw) ||
          raw.some((entry) => typeof entry !== 'string')
        ) {
          fail('must be a list of text values.');
        }
        const values = (raw as string[])
          .map((entry) => entry.trim())
          .filter(Boolean);
        if (
          field.maxLength &&
          values.some((entry) => entry.length > field.maxLength!)
        ) {
          fail(`entries must be at most ${field.maxLength} characters.`);
        }
        if (
          field.options &&
          values.some((entry) => !field.options!.includes(entry))
        ) {
          fail(`entries must be from: ${field.options.join(', ')}.`);
        }
        return values;
      }
      default:
        return fail('cannot be written.');
    }
  }

  /** Unique and foreign-key failures are the admin's mistake, not a 500. */
  private async write(
    run: () => Promise<CollectionRow>,
  ): Promise<CollectionRow> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            this.spec.conflictMessage ??
              `Another ${this.spec.label.toLowerCase()} already uses that value.`,
          );
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(
            this.spec.missingReferenceMessage ??
              'That refers to a record that does not exist.',
          );
        }
      }
      throw error;
    }
  }

  private async audit(
    action: string,
    method: string,
    suffix: string,
    actor: AdminPrincipal,
    context: AdminRequestContext | undefined,
    resourceId: string | undefined,
    payload: {
      before?: Prisma.InputJsonObject;
      after?: Prisma.InputJsonObject;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: `content.${this.spec.entity}.${action}`,
      resource: this.spec.entity,
      resourceId,
      method,
      path: `/api/admin/${this.spec.path}${suffix}`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      before: payload.before,
      after: payload.after,
      metadata: payload.metadata as Prisma.InputJsonObject | undefined,
    });
  }

  private toSnapshot(row: CollectionRow): Prisma.InputJsonObject {
    return JSON.parse(
      JSON.stringify(this.present(row)),
    ) as Prisma.InputJsonObject;
  }

  private toModel(row: CollectionRow) {
    return {
      ...this.present(row),
      isDeleted: row.deletedAt !== null,
    };
  }

  private present(row: CollectionRow): Record<string, unknown> {
    const shaped = this.spec.present ? this.spec.present(row) : { ...row };
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(shaped)) {
      out[key] = value instanceof Date ? value.toISOString() : value;
    }
    return out;
  }

  private positiveInt(raw: unknown, fallback: number, max: number): number {
    const value = Number(raw);
    return Number.isInteger(value) && value >= 1
      ? Math.min(value, max)
      : fallback;
  }

  private pick<T extends string>(
    raw: unknown,
    allowed: readonly T[],
    fallback: T,
  ): T {
    return typeof raw === 'string' &&
      (allowed as readonly string[]).includes(raw)
      ? (raw as T)
      : fallback;
  }
}

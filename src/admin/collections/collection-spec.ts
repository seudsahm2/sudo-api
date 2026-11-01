import type { PrismaService } from '../../prisma/prisma.service';

/**
 * A flat admin collection described as data.
 *
 * The hand-written modules (home-stats, lab-specs, …) repeat the same six
 * hundred lines per table. A collection defined here gets the identical
 * contract — the same routes, permissions, audit actions, list query and
 * metadata shape the admin editor already reads — from one spec.
 */

export type CollectionFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'string[]'
  | 'datetime';

export interface CollectionField {
  key: string;
  type: CollectionFieldType;
  required?: boolean;
  maxLength?: number;
  /** For `enum`. */
  options?: readonly string[];
  /** For `number`. */
  integer?: boolean;
  min?: number;
  max?: number;
  /** For `string`: an empty value is rejected unless it matches too. */
  pattern?: RegExp;
  patternMessage?: string;
  /** Value written on create when the field is absent. */
  defaultValue?: unknown;
  readOnly?: boolean;
}

/** The minimum every delegate in this engine must offer. */
export interface CollectionDelegate {
  findMany(args: Record<string, unknown>): Promise<CollectionRow[]>;
  findUnique(args: Record<string, unknown>): Promise<CollectionRow | null>;
  count(args: Record<string, unknown>): Promise<number>;
  create(args: Record<string, unknown>): Promise<CollectionRow>;
  update(args: Record<string, unknown>): Promise<CollectionRow>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
}

export type CollectionRow = Record<string, unknown> & {
  id: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface CollectionSpec {
  /** Snake case, used in audit actions: `content.<entity>.create`. */
  entity: string;
  /** Human name for error messages: "Testimonial". */
  label: string;
  /** URL segment under /api/admin. */
  path: string;
  delegate: (prisma: PrismaService) => CollectionDelegate;
  /** Writable fields. id, deletedAt, createdAt and updatedAt are added. */
  fields: CollectionField[];
  searchFields: string[];
  /** Fields a list can be narrowed to by exact value: ?projectKey=delivery-app. */
  filterFields?: string[];
  sortFields: string[];
  defaultSort: string;
  /** Prisma `include` used for every read, if the row has relations. */
  include?: Record<string, unknown>;
  /** Shapes a stored row for the admin; defaults to the row itself. */
  present?: (row: CollectionRow) => Record<string, unknown>;
  /**
   * Cross-field and cross-table checks. Receives the merged record that is
   * about to be written; throws a Nest HTTP exception to refuse it.
   */
  validate?: (
    prisma: PrismaService,
    record: Record<string, unknown>,
    existing: CollectionRow | null,
  ) => Promise<void>;
  /** Runs after a successful create or update, for invariants like "one start screen". */
  afterWrite?: (prisma: PrismaService, row: CollectionRow) => Promise<void>;
  /** Readable messages for foreign key and unique failures. */
  conflictMessage?: string;
  missingReferenceMessage?: string;
}

/** Outbound links are rendered as <a href>, so they must be absolute http(s). */
export const LINK_PATTERN = /^https?:\/\/[^\s]+$/;

/** Images go straight into <img src>: http(s) or root-relative only. */
export const MEDIA_PATTERN = /^(https?:\/\/|\/)[^\s]*$/;

/** Lower case words joined by hyphens: used for keys that appear in URLs. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Backup and restore of everything the admin manages, shared by the
 * `content:backup` / `content:restore` scripts and the admin's own export and
 * restore buttons, so the two can never cover different tables again.
 *
 * The table list is the only thing written out by hand. Columns are read from
 * the Prisma schema, so a column added later is carried without an edit here.
 */
export interface ContentTable {
  /** The Prisma client delegate, e.g. `workProject`. */
  name: string;
  /** The Prisma model, e.g. `WorkProject`. */
  model: string;
  /** Rows are only re-inserted when the row they belong to exists. */
  parent?: { field: string; table: string; key: string };
  /**
   * Records of people rather than content. A restore adds the ones that are
   * missing and never deletes any: a backup from Monday must not erase an
   * enquiry that arrived on Tuesday.
   */
  preserve?: boolean;
}

/** Parents before children. */
export const CONTENT_TABLES: ContentTable[] = [
  { name: 'siteConfig', model: 'SiteConfig' },
  { name: 'primaryNavigation', model: 'PrimaryNavigation' },
  { name: 'inquiryProjectType', model: 'InquiryProjectType' },
  { name: 'inquiryBudgetRange', model: 'InquiryBudgetRange' },
  { name: 'homeManifesto', model: 'HomeManifesto' },
  { name: 'homeEcosystemTag', model: 'HomeEcosystemTag' },
  { name: 'homeStat', model: 'HomeStat' },
  { name: 'service', model: 'Service' },
  {
    name: 'serviceCapability',
    model: 'ServiceCapability',
    parent: { field: 'serviceId', table: 'service', key: 'id' },
  },
  {
    name: 'serviceStackItem',
    model: 'ServiceStackItem',
    parent: { field: 'serviceId', table: 'service', key: 'id' },
  },
  {
    name: 'serviceInterconnect',
    model: 'ServiceInterconnect',
    parent: { field: 'serviceId', table: 'service', key: 'id' },
  },
  { name: 'servicePipelineStep', model: 'ServicePipelineStep' },
  { name: 'workFilter', model: 'WorkFilter' },
  { name: 'workProject', model: 'WorkProject' },
  {
    name: 'workProjectDiscipline',
    model: 'WorkProjectDiscipline',
    parent: { field: 'projectId', table: 'workProject', key: 'id' },
  },
  {
    name: 'workProjectStackItem',
    model: 'WorkProjectStackItem',
    parent: { field: 'projectId', table: 'workProject', key: 'id' },
  },
  {
    name: 'workProjectMedia',
    model: 'WorkProjectMedia',
    parent: { field: 'projectKey', table: 'workProject', key: 'projectKey' },
  },
  {
    name: 'workProjectHighlight',
    model: 'WorkProjectHighlight',
    parent: { field: 'projectKey', table: 'workProject', key: 'projectKey' },
  },
  {
    name: 'prototypeScreen',
    model: 'PrototypeScreen',
    parent: { field: 'projectKey', table: 'workProject', key: 'projectKey' },
  },
  {
    name: 'prototypeHotspot',
    model: 'PrototypeHotspot',
    parent: { field: 'screenId', table: 'prototypeScreen', key: 'id' },
  },
  { name: 'siteCopy', model: 'SiteCopy' },
  { name: 'testimonial', model: 'Testimonial' },
  { name: 'clientLogo', model: 'ClientLogo' },
  { name: 'faq', model: 'Faq' },
  { name: 'labPrinciple', model: 'LabPrinciple' },
  { name: 'labMatrixRow', model: 'LabMatrixRow' },
  { name: 'labSpec', model: 'LabSpec' },
  { name: 'inquiry', model: 'Inquiry', preserve: true },
];

export type SnapshotRow = Record<string, unknown>;

export interface ContentSnapshot {
  /** 2: whole rows of every table in CONTENT_TABLES. 1 (or absent): the old per-column format. */
  version?: number;
  generatedAt: string;
  tables: Record<string, SnapshotRow[]>;
}

export interface RestoreSummary {
  /** Tables replaced with the file's rows. */
  replaced: string[];
  /** Tables the file did not contain, left as they were. */
  kept: string[];
  /** Rows per table after the restore, and anything skipped. */
  lines: string[];
  tableCounts: Record<string, number>;
}

type Client = PrismaClient | Prisma.TransactionClient;

interface Delegate {
  findMany(args?: Record<string, unknown>): Promise<SnapshotRow[]>;
  deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
  createMany(args: {
    data: SnapshotRow[];
    skipDuplicates?: boolean;
  }): Promise<{ count: number }>;
}

function delegateOf(client: Client, table: ContentTable): Delegate {
  return (client as unknown as Record<string, Delegate>)[table.name];
}

/** Scalar columns the current schema has, so stale backup keys are dropped. */
function columnsOf(table: ContentTable): Set<string> {
  const model = Prisma.dmmf.datamodel.models.find(
    (entry) => entry.name === table.model,
  );
  if (!model) {
    throw new Error(`The schema has no model called ${table.model}.`);
  }
  return new Set(
    model.fields
      .filter((field) => field.kind !== 'object')
      .map((field) => field.name),
  );
}

function clean(table: ContentTable, rows: SnapshotRow[]): SnapshotRow[] {
  const columns = columnsOf(table);
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).filter(([key]) => columns.has(key))),
  );
}

/** Every row of every table. Dates serialise to ISO strings, which Prisma takes back. */
export async function takeSnapshot(client: Client): Promise<ContentSnapshot> {
  const tables: Record<string, SnapshotRow[]> = {};
  for (const table of CONTENT_TABLES) {
    tables[table.name] = await delegateOf(client, table).findMany({
      orderBy: { createdAt: 'asc' },
    });
  }
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    tables: JSON.parse(JSON.stringify(tables)) as Record<string, SnapshotRow[]>,
  };
}

export function countRows(snapshot: ContentSnapshot): Record<string, number> {
  return Object.fromEntries(
    Object.entries(snapshot.tables).map(([name, rows]) => [
      name,
      Array.isArray(rows) ? rows.length : 0,
    ]),
  );
}

/**
 * Replaces every table the snapshot contains, keeps every table it does not,
 * and only ever adds enquiries. `current` must be a snapshot taken just before
 * — it is where the kept tables are put back from, after their parents have
 * been replaced.
 */
export async function restoreSnapshot(
  prisma: PrismaClient,
  snapshot: ContentSnapshot,
  current: ContentSnapshot,
): Promise<RestoreSummary> {
  const summary: RestoreSummary = {
    replaced: [],
    kept: [],
    lines: [],
    tableCounts: {},
  };

  await prisma.$transaction(
    async (tx) => {
      // Children first, so nothing is left pointing at a deleted parent.
      for (const table of [...CONTENT_TABLES].reverse()) {
        if (table.preserve) continue;
        await delegateOf(tx, table).deleteMany();
      }

      const inserted: Record<string, SnapshotRow[]> = {};
      for (const table of CONTENT_TABLES) {
        if (table.preserve) continue;

        const fromFile = Array.isArray(snapshot.tables[table.name]);
        (fromFile ? summary.replaced : summary.kept).push(table.name);

        let rows = clean(
          table,
          fromFile
            ? snapshot.tables[table.name]
            : (current.tables[table.name] ?? []),
        );

        if (table.parent) {
          const { field, table: parentName, key } = table.parent;
          const parents = new Set(
            (inserted[parentName] ?? []).map((row) => row[key]),
          );
          const before = rows.length;
          rows = rows.filter((row) => parents.has(row[field]));
          if (rows.length < before) {
            summary.lines.push(
              `${table.name}: ${before - rows.length} rows skipped, their ${parentName} is not in the restored data`,
            );
          }
        }

        if (rows.length > 0) {
          await delegateOf(tx, table).createMany({ data: rows });
        }
        inserted[table.name] = rows;
        summary.tableCounts[table.name] = rows.length;
        summary.lines.push(
          `${table.name}: ${rows.length} ${fromFile ? 'restored' : 'kept'}`,
        );
      }

      for (const table of CONTENT_TABLES.filter((entry) => entry.preserve)) {
        const rows = snapshot.tables[table.name];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const result = await delegateOf(tx, table).createMany({
          data: clean(table, rows),
          skipDuplicates: true,
        });
        summary.lines.push(
          `${table.name}: ${result.count} missing rows added back, none removed`,
        );
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  return summary;
}

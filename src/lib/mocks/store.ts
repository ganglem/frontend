import fixturesJson from "@/lib/mocks/fixtures.json";
import type {
  BaseListResponse,
  DataWriteResponse,
  DatasetColumn,
  DatasetDeleteResponse,
  DatasetResponse,
  DatasetUpdateRequest,
  DatasetsListResponse,
  DownloadResult,
  NamespaceCreateRequest,
  NamespaceDeleteResponse,
  NamespaceInfo,
  NamespaceResponse,
  NamespaceUpdateRequest,
  PreviewResponse,
  QueryRequest,
  QueryDebugResponse,
  QueryResponse,
  QueryRow,
  RestoreSnapshotResponse,
  SnapshotInfo,
  SnapshotListResponse,
} from "@/types/api";

// In-memory fixture data for `npm run dev:noauth`, seeded once per page load
// from fixtures.json and mutated from there - lets the whole UI (including
// create/delete/append/rollback) be exercised with zero live backend. Add
// more namespaces/datasets by editing fixtures.json; no code changes needed.
interface MockDataset {
  name: string;
  format: string;
  description: string | null;
  location: string;
  properties: Record<string, string>;
  totalRecords: number;
  schema: DatasetColumn[];
  snapshots: SnapshotInfo[];
  rows: QueryRow[];
}

interface MockNamespace {
  name: string;
  description: string | null;
  datasets: MockDataset[];
}

const state = structuredClone(fixturesJson) as unknown as { namespaces: MockNamespace[] };

const DEFAULT_UPLOAD_SCHEMA: DatasetColumn[] = [
  { name: "id", type: "long", required: true, doc: "Synthetic id assigned by the mock API." },
  { name: "value", type: "string", required: false, doc: null },
  { name: "ingested_at", type: "timestamp", required: true, doc: null },
];

function mockDelay() {
  return new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 250));
}

function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min));
}

function generateMockRows(count: number): QueryRow[] {
  const now = new Date().toISOString();

  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    value: `sample_value_${index + 1}`,
    ingested_at: now,
  }));
}

function getNamespaceOrThrow(namespace: string): MockNamespace {
  const ns = state.namespaces.find((n) => n.name === namespace);

  if (!ns) {
    throw new Error(`Namespace "${namespace}" was not found.`);
  }

  return ns;
}

function getDatasetOrThrow(namespace: string, dataset: string): MockDataset {
  const ns = getNamespaceOrThrow(namespace);
  const ds = ns.datasets.find((d) => d.name === dataset);

  if (!ds) {
    throw new Error(`Dataset "${dataset}" was not found in namespace "${namespace}".`);
  }

  return ds;
}

function currentSnapshot(dataset: MockDataset) {
  return dataset.snapshots.find((s) => s.isCurrent) ?? null;
}

function nextSnapshotId(dataset: MockDataset) {
  return dataset.snapshots.reduce((max, s) => Math.max(max, s.snapshotId), 0) + 1;
}

function toNamespaceResponse(ns: MockNamespace): NamespaceResponse {
  return {
    name: ns.name,
    properties: {},
    created_at: null,
    updated_at: null,
    table_count: ns.datasets.length,
  };
}

function toDatasetResponse(namespace: string, ds: MockDataset): DatasetResponse {
  return {
    name: ds.name,
    namespace,
    format: ds.format,
    location: ds.location,
    properties: ds.properties,
    schema: ds.schema,
    partitionSpec: null,
    createdAt: null,
    updatedAt: null,
    currentSnapshotId: currentSnapshot(ds)?.snapshotId ?? null,
    totalRecords: ds.totalRecords,
  };
}

export async function mockListNamespaces(): Promise<BaseListResponse<NamespaceInfo>> {
  await mockDelay();

  return {
    data: state.namespaces.map((ns) => ({ name: ns.name, description: ns.description })),
  };
}

export async function mockCreateNamespace(
  input: NamespaceCreateRequest,
): Promise<NamespaceResponse> {
  await mockDelay();

  if (state.namespaces.some((ns) => ns.name === input.name)) {
    throw new Error(`Namespace "${input.name}" already exists.`);
  }

  const ns: MockNamespace = { name: input.name, description: input.description ?? null, datasets: [] };

  state.namespaces.push(ns);

  return toNamespaceResponse(ns);
}

export async function mockGetNamespace(namespace: string): Promise<NamespaceResponse> {
  await mockDelay();

  return toNamespaceResponse(getNamespaceOrThrow(namespace));
}

export async function mockUpdateNamespace(
  namespace: string,
  input: NamespaceUpdateRequest,
): Promise<NamespaceResponse> {
  await mockDelay();

  const ns = getNamespaceOrThrow(namespace);

  if (input.description !== undefined) {
    ns.description = input.description ?? null;
  }

  return toNamespaceResponse(ns);
}

export async function mockDeleteNamespace(
  namespace: string,
  force: boolean,
): Promise<NamespaceDeleteResponse> {
  await mockDelay();

  const index = state.namespaces.findIndex((ns) => ns.name === namespace);

  if (index === -1) {
    throw new Error(`Namespace "${namespace}" was not found.`);
  }

  const ns = state.namespaces[index];

  if (ns.datasets.length > 0 && !force) {
    throw new Error(
      `Namespace "${namespace}" still has ${ns.datasets.length} dataset(s). Enable force to delete them too.`,
    );
  }

  const deletedTables = ns.datasets.map((d) => d.name);

  state.namespaces.splice(index, 1);

  return {
    success: true,
    message: `Namespace "${namespace}" deleted.`,
    deleted_tables: force ? deletedTables : null,
  };
}

export async function mockListDatasets(namespace: string): Promise<DatasetsListResponse> {
  await mockDelay();

  const ns = getNamespaceOrThrow(namespace);

  return {
    namespace,
    totalCount: ns.datasets.length,
    datasets: ns.datasets.map((d) => ({ name: d.name, format: d.format, description: d.description })),
  };
}

export async function mockCreateDataset(
  namespace: string,
  input: { name: string; description?: string; file?: File },
): Promise<DatasetResponse> {
  await mockDelay();

  const ns = getNamespaceOrThrow(namespace);

  if (ns.datasets.some((d) => d.name === input.name)) {
    throw new Error(`Dataset "${input.name}" already exists in namespace "${namespace}".`);
  }

  const dataset: MockDataset = {
    name: input.name,
    format: "parquet",
    description: input.description ?? null,
    location: `s3://dev-team-bucket/${namespace}/${input.name}`,
    properties: {},
    totalRecords: randomInt(50, 500),
    schema: DEFAULT_UPLOAD_SCHEMA,
    snapshots: [
      { snapshotId: 1, parentId: null, timestampMs: Date.now(), operation: "create", isCurrent: true },
    ],
    rows: generateMockRows(10),
  };

  ns.datasets.push(dataset);

  return toDatasetResponse(namespace, dataset);
}

export async function mockGetDataset(namespace: string, dataset: string): Promise<DatasetResponse> {
  await mockDelay();

  return toDatasetResponse(namespace, getDatasetOrThrow(namespace, dataset));
}

export async function mockUpdateDataset(
  namespace: string,
  dataset: string,
  input: DatasetUpdateRequest,
): Promise<DatasetResponse> {
  await mockDelay();

  const ds = getDatasetOrThrow(namespace, dataset);

  if (input.description !== undefined) {
    ds.description = input.description ?? null;
  }

  ds.properties = { ...ds.properties, ...input.properties };

  return toDatasetResponse(namespace, ds);
}

export async function mockDeleteDataset(
  namespace: string,
  dataset: string,
  purge: boolean,
): Promise<DatasetDeleteResponse> {
  await mockDelay();

  const ns = getNamespaceOrThrow(namespace);
  const index = ns.datasets.findIndex((d) => d.name === dataset);

  if (index === -1) {
    throw new Error(`Dataset "${dataset}" was not found in namespace "${namespace}".`);
  }

  ns.datasets.splice(index, 1);

  return {
    success: true,
    message: `Dataset "${dataset}" deleted${purge ? " and its data files purged" : " (metadata only)"}.`,
  };
}

function writeMockData(
  namespace: string,
  dataset: string,
  file: File,
  mode: "append" | "overwrite",
): DataWriteResponse {
  const ds = getDatasetOrThrow(namespace, dataset);
  const rowsWritten = randomInt(20, 500);
  const previous = currentSnapshot(ds);

  ds.snapshots.forEach((snapshot) => {
    snapshot.isCurrent = false;
  });
  ds.snapshots.unshift({
    snapshotId: nextSnapshotId(ds),
    parentId: previous?.snapshotId ?? null,
    timestampMs: Date.now(),
    operation: mode,
    isCurrent: true,
  });
  ds.totalRecords = mode === "overwrite" ? rowsWritten : ds.totalRecords + rowsWritten;

  return {
    success: true,
    rowsWritten,
    message: `Mock ${mode} of "${file.name}" applied to ${namespace}.${dataset}.`,
  };
}

export async function mockAppendDatasetData(
  namespace: string,
  dataset: string,
  file: File,
): Promise<DataWriteResponse> {
  await mockDelay();

  return writeMockData(namespace, dataset, file, "append");
}

export async function mockOverwriteDatasetData(
  namespace: string,
  dataset: string,
  file: File,
): Promise<DataWriteResponse> {
  await mockDelay();

  return writeMockData(namespace, dataset, file, "overwrite");
}

export async function mockDownloadDatasetData(
  namespace: string,
  dataset: string,
  snapshotId?: number,
): Promise<DownloadResult> {
  await mockDelay();

  const ds = getDatasetOrThrow(namespace, dataset);
  const blob = new Blob([JSON.stringify(ds.rows, null, 2)], { type: "application/json" });

  return {
    blob,
    filename: `${dataset}${snapshotId ? `-snapshot-${snapshotId}` : ""}.mock.json`,
    contentType: "application/json",
  };
}

export async function mockPreviewDatasetData(
  namespace: string,
  dataset: string,
  input: { limit?: number; snapshotId?: number },
): Promise<PreviewResponse> {
  await mockDelay();

  const ds = getDatasetOrThrow(namespace, dataset);
  const limit = input.limit ?? 10;

  return {
    rows: ds.rows.slice(0, limit),
    totalRows: ds.totalRecords,
    snapshotId: input.snapshotId ?? currentSnapshot(ds)?.snapshotId ?? null,
    limit,
  };
}

export async function mockListSnapshots(
  namespace: string,
  dataset: string,
): Promise<SnapshotListResponse> {
  await mockDelay();

  const ds = getDatasetOrThrow(namespace, dataset);

  return {
    snapshots: ds.snapshots,
    currentSnapshotId: currentSnapshot(ds)?.snapshotId ?? null,
  };
}

export async function mockRestoreSnapshot(
  namespace: string,
  dataset: string,
  snapshotId: number,
): Promise<RestoreSnapshotResponse> {
  await mockDelay();

  const ds = getDatasetOrThrow(namespace, dataset);
  const target = ds.snapshots.find((s) => s.snapshotId === snapshotId);

  if (!target) {
    throw new Error(`Snapshot ${snapshotId} was not found for ${namespace}.${dataset}.`);
  }

  const previous = currentSnapshot(ds);

  ds.snapshots.forEach((snapshot) => {
    snapshot.isCurrent = snapshot.snapshotId === snapshotId;
  });

  return {
    success: true,
    message: `Rolled back ${namespace}.${dataset} to snapshot ${snapshotId}.`,
    previousSnapshotId: previous?.snapshotId ?? null,
    currentSnapshotId: snapshotId,
  };
}

const TABLE_REFERENCE = /from\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i;

function resolveQueryRows(sql: string): QueryRow[] {
  const match = sql.match(TABLE_REFERENCE);

  if (match) {
    const ns = state.namespaces.find((n) => n.name === match[1]);
    const dataset = ns?.datasets.find((d) => d.name === match[2]);

    if (dataset) {
      return dataset.rows;
    }
  }

  return state.namespaces[0]?.datasets[0]?.rows ?? [];
}

export async function mockRunQuery(input: QueryRequest): Promise<QueryResponse> {
  await mockDelay();

  const rows = resolveQueryRows(input.sql).slice(0, input.maxRows ?? 100);

  return {
    rows,
    totalRows: rows.length,
    queryId: `mock-${Date.now()}`,
    columns: rows[0] ? Object.keys(rows[0]).map((name) => ({ name })) : [],
    executionTimeMs: randomInt(8, 120),
  };
}

export async function mockRunQueryDebug(input: QueryRequest): Promise<QueryDebugResponse> {
  await mockDelay();

  const rows = resolveQueryRows(input.sql).slice(0, input.maxRows ?? 100);

  return {
    queryId: `mock-${Date.now()}`,
    state: "SUCCEEDED",
    stats: { mock: true, rowCount: rows.length },
    columns: rows[0] ? Object.keys(rows[0]).map((name) => ({ name })) : [],
    dataSample: rows.slice(0, 5),
    totalRows: rows.length,
    responseChunks: 1,
    rawResponse: rows,
  };
}

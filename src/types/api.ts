// Types mirror the JSON field names returned by api-docs-v2.json exactly
// (the API itself mixes camelCase and snake_case across endpoints). Auth
// itself is Keycloak's contract, not this API's - see src/lib/keycloak.ts.

export interface CatalogInfo {
  name: string;
  catalog: string;
  bucketName: string;
  group: string;
  description?: string | null;
}

export interface CurrentUser {
  name: string;
  groups: string[];
  email: string | null;
  catalogs: CatalogInfo[];
  operatingService?: Record<string, unknown> | null;
}

export interface NamespaceInfo {
  name: string;
  description: string | null;
}

export interface NamespaceResponse {
  name: string;
  properties: Record<string, string>;
  created_at: string | null;
  updated_at: string | null;
  table_count: number;
}

export interface NamespaceCreateRequest {
  name: string;
  description?: string | null;
  properties?: Record<string, unknown> | null;
}

export interface NamespaceUpdateRequest {
  description?: string | null;
  properties: Record<string, string>;
}

export interface NamespaceDeleteResponse {
  success: boolean;
  message: string;
  deleted_tables: string[] | null;
}

export interface BaseListResponse<T> {
  data: T[];
  meta?: Record<string, unknown> | null;
}

export interface DatasetInfo {
  name: string;
  format: string;
  description: string | null;
}

export interface DatasetColumn {
  name: string;
  type: string;
  required: boolean;
  doc: string | null;
}

export interface DatasetResponse {
  name: string;
  namespace: string;
  format: string;
  location: string | null;
  properties: Record<string, string>;
  schema: DatasetColumn[];
  partitionSpec: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
  currentSnapshotId: number | null;
  totalRecords: number;
}

export interface DatasetUpdateRequest {
  description?: string | null;
  properties: Record<string, string>;
}

export interface DatasetsListResponse {
  datasets: DatasetInfo[];
  namespace: string;
  totalCount: number;
}

export interface DatasetDeleteResponse {
  success: boolean;
  message: string;
}

export interface DataWriteResponse {
  success: boolean;
  rowsWritten: number;
  message: string;
}

export interface SnapshotInfo {
  snapshotId: number;
  parentId: number | null;
  timestampMs: number;
  operation: string | null;
  isCurrent: boolean;
}

export interface SnapshotListResponse {
  snapshots: SnapshotInfo[];
  currentSnapshotId: number | null;
}

export interface RestoreSnapshotResponse {
  success: boolean;
  message: string;
  previousSnapshotId: number | null;
  currentSnapshotId: number | null;
}

export interface QueryRow {
  [key: string]: unknown;
}

export interface PreviewResponse {
  rows: QueryRow[];
  totalRows: number;
  snapshotId: number | null;
  limit: number;
}

export interface QueryRequest {
  sql: string;
  maxRows?: number | null;
}

export interface QueryResponse {
  rows: QueryRow[];
  totalRows: number;
  queryId: string | null;
  columns: Record<string, string>[];
  executionTimeMs: number | null;
}

export interface QueryDebugResponse {
  queryId: string | null;
  state: string | null;
  stats: Record<string, unknown>;
  columns: Record<string, unknown>[];
  dataSample: Record<string, unknown>[];
  totalRows: number;
  responseChunks: number;
  rawResponse: Record<string, unknown>[];
}

export interface DownloadResult {
  blob: Blob;
  filename: string;
  contentType: string;
}

// App-level session shape (not an API response). Selecting a catalog is a
// purely client-side choice in v2 - there is no "select team" endpoint.
export interface FrontendSession {
  username: string;
  token: string;
  email: string | null;
  catalogs: CatalogInfo[];
  catalogId: string;
  expiresAt: number | null;
}

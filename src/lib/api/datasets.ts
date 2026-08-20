import { buildQuery, isNoAuthMode, requestBlob, requestJson } from "@/lib/api/client";
import {
  mockAppendDatasetData,
  mockCreateDataset,
  mockDeleteDataset,
  mockDownloadDatasetData,
  mockGetDataset,
  mockListDatasets,
  mockListSnapshots,
  mockOverwriteDatasetData,
  mockPreviewDatasetData,
  mockRestoreSnapshot,
  mockUpdateDataset,
} from "@/lib/mocks/store";
import type {
  DataWriteResponse,
  DatasetDeleteResponse,
  DatasetResponse,
  DatasetUpdateRequest,
  DatasetsListResponse,
  DownloadResult,
  FrontendSession,
  PreviewResponse,
  RestoreSnapshotResponse,
  SnapshotListResponse,
} from "@/types/api";

function datasetsPath(session: FrontendSession, namespace: string) {
  return `/api/v1/catalogs/${encodeURIComponent(session.catalogId)}/namespaces/${encodeURIComponent(namespace)}/datasets`;
}

function datasetPath(session: FrontendSession, namespace: string, dataset: string) {
  return `${datasetsPath(session, namespace)}/${encodeURIComponent(dataset)}`;
}

export function listDatasets(session: FrontendSession, namespace: string) {
  if (isNoAuthMode()) {
    return mockListDatasets(namespace);
  }

  return requestJson<DatasetsListResponse>(datasetsPath(session, namespace), {
    method: "GET",
    authToken: session.token,
  });
}

export function createDataset(
  session: FrontendSession,
  namespace: string,
  input: { name: string; description?: string; file?: File },
) {
  if (isNoAuthMode()) {
    return mockCreateDataset(namespace, input);
  }

  const body = new FormData();
  body.append("name", input.name);

  if (input.description) {
    body.append("description", input.description);
  }

  if (input.file) {
    body.append("file", input.file, input.file.name);
  }

  return requestJson<DatasetResponse>(datasetsPath(session, namespace), {
    method: "POST",
    body,
    authToken: session.token,
  });
}

export function getDataset(session: FrontendSession, namespace: string, dataset: string) {
  if (isNoAuthMode()) {
    return mockGetDataset(namespace, dataset);
  }

  return requestJson<DatasetResponse>(datasetPath(session, namespace, dataset), {
    method: "GET",
    authToken: session.token,
  });
}

export function updateDataset(
  session: FrontendSession,
  namespace: string,
  dataset: string,
  input: DatasetUpdateRequest,
) {
  if (isNoAuthMode()) {
    return mockUpdateDataset(namespace, dataset, input);
  }

  return requestJson<DatasetResponse>(datasetPath(session, namespace, dataset), {
    method: "PUT",
    body: JSON.stringify(input),
    authToken: session.token,
  });
}

export function deleteDataset(
  session: FrontendSession,
  namespace: string,
  dataset: string,
  purge: boolean,
) {
  if (isNoAuthMode()) {
    return mockDeleteDataset(namespace, dataset, purge);
  }

  return requestJson<DatasetDeleteResponse>(
    `${datasetPath(session, namespace, dataset)}${buildQuery({ purge })}`,
    {
      method: "DELETE",
      authToken: session.token,
    },
  );
}

export function appendDatasetData(
  session: FrontendSession,
  namespace: string,
  dataset: string,
  file: File,
  createIfNotExists: boolean,
) {
  if (isNoAuthMode()) {
    return mockAppendDatasetData(namespace, dataset, file);
  }

  const body = new FormData();
  body.append("file", file, file.name);

  return requestJson<DataWriteResponse>(
    `${datasetPath(session, namespace, dataset)}/data${buildQuery({ create_if_not_exists: createIfNotExists })}`,
    {
      method: "POST",
      body,
      authToken: session.token,
    },
  );
}

export function overwriteDatasetData(
  session: FrontendSession,
  namespace: string,
  dataset: string,
  file: File,
) {
  if (isNoAuthMode()) {
    return mockOverwriteDatasetData(namespace, dataset, file);
  }

  const body = new FormData();
  body.append("file", file, file.name);

  return requestJson<DataWriteResponse>(`${datasetPath(session, namespace, dataset)}/data`, {
    method: "PUT",
    body,
    authToken: session.token,
  });
}

export async function downloadDatasetData(
  session: FrontendSession,
  namespace: string,
  dataset: string,
  snapshotId?: number,
): Promise<DownloadResult> {
  if (isNoAuthMode()) {
    return mockDownloadDatasetData(namespace, dataset, snapshotId);
  }

  return requestBlob(
    `${datasetPath(session, namespace, dataset)}/data${buildQuery({ snapshot_id: snapshotId })}`,
    {
      method: "GET",
      authToken: session.token,
    },
    `${dataset}.parquet`,
  );
}

export function previewDatasetData(
  session: FrontendSession,
  namespace: string,
  dataset: string,
  input: { limit?: number; snapshotId?: number },
) {
  if (isNoAuthMode()) {
    return mockPreviewDatasetData(namespace, dataset, input);
  }

  return requestJson<PreviewResponse>(
    `${datasetPath(session, namespace, dataset)}/preview${buildQuery({
      limit: input.limit,
      snapshot_id: input.snapshotId,
    })}`,
    {
      method: "GET",
      authToken: session.token,
    },
  );
}

export function listSnapshots(session: FrontendSession, namespace: string, dataset: string) {
  if (isNoAuthMode()) {
    return mockListSnapshots(namespace, dataset);
  }

  return requestJson<SnapshotListResponse>(
    `${datasetPath(session, namespace, dataset)}/snapshots`,
    {
      method: "GET",
      authToken: session.token,
    },
  );
}

export function restoreSnapshot(
  session: FrontendSession,
  namespace: string,
  dataset: string,
  snapshotId: number,
) {
  if (isNoAuthMode()) {
    return mockRestoreSnapshot(namespace, dataset, snapshotId);
  }

  return requestJson<RestoreSnapshotResponse>(
    `${datasetPath(session, namespace, dataset)}/snapshots/${snapshotId}/restore`,
    {
      method: "POST",
      authToken: session.token,
    },
  );
}

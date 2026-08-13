"use client";

import { useQuery } from "@tanstack/react-query";
import { getDataset, listDatasets, listSnapshots } from "@/lib/api/datasets";
import { getNamespace, listNamespaces } from "@/lib/api/namespaces";
import { useAuth } from "@/hooks/useAuth";

export function useNamespacesQuery() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["namespaces", session?.catalogId],
    queryFn: () => listNamespaces(session!),
    enabled: !!session,
  });
}

export function useNamespaceQuery(namespace: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["namespace", session?.catalogId, namespace],
    queryFn: () => getNamespace(session!, namespace),
    enabled: !!session && !!namespace,
  });
}

export function useDatasetsQuery(namespace: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["datasets", session?.catalogId, namespace],
    queryFn: () => listDatasets(session!, namespace),
    enabled: !!session && !!namespace,
  });
}

export function useDatasetQuery(namespace: string, dataset: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["dataset", session?.catalogId, namespace, dataset],
    queryFn: () => getDataset(session!, namespace, dataset),
    enabled: !!session && !!namespace && !!dataset,
  });
}

export function useSnapshotsQuery(namespace: string, dataset: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["snapshots", session?.catalogId, namespace, dataset],
    queryFn: () => listSnapshots(session!, namespace, dataset),
    enabled: !!session && !!namespace && !!dataset,
  });
}

// Shared by every page with a namespace -> dataset cascading picker
// (datasets, upload, delete, rollback, download).
export function useNamespaceDatasetOptions(namespace: string) {
  const namespacesQuery = useNamespacesQuery();
  const datasetsQuery = useDatasetsQuery(namespace);

  return {
    namespacesQuery,
    datasetsQuery,
    namespaceItems: namespacesQuery.data?.data.map((n) => n.name) ?? [],
    datasetItems: datasetsQuery.data?.datasets.map((d) => d.name) ?? [],
  };
}

"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, History, Trash2 } from "lucide-react";
import { AppCard } from "@/components/cards/AppCard";
import { CollapseToggle, CollapsibleBody, useCollapsible } from "@/components/cards/Collapsible";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExpandingIconButton } from "@/components/ExpandingIconButton";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useDatasetQuery, useSnapshotsQuery } from "@/hooks/useCatalog";
import { useToast } from "@/hooks/useToast";
import { deleteDataset, downloadDatasetData, restoreSnapshot } from "@/lib/api/datasets";
import { formatApiError, formatTimestampMs, saveBlob } from "@/lib/format";

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="shrink-0 font-semibold">{label}</dt>
      <dd
        className="min-w-0 truncate text-right text-muted-foreground"
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

interface DatasetsMetadataCardProps {
  namespace: string;
  dataset: string;
  onDeleted: () => void;
}

// Self-contained: its own dataset-info/snapshots queries (shared cache with
// DatasetsPreviewSchemaCard via the same query keys), its own delete and
// rollback confirm dialogs. Spawns as an independent sibling once a dataset
// is selected - not a child of the selection card.
export function DatasetsMetadataCard({ namespace, dataset, onDeleted }: DatasetsMetadataCardProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purge, setPurge] = useState(true);
  const [rollbackTarget, setRollbackTarget] = useState<number | null>(null);
  const { isCollapsed, toggle } = useCollapsible();

  const datasetInfoQuery = useDatasetQuery(namespace, dataset);
  const snapshotsQuery = useSnapshotsQuery(namespace, dataset);

  const deleteMutation = useMutation({
    mutationFn: () => deleteDataset(session!, namespace, dataset, purge),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["namespaces", session?.catalogId] });
      queryClient.invalidateQueries({ queryKey: ["datasets", session?.catalogId, namespace] });
      toast.success(result.message || `Dataset "${dataset}" deleted.`);
      setDeleteDialogOpen(false);
      onDeleted();
    },
  });

  const downloadMutation = useMutation({
    mutationFn: (snapshotId: number) =>
      downloadDatasetData(session!, namespace, dataset, snapshotId),
    onSuccess: (result) => {
      saveBlob(result.blob, result.filename);
      toast.success(`Downloaded ${result.filename}.`);
    },
    onError: (error) => {
      toast.error(formatApiError(error));
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: (snapshotId: number) => restoreSnapshot(session!, namespace, dataset, snapshotId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["dataset", session?.catalogId, namespace, dataset],
      });
      queryClient.invalidateQueries({
        queryKey: ["snapshots", session?.catalogId, namespace, dataset],
      });
      toast.success(result.message || "Rollback complete.");
      setRollbackTarget(null);
    },
  });

  return (
    <AppCard>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <PageHeader title="Metadata summary" />
          <div className="flex items-center gap-2">
            <ExpandingIconButton
              variant="destructive"
              icon={<Trash2 />}
              label="Delete dataset"
              onClick={() => setDeleteDialogOpen(true)}
            />
            <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} label="Metadata summary" />
          </div>
        </div>
      </CardHeader>
      <CollapsibleBody isCollapsed={isCollapsed}>
      <CardContent>
        {datasetInfoQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-5" />
            ))}
          </div>
        ) : datasetInfoQuery.isError ? (
          <p className="text-sm text-destructive">{formatApiError(datasetInfoQuery.error)}</p>
        ) : datasetInfoQuery.data ? (
          <div className="animate-in space-y-6 fade-in-0 duration-300">
            <div className="space-y-2">
              <InfoRow label="Location" value={datasetInfoQuery.data.location ?? "—"} />
              <InfoRow
                label="Total records"
                value={datasetInfoQuery.data.totalRecords.toLocaleString()}
              />
              <InfoRow label="Format" value={datasetInfoQuery.data.format} />
            </div>

            <div className="space-y-2 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Properties</p>
              {Object.keys(datasetInfoQuery.data.properties).length > 0 ? (
                Object.entries(datasetInfoQuery.data.properties).map(([key, value]) => (
                  <InfoRow key={key} label={key} value={value} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No properties were returned.</p>
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Snapshot history
              </p>
              {snapshotsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-16" />
                  ))}
                </div>
              ) : snapshotsQuery.data?.snapshots.length ? (
                <div className="space-y-3">
                  {snapshotsQuery.data.snapshots.map((snapshot) => (
                    <div
                      key={snapshot.snapshotId}
                      className="rounded-lg border bg-muted/30 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{snapshot.snapshotId}</p>
                            {snapshot.isCurrent ? <Badge>Current</Badge> : null}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {snapshot.operation ?? "unknown"} ·{" "}
                            {formatTimestampMs(snapshot.timestampMs)}
                            {snapshot.parentId !== null ? ` · parent ${snapshot.parentId}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ExpandingIconButton
                            variant="outline"
                            size="sm"
                            icon={<Download />}
                            label={
                              downloadMutation.isPending &&
                              downloadMutation.variables === snapshot.snapshotId
                                ? "Downloading…"
                                : "Download"
                            }
                            onClick={() => downloadMutation.mutate(snapshot.snapshotId)}
                            disabled={
                              downloadMutation.isPending &&
                              downloadMutation.variables === snapshot.snapshotId
                            }
                          />
                          {!snapshot.isCurrent ? (
                            <ExpandingIconButton
                              variant="outline"
                              size="sm"
                              icon={<History />}
                              label="Rollback to this"
                              onClick={() => setRollbackTarget(snapshot.snapshotId)}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No snapshots were returned for this dataset.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
      </CollapsibleBody>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Delete ${namespace}.${dataset}`}
        description={
          datasetInfoQuery.data
            ? `${datasetInfoQuery.data.totalRecords.toLocaleString()} record(s) in this dataset.`
            : undefined
        }
        warning="Deletion is irreversible. The backend is the source of truth for whether this dataset can be removed."
        acknowledgement="I understand this permanently deletes this dataset and, unless purge is disabled, its underlying data."
        confirmLabel="Delete dataset"
        pendingLabel="Deleting…"
        isPending={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={() => deleteMutation.mutate()}
      >
        <label className="flex items-start gap-3 rounded-2xl border bg-muted/30 px-4 py-3">
          <Checkbox checked={purge} onCheckedChange={(checked) => setPurge(checked === true)} />
          <div>
            <p className="text-sm font-medium">Purge data files</p>
            <p className="text-sm text-muted-foreground">
              Disable to remove only the catalog metadata and keep the underlying files.
            </p>
          </div>
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={rollbackTarget !== null}
        onOpenChange={(next) => !next && setRollbackTarget(null)}
        title={`Rollback to snapshot ${rollbackTarget ?? ""}`}
        description="Restoring sets the current snapshot back to the selected one."
        warning="Rollback is a state-changing operation. Double-check the snapshot before confirming."
        acknowledgement="I understand this will change the current dataset state."
        confirmLabel="Rollback dataset"
        pendingLabel="Rolling back…"
        isPending={rollbackMutation.isPending}
        error={rollbackMutation.error}
        onConfirm={() => rollbackTarget !== null && rollbackMutation.mutate(rollbackTarget)}
      />
    </AppCard>
  );
}

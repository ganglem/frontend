"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { SimpleSelect } from "@/components/SimpleSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useDatasetQuery, useNamespaceDatasetOptions, useSnapshotsQuery } from "@/hooks/useCatalog";
import { previewDatasetData } from "@/lib/api/datasets";
import { formatApiError, formatTimestampMs } from "@/lib/format";

export default function DatasetsPage() {
  const { session } = useAuth();
  const [namespace, setNamespace] = useState("");
  const [dataset, setDataset] = useState("");
  const [previewSnapshot, setPreviewSnapshot] = useState("latest");
  const [previewLimit, setPreviewLimit] = useState(10);

  const { namespacesQuery, datasetsQuery, namespaceItems, datasetItems } =
    useNamespaceDatasetOptions(namespace);
  const datasetInfoQuery = useDatasetQuery(namespace, dataset);
  const snapshotsQuery = useSnapshotsQuery(namespace, dataset);

  const previewMutation = useMutation({
    mutationFn: () =>
      previewDatasetData(session!, namespace, dataset, {
        limit: previewLimit,
        snapshotId: previewSnapshot === "latest" ? undefined : Number(previewSnapshot),
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Inspection" title="Datasets" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dataset selection</CardTitle>
            <CardDescription>
              Choose a namespace and dataset to load schema, snapshots, properties, and a preview.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="datasets-namespace">Namespace</Label>
              <div className="mt-1.5">
                <SimpleSelect
                  id="datasets-namespace"
                  value={namespace}
                  onValueChange={(value) => {
                    setNamespace(value);
                    setDataset("");
                    setPreviewSnapshot("latest");
                  }}
                  items={namespaceItems}
                  placeholder="Select a namespace"
                  isLoading={namespacesQuery.isLoading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="datasets-dataset">Dataset</Label>
              <div className="mt-1.5">
                <SimpleSelect
                  id="datasets-dataset"
                  value={dataset}
                  onValueChange={(value) => {
                    setDataset(value);
                    setPreviewSnapshot("latest");
                  }}
                  items={datasetItems}
                  placeholder={namespace ? "Select a dataset" : "Select a namespace first"}
                  isLoading={datasetsQuery.isLoading}
                  disabled={!namespace}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Metadata summary</CardTitle>
                <CardDescription>From the dataset&apos;s info response.</CardDescription>
              </div>
              {snapshotsQuery.data ? (
                <Badge variant="secondary">{snapshotsQuery.data.snapshots.length} snapshots</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {!namespace || !dataset ? (
              <p className="text-sm text-muted-foreground">
                Select a namespace and dataset to load metadata.
              </p>
            ) : datasetInfoQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading dataset info…</p>
            ) : datasetInfoQuery.isError ? (
              <p className="text-sm text-destructive">{formatApiError(datasetInfoQuery.error)}</p>
            ) : datasetInfoQuery.data ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 px-4 py-3">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">
                    Location
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium break-all">
                    {datasetInfoQuery.data.location ?? "—"}
                  </dd>
                </div>
                <div className="rounded-lg border bg-muted/30 px-4 py-3">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">
                    Current snapshot
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium">
                    {datasetInfoQuery.data.currentSnapshotId ?? "Unavailable"}
                  </dd>
                </div>
                <div className="rounded-lg border bg-muted/30 px-4 py-3">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">
                    Total records
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium">
                    {datasetInfoQuery.data.totalRecords.toLocaleString()}
                  </dd>
                </div>
                <div className="rounded-lg border bg-muted/30 px-4 py-3">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">
                    Format
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium">{datasetInfoQuery.data.format}</dd>
                </div>
              </dl>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preview rows</CardTitle>
          <CardDescription>
            Load the current snapshot by default, or pick a specific one from the history below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!datasetInfoQuery.data ? (
            <p className="text-sm text-muted-foreground">
              Select a dataset to load a preview.
            </p>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-[1fr_160px_auto]">
                <div>
                  <Label htmlFor="preview-snapshot">Snapshot</Label>
                  <div className="mt-1.5">
                    <Select
                      value={previewSnapshot}
                      onValueChange={(value) => setPreviewSnapshot(value ?? "latest")}
                    >
                      <SelectTrigger id="preview-snapshot" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="latest">Current snapshot</SelectItem>
                        {snapshotsQuery.data?.snapshots.map((snapshot) => (
                          <SelectItem key={snapshot.snapshotId} value={String(snapshot.snapshotId)}>
                            {snapshot.snapshotId} {snapshot.isCurrent ? "(current)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="preview-limit">Rows</Label>
                  <Input
                    id="preview-limit"
                    type="number"
                    min={1}
                    max={1000}
                    className="mt-1.5"
                    value={previewLimit}
                    onChange={(event) => setPreviewLimit(Number(event.target.value) || 1)}
                  />
                </div>

                <div className="lg:self-end">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => previewMutation.mutate()}
                    disabled={previewMutation.isPending || !session}
                  >
                    {previewMutation.isPending ? "Loading…" : "Load preview"}
                  </Button>
                </div>
              </div>

              {previewMutation.isError ? (
                <p className="text-sm text-destructive">{formatApiError(previewMutation.error)}</p>
              ) : null}

              {previewMutation.data ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Previewing snapshot <code>{previewMutation.data.snapshotId ?? "latest"}</code>{" "}
                    with up to {previewMutation.data.limit} rows.
                  </p>
                  <DataTable
                    rows={previewMutation.data.rows}
                    emptyMessage="No preview rows were returned for this snapshot."
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No preview has been loaded yet for this dataset.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Snapshot history</CardTitle>
            <CardDescription>
              Use these IDs for previews, downloads, or rollback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!dataset ? (
              <p className="text-sm text-muted-foreground">
                Snapshot history appears after a dataset is selected.
              </p>
            ) : snapshotsQuery.data?.snapshots.length ? (
              <div className="space-y-3">
                {snapshotsQuery.data.snapshots.map((snapshot) => (
                  <div key={snapshot.snapshotId} className="rounded-lg border bg-muted/30 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{snapshot.snapshotId}</p>
                      {snapshot.isCurrent ? <Badge>Current</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {snapshot.operation ?? "unknown"} · {formatTimestampMs(snapshot.timestampMs)}
                      {snapshot.parentId !== null ? ` · parent ${snapshot.parentId}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No snapshots were returned for this dataset.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
            <CardDescription>Raw dataset properties from the backend response.</CardDescription>
          </CardHeader>
          <CardContent>
            {datasetInfoQuery.data ? (
              Object.keys(datasetInfoQuery.data.properties).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(datasetInfoQuery.data.properties).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between gap-4 text-sm">
                      <dt className="text-muted-foreground">{key}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No properties were returned.</p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                Properties will appear once dataset metadata is loaded.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schema</CardTitle>
          <CardDescription>
            Column names, types, required flags, and docs from the API response.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {datasetInfoQuery.data ? (
            datasetInfoQuery.data.schema.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Doc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasetInfoQuery.data.schema.map((field) => (
                    <TableRow key={field.name}>
                      <TableCell className="font-medium">{field.name}</TableCell>
                      <TableCell>
                        <code className="text-xs">{field.type}</code>
                      </TableCell>
                      <TableCell>{field.required ? "true" : "false"}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {field.doc ?? "No column doc returned."}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No schema columns were returned.</p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Select a dataset to inspect its schema.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FieldMessage } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { SimpleSelect } from "@/components/SimpleSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useDatasetQuery, useNamespaceDatasetOptions, useSnapshotsQuery } from "@/hooks/useCatalog";
import { downloadDatasetData } from "@/lib/api/datasets";
import { formatApiError, formatTimestampMs } from "@/lib/format";

function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
}

interface DownloadSummary {
  filename: string;
  target: string;
  snapshotLabel: string;
}

const downloadSchema = z
  .object({
    namespace: z.string().min(1, "Choose a namespace."),
    dataset: z.string().min(1, "Choose a dataset."),
    snapshotMode: z.enum(["latest", "specific"]),
    snapshotId: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.snapshotMode === "specific" && !value.snapshotId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["snapshotId"],
        message: "Choose a snapshot.",
      });
    }
  });

type DownloadValues = z.infer<typeof downloadSchema>;

export default function DownloadPage() {
  const { session } = useAuth();
  const [lastDownload, setLastDownload] = useState<DownloadSummary | null>(null);

  const form = useForm<DownloadValues>({
    resolver: zodResolver(downloadSchema),
    defaultValues: {
      namespace: "",
      dataset: "",
      snapshotMode: "latest",
      snapshotId: "",
    },
  });

  const namespace = form.watch("namespace");
  const dataset = form.watch("dataset");
  const snapshotMode = form.watch("snapshotMode");
  const { namespacesQuery, datasetsQuery, namespaceItems, datasetItems } =
    useNamespaceDatasetOptions(namespace);
  const datasetInfoQuery = useDatasetQuery(namespace, dataset);
  const snapshotsQuery = useSnapshotsQuery(namespace, dataset);

  useEffect(() => {
    form.setValue("dataset", "");
    form.setValue("snapshotMode", "latest");
    form.setValue("snapshotId", "");
  }, [form, namespace]);

  useEffect(() => {
    form.setValue("snapshotMode", "latest");
    form.setValue("snapshotId", "");
  }, [form, dataset]);

  const downloadMutation = useMutation({
    mutationFn: (values: DownloadValues) =>
      downloadDatasetData(
        session!,
        values.namespace,
        values.dataset,
        values.snapshotMode === "specific" && values.snapshotId
          ? Number(values.snapshotId)
          : undefined,
      ),
    onSuccess: (result, values) => {
      saveBlob(result.blob, result.filename);
      setLastDownload({
        filename: result.filename,
        target: `${values.namespace}.${values.dataset}`,
        snapshotLabel:
          values.snapshotMode === "specific" ? `snapshot ${values.snapshotId}` : "current snapshot",
      });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Export" title="Download Parquet" />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Download request</CardTitle>
            <CardDescription>
              Metadata loads automatically so you can export the current snapshot or a specific
              one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit((values) => downloadMutation.mutate(values))}
            >
              <div>
                <Label htmlFor="download-namespace">Namespace</Label>
                <div className="mt-1.5">
                  <Controller
                    control={form.control}
                    name="namespace"
                    render={({ field }) => (
                      <SimpleSelect
                        id="download-namespace"
                        value={field.value}
                        onValueChange={field.onChange}
                        items={namespaceItems}
                        placeholder="Select a namespace"
                        isLoading={namespacesQuery.isLoading}
                      />
                    )}
                  />
                </div>
                <FieldMessage tone="danger">{form.formState.errors.namespace?.message}</FieldMessage>
              </div>

              <div>
                <Label htmlFor="download-dataset">Dataset</Label>
                <div className="mt-1.5">
                  <Controller
                    control={form.control}
                    name="dataset"
                    render={({ field }) => (
                      <SimpleSelect
                        id="download-dataset"
                        value={field.value}
                        onValueChange={field.onChange}
                        items={datasetItems}
                        placeholder={namespace ? "Select a dataset" : "Select a namespace first"}
                        isLoading={datasetsQuery.isLoading}
                        disabled={!namespace}
                      />
                    )}
                  />
                </div>
                <FieldMessage tone="danger">{form.formState.errors.dataset?.message}</FieldMessage>
              </div>

              <div>
                <Label htmlFor="download-snapshot-mode">Snapshot selection</Label>
                <div className="mt-1.5">
                  <Controller
                    control={form.control}
                    name="snapshotMode"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="download-snapshot-mode" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="latest">Current snapshot</SelectItem>
                          <SelectItem value="specific">Specific snapshot</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {snapshotMode === "specific" ? (
                <div>
                  <Label htmlFor="download-snapshot-id">Snapshot ID</Label>
                  <div className="mt-1.5">
                    <Controller
                      control={form.control}
                      name="snapshotId"
                      render={({ field }) => (
                        <Select
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                          disabled={!dataset || snapshotsQuery.isLoading}
                        >
                          <SelectTrigger id="download-snapshot-id" className="w-full">
                            <SelectValue
                              placeholder={
                                !dataset
                                  ? "Select a dataset first"
                                  : snapshotsQuery.isLoading
                                    ? "Loading snapshots…"
                                    : "Select a snapshot"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {snapshotsQuery.data?.snapshots.map((snapshot) => (
                              <SelectItem
                                key={snapshot.snapshotId}
                                value={String(snapshot.snapshotId)}
                              >
                                {snapshot.snapshotId} {snapshot.isCurrent ? "(current)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <FieldMessage tone="danger">
                    {form.formState.errors.snapshotId?.message}
                  </FieldMessage>
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={downloadMutation.isPending || !session}
              >
                {downloadMutation.isPending ? "Preparing download…" : "Download parquet"}
              </Button>

              {downloadMutation.isError ? (
                <p className="text-sm text-destructive">{formatApiError(downloadMutation.error)}</p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Snapshot overview</CardTitle>
                  <CardDescription>Available snapshots for the selected dataset.</CardDescription>
                </div>
                {snapshotsQuery.data ? (
                  <Badge variant="secondary">
                    {snapshotsQuery.data.snapshots.length} snapshots
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {!namespace || !dataset ? (
                <p className="text-sm text-muted-foreground">
                  Select a namespace and dataset to load snapshot metadata.
                </p>
              ) : datasetInfoQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading snapshot metadata…</p>
              ) : datasetInfoQuery.isError ? (
                <p className="text-sm text-destructive">{formatApiError(datasetInfoQuery.error)}</p>
              ) : datasetInfoQuery.data ? (
                <div className="space-y-4">
                  <dl className="grid gap-3 sm:grid-cols-2">
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
                  </dl>

                  {snapshotsQuery.data?.snapshots.length ? (
                    <div className="space-y-3">
                      {snapshotsQuery.data.snapshots.map((snapshot) => (
                        <div
                          key={snapshot.snapshotId}
                          className="rounded-lg border bg-muted/30 px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">{snapshot.snapshotId}</p>
                            {snapshot.isCurrent ? <Badge>Current</Badge> : null}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatTimestampMs(snapshot.timestampMs)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No snapshots were returned for this dataset.
                    </p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Last download</CardTitle>
              <CardDescription>
                The browser save dialog appears as soon as the file is ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lastDownload ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
                  Saved <strong>{lastDownload.filename}</strong> for{" "}
                  <strong>{lastDownload.target}</strong> using {lastDownload.snapshotLabel}.
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No parquet export has been triggered yet in this session.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

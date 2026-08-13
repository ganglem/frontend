"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FieldMessage } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { SimpleSelect } from "@/components/SimpleSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useNamespaceDatasetOptions, useSnapshotsQuery } from "@/hooks/useCatalog";
import { restoreSnapshot } from "@/lib/api/datasets";
import { formatApiError, formatTimestampMs } from "@/lib/format";

const rollbackSchema = z.object({
  namespace: z.string().min(1, "Choose a namespace."),
  dataset: z.string().min(1, "Choose a dataset."),
  snapshotId: z.string().min(1, "Choose a snapshot."),
  confirmRollback: z.boolean().refine((value) => value, {
    message: "Confirm that you understand this changes the current dataset state.",
  }),
});

type RollbackValues = z.infer<typeof rollbackSchema>;

export default function RollbackPage() {
  const { session } = useAuth();
  const form = useForm<RollbackValues>({
    resolver: zodResolver(rollbackSchema),
    defaultValues: {
      namespace: "",
      dataset: "",
      snapshotId: "",
      confirmRollback: false,
    },
  });

  const namespace = form.watch("namespace");
  const dataset = form.watch("dataset");
  const { namespacesQuery, datasetsQuery, namespaceItems, datasetItems } =
    useNamespaceDatasetOptions(namespace);
  const snapshotsQuery = useSnapshotsQuery(namespace, dataset);

  useEffect(() => {
    form.setValue("dataset", "");
    form.setValue("snapshotId", "");
  }, [form, namespace]);

  useEffect(() => {
    form.setValue("snapshotId", "");
  }, [form, dataset]);

  const rollbackMutation = useMutation({
    mutationFn: (values: RollbackValues) =>
      restoreSnapshot(session!, values.namespace, values.dataset, Number(values.snapshotId)),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Recovery" title="Snapshot Rollback" />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Rollback request</CardTitle>
            <CardDescription>
              Pick a snapshot from the dataset&apos;s actual history - restoring sets the current
              snapshot back to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit((values) => rollbackMutation.mutate(values))}
            >
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                Rollback is a state-changing operation. Double-check the snapshot before
                confirming.
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="rollback-namespace">Namespace</Label>
                  <div className="mt-1.5">
                    <Controller
                      control={form.control}
                      name="namespace"
                      render={({ field }) => (
                        <SimpleSelect
                          id="rollback-namespace"
                          value={field.value}
                          onValueChange={field.onChange}
                          items={namespaceItems}
                          placeholder="Select a namespace"
                          isLoading={namespacesQuery.isLoading}
                        />
                      )}
                    />
                  </div>
                  <FieldMessage tone="danger">
                    {form.formState.errors.namespace?.message}
                  </FieldMessage>
                </div>

                <div>
                  <Label htmlFor="rollback-dataset">Dataset</Label>
                  <div className="mt-1.5">
                    <Controller
                      control={form.control}
                      name="dataset"
                      render={({ field }) => (
                        <SimpleSelect
                          id="rollback-dataset"
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
              </div>

              <div>
                <Label htmlFor="rollback-snapshot">Snapshot</Label>
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
                        <SelectTrigger id="rollback-snapshot" className="w-full">
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
                              {snapshot.snapshotId} · {snapshot.operation ?? "unknown"} ·{" "}
                              {formatTimestampMs(snapshot.timestampMs)}
                              {snapshot.isCurrent ? " (current)" : ""}
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

              <label className="flex items-start gap-3 rounded-2xl border bg-muted/30 px-4 py-4">
                <Controller
                  control={form.control}
                  name="confirmRollback"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <div>
                  <p className="text-sm font-medium">
                    I understand this will change the current dataset state.
                  </p>
                </div>
              </label>
              <FieldMessage tone="danger">
                {form.formState.errors.confirmRollback?.message}
              </FieldMessage>

              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={rollbackMutation.isPending || !session}
              >
                {rollbackMutation.isPending ? "Rolling back…" : "Rollback dataset"}
              </Button>

              <FieldMessage tone="danger">
                {rollbackMutation.isError ? formatApiError(rollbackMutation.error) : undefined}
              </FieldMessage>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last rollback response</CardTitle>
            <CardDescription>Backend confirmation appears here after a request.</CardDescription>
          </CardHeader>
          <CardContent>
            {rollbackMutation.data ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
                  {rollbackMutation.data.message}
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 px-4 py-3">
                    <dt className="text-xs font-semibold text-muted-foreground uppercase">
                      Previous snapshot
                    </dt>
                    <dd className="mt-1.5 font-medium">
                      {rollbackMutation.data.previousSnapshotId ?? "—"}
                    </dd>
                  </div>
                  <div className="rounded-lg border bg-muted/30 px-4 py-3">
                    <dt className="text-xs font-semibold text-muted-foreground uppercase">
                      Current snapshot
                    </dt>
                    <dd className="mt-1.5 font-medium">
                      {rollbackMutation.data.currentSnapshotId ?? "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No rollback has been performed yet in this session.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

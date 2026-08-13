"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useNamespaceDatasetOptions } from "@/hooks/useCatalog";
import { deleteDataset } from "@/lib/api/datasets";
import { deleteNamespace } from "@/lib/api/namespaces";
import { formatApiError } from "@/lib/format";
import type { DatasetDeleteResponse, NamespaceDeleteResponse } from "@/types/api";

const deleteSchema = z
  .object({
    targetType: z.enum(["dataset", "namespace"]),
    namespace: z.string().min(1, "Choose a namespace."),
    dataset: z.string().optional(),
    purge: z.boolean(),
    force: z.boolean(),
    confirmDelete: z.boolean().refine((value) => value, {
      message: "Confirm that you understand this permanently deletes data.",
    }),
  })
  .superRefine((value, context) => {
    if (value.targetType === "dataset" && !value.dataset) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["dataset"], message: "Choose a dataset." });
    }
  });

type DeleteValues = z.infer<typeof deleteSchema>;
type DeleteResult = DatasetDeleteResponse | NamespaceDeleteResponse;

export default function DeletePage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const form = useForm<DeleteValues>({
    resolver: zodResolver(deleteSchema),
    defaultValues: {
      targetType: "dataset",
      namespace: "",
      dataset: "",
      purge: true,
      force: false,
      confirmDelete: false,
    },
  });

  const targetType = form.watch("targetType");
  const namespace = form.watch("namespace");
  const { namespacesQuery, datasetsQuery, namespaceItems, datasetItems } =
    useNamespaceDatasetOptions(namespace);

  useEffect(() => {
    form.setValue("dataset", "");
  }, [form, namespace]);

  const deleteMutation = useMutation<DeleteResult, Error, DeleteValues>({
    mutationFn: (values) => {
      if (values.targetType === "namespace") {
        return deleteNamespace(session!, values.namespace, values.force);
      }

      return deleteDataset(session!, values.namespace, values.dataset ?? "", values.purge);
    },
    onSuccess: async (_, values) => {
      await queryClient.invalidateQueries({ queryKey: ["namespaces", session?.catalogId] });
      await queryClient.invalidateQueries({
        queryKey: ["datasets", session?.catalogId, values.namespace],
      });

      form.reset({
        targetType: values.targetType,
        namespace: "",
        dataset: "",
        purge: true,
        force: false,
        confirmDelete: false,
      });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Cleanup" title="Delete Data" />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Delete request</CardTitle>
            <CardDescription>
              Dataset deletes purge data files by default. Namespace deletes require the namespace
              to be empty unless force is enabled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit((values) => deleteMutation.mutate(values))}
            >
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                Deletion is irreversible. The backend is the source of truth for whether a target
                can be removed.
              </div>

              <div>
                <Label htmlFor="delete-target-type">Delete target</Label>
                <div className="mt-1.5">
                  <Controller
                    control={form.control}
                    name="targetType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="delete-target-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dataset">Dataset</SelectItem>
                          <SelectItem value="namespace">Namespace</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="delete-namespace">Namespace</Label>
                <div className="mt-1.5">
                  <Controller
                    control={form.control}
                    name="namespace"
                    render={({ field }) => (
                      <SimpleSelect
                        id="delete-namespace"
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

              {targetType === "dataset" ? (
                <>
                  <div>
                    <Label htmlFor="delete-dataset">Dataset</Label>
                    <div className="mt-1.5">
                      <Controller
                        control={form.control}
                        name="dataset"
                        render={({ field }) => (
                          <SimpleSelect
                            id="delete-dataset"
                            value={field.value ?? ""}
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

                  <label className="flex items-start gap-3 rounded-2xl border bg-muted/30 px-4 py-3">
                    <Controller
                      control={form.control}
                      name="purge"
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium">Purge data files</p>
                      <p className="text-sm text-muted-foreground">
                        Disable to remove only the catalog metadata and keep the underlying files.
                      </p>
                    </div>
                  </label>
                </>
              ) : (
                <label className="flex items-start gap-3 rounded-2xl border bg-muted/30 px-4 py-3">
                  <Controller
                    control={form.control}
                    name="force"
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">Force namespace delete</p>
                    <p className="text-sm text-muted-foreground">
                      When enabled, all datasets in the namespace are deleted first.
                    </p>
                  </div>
                </label>
              )}

              <label className="flex items-start gap-3 rounded-2xl border bg-muted/30 px-4 py-4">
                <Controller
                  control={form.control}
                  name="confirmDelete"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <p className="text-sm font-medium">
                  I understand this permanently deletes catalog objects and underlying data.
                </p>
              </label>
              <FieldMessage tone="danger">
                {form.formState.errors.confirmDelete?.message}
              </FieldMessage>

              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={deleteMutation.isPending || !session}
              >
                {deleteMutation.isPending
                  ? "Deleting…"
                  : targetType === "namespace"
                    ? "Delete namespace"
                    : "Delete dataset"}
              </Button>

              <FieldMessage tone="danger">
                {deleteMutation.isError ? formatApiError(deleteMutation.error) : undefined}
              </FieldMessage>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last delete response</CardTitle>
            <CardDescription>Successful responses from the backend appear here.</CardDescription>
          </CardHeader>
          <CardContent>
            {deleteMutation.data ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
                  {deleteMutation.data.message}
                </div>
                {"deleted_tables" in deleteMutation.data && deleteMutation.data.deleted_tables ? (
                  <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                    Deleted datasets: {deleteMutation.data.deleted_tables.join(", ")}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No delete request has been submitted yet in this session.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FieldMessage } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { SimpleSelect } from "@/components/SimpleSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useNamespaceDatasetOptions } from "@/hooks/useCatalog";
import { appendDatasetData, createDataset, overwriteDatasetData } from "@/lib/api/datasets";
import { deriveDatasetName, formatApiError, formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";

const uploadSchema = z.object({
  namespace: z.string().min(1, "Choose a namespace."),
  datasetName: z.string().min(1, "Enter a dataset name."),
  description: z.string().max(500).optional(),
  overwrite: z.boolean(),
});

type UploadValues = z.infer<typeof uploadSchema>;

export default function UploadPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

  const form = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      namespace: "",
      datasetName: "",
      description: "",
      overwrite: false,
    },
  });

  const namespace = form.watch("namespace");
  const datasetName = form.watch("datasetName");
  const { namespacesQuery, datasetsQuery, namespaceItems } = useNamespaceDatasetOptions(namespace);
  const existingNames = useMemo(
    () => new Set(datasetsQuery.data?.datasets.map((dataset) => dataset.name) ?? []),
    [datasetsQuery.data],
  );
  const datasetExists = existingNames.has(datasetName);

  const uploadMutation = useMutation({
    mutationFn: async (values: UploadValues) => {
      if (!selectedFile) {
        throw new Error("Select a parquet file before uploading.");
      }

      if (!existingNames.has(values.datasetName)) {
        const result = await createDataset(session!, values.namespace, {
          name: values.datasetName,
          description: values.description,
          file: selectedFile,
        });

        return { kind: "created" as const, result };
      }

      const result = values.overwrite
        ? await overwriteDatasetData(session!, values.namespace, values.datasetName, selectedFile)
        : await appendDatasetData(
            session!,
            values.namespace,
            values.datasetName,
            selectedFile,
            false,
          );

      return { kind: "written" as const, result };
    },
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({
        queryKey: ["datasets", session?.catalogId, values.namespace],
      });
    },
  });

  const dropzone = useDropzone({
    multiple: false,
    noClick: true,
    accept: {
      "application/octet-stream": [".parquet"],
      "application/vnd.apache.parquet": [".parquet"],
    },
    onDropAccepted: (files) => {
      const file = files[0];

      if (!file) {
        return;
      }

      setDropError(null);
      setSelectedFile(file);

      if (!form.getValues("datasetName")) {
        form.setValue("datasetName", deriveDatasetName(file.name), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
    onDropRejected: () => {
      setDropError("Please drop exactly one .parquet file.");
    },
  });

  const { getRootProps, getInputProps, isDragActive, open } = dropzone;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Ingestion" title="Data Upload" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload configuration</CardTitle>
            <CardDescription>
              A new dataset name creates a dataset from this file. An existing name appends by
              default, or overwrites if selected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit((values) => uploadMutation.mutate(values))}
            >
              <div>
                <Label htmlFor="namespace">Namespace</Label>
                <div className="mt-1.5">
                  <Controller
                    control={form.control}
                    name="namespace"
                    render={({ field }) => (
                      <SimpleSelect
                        id="namespace"
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("datasetName", "");
                        }}
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
                <Label>File</Label>
                <div
                  {...getRootProps()}
                  className={cn(
                    "mt-1.5 rounded-2xl border border-dashed px-5 py-8 transition",
                    isDragActive ? "border-primary bg-primary/5" : "border-border bg-muted/30",
                  )}
                >
                  <input {...getInputProps()} />
                  <p className="text-sm font-semibold">
                    {selectedFile ? selectedFile.name : "Drop a parquet file here"}
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {selectedFile
                      ? `${formatFileSize(selectedFile.size)} selected.`
                      : "Drag and drop one file to auto-fill the dataset name."}
                  </p>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={open}>
                    Browse file
                  </Button>
                </div>
                <FieldMessage tone="danger">{dropError}</FieldMessage>
              </div>

              <div>
                <Label htmlFor="datasetName">Dataset name</Label>
                <Input
                  id="datasetName"
                  className="mt-1.5"
                  placeholder="derived_from_filename"
                  {...form.register("datasetName")}
                />
                <FieldMessage tone="danger">
                  {form.formState.errors.datasetName?.message}
                </FieldMessage>
                <FieldMessage>
                  {namespace && datasetName
                    ? datasetExists
                      ? "Existing dataset - this will append or overwrite its data."
                      : "New dataset - a description can be added below."
                    : undefined}
                </FieldMessage>
              </div>

              {!datasetExists ? (
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    className="mt-1.5"
                    placeholder="What this dataset contains"
                    {...form.register("description")}
                  />
                </div>
              ) : (
                <label className="flex items-start gap-3 rounded-2xl border bg-muted/30 px-4 py-3">
                  <Controller
                    control={form.control}
                    name="overwrite"
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">Overwrite existing data</p>
                    <p className="text-sm text-muted-foreground">
                      Keep disabled to append rows instead of replacing the dataset.
                    </p>
                  </div>
                </label>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={uploadMutation.isPending || !selectedFile || !session}
              >
                {uploadMutation.isPending ? "Uploading…" : "Upload"}
              </Button>

              <FieldMessage tone="danger">
                {uploadMutation.isError ? formatApiError(uploadMutation.error) : undefined}
              </FieldMessage>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last upload result</CardTitle>
            <CardDescription>
              Creating a dataset returns its metadata; appending or overwriting returns a row
              count.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadMutation.data?.kind === "written" ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
                <strong>{uploadMutation.data.result.rowsWritten}</strong> rows written.{" "}
                {uploadMutation.data.result.message}
              </div>
            ) : uploadMutation.data?.kind === "created" ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
                Dataset <strong>{uploadMutation.data.result.name}</strong> created with{" "}
                {uploadMutation.data.result.schema.length} columns.
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upload has been submitted yet in this session.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

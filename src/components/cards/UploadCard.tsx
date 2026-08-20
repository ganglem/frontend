"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { FolderOpen, Sparkles, Upload as UploadIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AppCard } from "@/components/cards/AppCard";
import { CollapseToggle, CollapsibleBody, useCollapsible } from "@/components/cards/Collapsible";
import { EditableText } from "@/components/EditableText";
import { ExpandingIconButton } from "@/components/ExpandingIconButton";
import { FieldMessage } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { SimpleSelect } from "@/components/SimpleSelect";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useNamespaceDatasetOptions } from "@/hooks/useCatalog";
import { useToast } from "@/hooks/useToast";
import { isNoAuthMode } from "@/lib/api/client";
import { appendDatasetData, createDataset, overwriteDatasetData } from "@/lib/api/datasets";
import { deriveDatasetName, formatApiError } from "@/lib/format";
import { cn } from "@/lib/utils";

const uploadSchema = z.object({
  namespace: z.string().min(1, "Choose a namespace."),
  datasetName: z.string().min(1, "Enter a dataset name."),
  description: z.string().max(500).optional(),
  overwrite: z.boolean(),
});

type UploadValues = z.infer<typeof uploadSchema>;

function createSampleFile() {
  return new File(
    [new Blob(["mock parquet payload — dev:noauth sample upload"], { type: "application/octet-stream" })],
    `sample_upload_${Date.now()}.parquet`,
    { type: "application/octet-stream" },
  );
}

// Fully self-contained: namespace/file selection through to submit. Reused
// as-is on the Upload page and inside the Overview bento grid.
export function UploadCard() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
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
  const description = form.watch("description");
  const { namespacesQuery, datasetsQuery, namespaceItems } = useNamespaceDatasetOptions(namespace);
  const existingNames = useMemo(
    () => new Set(datasetsQuery.data?.datasets.map((dataset) => dataset.name) ?? []),
    [datasetsQuery.data],
  );
  const datasetExists = existingNames.has(datasetName);

  function acceptFile(file: File) {
    setDropError(null);
    setSelectedFile(file);

    if (!form.getValues("datasetName")) {
      form.setValue("datasetName", deriveDatasetName(file.name), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

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
    onSuccess: (result, values) => {
      queryClient.invalidateQueries({
        queryKey: ["datasets", session?.catalogId, values.namespace],
      });

      toast.success(
        result.kind === "created"
          ? `Dataset "${result.result.name}" created with ${result.result.schema.length} columns.`
          : `${result.result.rowsWritten} rows written. ${result.result.message}`,
      );
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

      if (file) {
        acceptFile(file);
      }
    },
    onDropRejected: () => {
      setDropError("Please drop exactly one .parquet file.");
    },
  });

  const { getRootProps, getInputProps, isDragActive, open } = dropzone;
  const { isCollapsed, toggle } = useCollapsible();

  return (
    <AppCard>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {selectedFile ? (
              <div className="space-y-1.5">
                <CardTitle>
                  <EditableText
                    value={datasetName}
                    onCommit={(next) =>
                      form.setValue("datasetName", next, { shouldDirty: true, shouldValidate: true })
                    }
                    placeholder="dataset_name"
                    className="font-heading text-2xl font-medium tracking-tight"
                    displayClassName="font-heading text-2xl font-medium tracking-tight"
                  />
                </CardTitle>
                <CardDescription>
                  <EditableText
                    value={description ?? ""}
                    onCommit={(next) => form.setValue("description", next, { shouldDirty: true })}
                    placeholder="Add a description (optional)"
                    multiline
                  />
                </CardDescription>
                <FieldMessage tone="danger">{form.formState.errors.datasetName?.message}</FieldMessage>
              </div>
            ) : (
              <PageHeader title="Data Upload" />
            )}
          </div>
          <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} label="Data Upload" />
        </div>
      </CardHeader>

      <CollapsibleBody isCollapsed={isCollapsed}>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit((values) => uploadMutation.mutate(values))}
        >
          <div>
            <Controller
              control={form.control}
              name="namespace"
              render={({ field }) => (
                <SimpleSelect
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
            <FieldMessage tone="danger">{form.formState.errors.namespace?.message}</FieldMessage>
          </div>

          {namespace ? (
            <div className="animate-in space-y-5 fade-in-0 zoom-in-95 duration-300 ease-bounce">
              <div
                {...getRootProps()}
                className={cn(
                  "rounded-2xl border border-dashed px-5 py-8 transition",
                  isDragActive ? "border-primary bg-primary/5" : "border-border bg-muted/30",
                )}
              >
                <input {...getInputProps()} />
                <p className="text-sm font-semibold">
                  {selectedFile ? selectedFile.name : "Drop a parquet file here"}
                </p>
                <div className="mt-3 flex gap-2">
                  <ExpandingIconButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<FolderOpen />}
                    label="Browse file"
                    onClick={open}
                  />
                  {isNoAuthMode() ? (
                    <ExpandingIconButton
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={<Sparkles />}
                      label="Use sample file"
                      onClick={() => acceptFile(createSampleFile())}
                    />
                  ) : null}
                </div>
              </div>
              <FieldMessage tone="danger">{dropError}</FieldMessage>

              {datasetExists ? (
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
              ) : null}

              <div className="flex justify-end">
                <ExpandingIconButton
                  type="submit"
                  icon={<UploadIcon />}
                  label={uploadMutation.isPending ? "Uploading…" : "Upload"}
                  disabled={uploadMutation.isPending || !selectedFile || !session}
                />
              </div>

              <FieldMessage tone="danger">
                {uploadMutation.isError ? formatApiError(uploadMutation.error) : undefined}
              </FieldMessage>
            </div>
          ) : null}
        </form>
      </CardContent>
      </CollapsibleBody>
    </AppCard>
  );
}

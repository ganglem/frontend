"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { AppCard } from "@/components/cards/AppCard";
import { CollapseToggle, CollapsibleBody, useCollapsible } from "@/components/cards/Collapsible";
import { ExpandingIconButton } from "@/components/ExpandingIconButton";
import { PageHeader } from "@/components/PageHeader";
import { CardContent, CardHeader } from "@/components/ui/card";
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
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useDatasetQuery, useSnapshotsQuery } from "@/hooks/useCatalog";
import { previewDatasetData } from "@/lib/api/datasets";
import { formatApiError, formatCellValue } from "@/lib/format";

interface DatasetsPreviewSchemaCardProps {
  namespace: string;
  dataset: string;
}

// Self-contained: its own dataset-info/snapshots queries (shared cache with
// DatasetsMetadataCard via the same query keys) and its own preview state.
// Spawns as an independent sibling once dataset info has loaded.
export function DatasetsPreviewSchemaCard({ namespace, dataset }: DatasetsPreviewSchemaCardProps) {
  const { session } = useAuth();
  const [previewSnapshot, setPreviewSnapshot] = useState("latest");
  const [previewLimit, setPreviewLimit] = useState(10);
  const { isCollapsed, toggle } = useCollapsible();

  const datasetInfoQuery = useDatasetQuery(namespace, dataset);
  const snapshotsQuery = useSnapshotsQuery(namespace, dataset);

  const previewMutation = useMutation({
    mutationFn: () =>
      previewDatasetData(session!, namespace, dataset, {
        limit: previewLimit,
        snapshotId: previewSnapshot === "latest" ? undefined : Number(previewSnapshot),
      }),
  });

  if (!datasetInfoQuery.data) {
    return null;
  }

  return (
    <AppCard>
      <Tabs defaultValue="preview" className="contents">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <PageHeader title="Preview & schema" />
            <div className="flex items-center gap-2">
              <TabsList>
                <TabsIndicator />
                <TabsTab value="preview">Preview</TabsTab>
                <TabsTab value="schema">Schema</TabsTab>
              </TabsList>
              <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} label="Preview & schema" />
            </div>
          </div>
        </CardHeader>
        <CollapsibleBody isCollapsed={isCollapsed}>
        <CardContent>
          <TabsPanel value="preview">
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

                <div className="flex lg:justify-end lg:self-end">
                  <ExpandingIconButton
                    type="button"
                    icon={<Eye />}
                    label={previewMutation.isPending ? "Loading…" : "Preview"}
                    onClick={() => previewMutation.mutate()}
                    disabled={previewMutation.isPending || !session}
                  />
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
                  {previewMutation.data.rows[0] ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(previewMutation.data.rows[0]).map((column) => (
                            <TableHead key={column}>{column.replace(/_/g, " ")}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewMutation.data.rows.map((row, index) => (
                          <TableRow key={index}>
                            {Object.entries(row).map(([column, value]) => (
                              <TableCell key={column} className="font-mono text-xs">
                                {formatCellValue(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No preview rows were returned for this snapshot.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </TabsPanel>

          <TabsPanel value="schema">
            {datasetInfoQuery.data.schema.length > 0 ? (
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
            )}
          </TabsPanel>
        </CardContent>
        </CollapsibleBody>
      </Tabs>
    </AppCard>
  );
}

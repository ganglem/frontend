"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppCard } from "@/components/cards/AppCard";
import { CollapseToggle, CollapsibleBody, useCollapsible } from "@/components/cards/Collapsible";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExpandingIconButton } from "@/components/ExpandingIconButton";
import { FieldMessage } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useNamespaceQuery, useNamespacesQuery } from "@/hooks/useCatalog";
import { useToast } from "@/hooks/useToast";
import { createNamespace, deleteNamespace, updateNamespace } from "@/lib/api/namespaces";
import { formatApiError } from "@/lib/format";
import type { NamespaceInfo } from "@/types/api";

const createSchema = z.object({
  name: z.string().min(1, "Enter a namespace name.").max(100),
  description: z.string().max(500).optional(),
});

type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  description: z.string().max(500).optional(),
});

type EditValues = z.infer<typeof editSchema>;

// Same inline-expand mechanism as editing a row, not a modal: click to
// expand, fields and the confirm button sit on one line.
function CreateNamespaceInline() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateValues) =>
      createNamespace(session!, { name: values.name, description: values.description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["namespaces", session?.catalogId] });
      form.reset();
      setIsCreating(false);
    },
  });

  function cancel() {
    form.reset();
    createMutation.reset();
    setIsCreating(false);
  }

  if (!isCreating) {
    return <ExpandingIconButton icon={<Plus />} label="New namespace" onClick={() => setIsCreating(true)} />;
  }

  return (
    <form
      className="w-full animate-in space-y-1.5 fade-in-0 duration-200"
      onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
    >
      <div className="flex items-center gap-2">
        <Input autoFocus placeholder="Namespace name" className="flex-1" {...form.register("name")} />
        <Input
          placeholder="Description (optional)"
          className="flex-[2]"
          {...form.register("description")}
        />
        <Button type="button" variant="outline" onClick={cancel} disabled={createMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating…" : "Create"}
        </Button>
      </div>
      <FieldMessage tone="danger">{form.formState.errors.name?.message}</FieldMessage>
      <FieldMessage tone="danger">
        {createMutation.isError ? formatApiError(createMutation.error) : undefined}
      </FieldMessage>
    </form>
  );
}

function DeleteNamespaceDialog({ namespace, onClose }: { namespace: string; onClose: () => void }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const namespaceQuery = useNamespaceQuery(namespace);
  const [force, setForce] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteNamespace(session!, namespace, force),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["namespaces", session?.catalogId] });
      toast.success(result.message || `Namespace "${namespace}" deleted.`);
      onClose();
    },
  });

  return (
    <ConfirmDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Delete ${namespace}`}
      description={
        namespaceQuery.data
          ? `${namespaceQuery.data.table_count} dataset(s) in this namespace.`
          : "Loading namespace details…"
      }
      warning="Deletion is irreversible. The backend is the source of truth for whether this namespace can be removed."
      acknowledgement="I understand this permanently deletes this namespace."
      confirmLabel="Delete namespace"
      pendingLabel="Deleting…"
      isPending={deleteMutation.isPending}
      error={deleteMutation.error}
      onConfirm={() => deleteMutation.mutate()}
    >
      <label className="flex items-start gap-3 rounded-2xl border bg-muted/30 px-4 py-3">
        <Checkbox checked={force} onCheckedChange={(checked) => setForce(checked === true)} />
        <div>
          <p className="text-sm font-medium">Force delete</p>
          <p className="text-sm text-muted-foreground">
            When enabled, all datasets in the namespace are deleted first.
          </p>
        </div>
      </label>
    </ConfirmDialog>
  );
}

function NamespaceRow({
  namespace,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onRequestDelete,
}: {
  namespace: NamespaceInfo;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onRequestDelete: () => void;
}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { description: namespace.description ?? "" },
  });

  const updateMutation = useMutation({
    mutationFn: (values: EditValues) =>
      updateNamespace(session!, namespace.name, { description: values.description, properties: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["namespaces", session?.catalogId] });
      onCancelEdit();
    },
  });

  if (isEditing) {
    return (
      <TableRow>
        <TableCell className="font-medium align-top">{namespace.name}</TableCell>
        <TableCell colSpan={2}>
          <form
            className="animate-in space-y-2 fade-in-0 duration-200"
            onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
          >
            <Textarea
              autoFocus
              rows={2}
              placeholder="Add a description"
              {...form.register("description")}
            />
            <FieldMessage tone="danger">
              {updateMutation.isError ? formatApiError(updateMutation.error) : undefined}
            </FieldMessage>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancelEdit}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{namespace.name}</TableCell>
      <TableCell className="text-muted-foreground">{namespace.description ?? "—"}</TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <ExpandingIconButton variant="outline" size="sm" icon={<Pencil />} label="Edit" onClick={onStartEdit} />
          <ExpandingIconButton
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            icon={<Trash2 />}
            label="Delete"
            onClick={onRequestDelete}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

// Fully self-contained: list, create, inline edit, and delete all live here.
// Reused as-is on the Namespaces page and inside the Overview bento grid.
export function NamespacesCard() {
  const namespacesQuery = useNamespacesQuery();
  const [editingNamespace, setEditingNamespace] = useState<string | null>(null);
  const [deletingNamespace, setDeletingNamespace] = useState<string | null>(null);
  const { isCollapsed, toggle } = useCollapsible();

  return (
    <AppCard>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <PageHeader title="Namespaces" />
          <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} label="Namespaces" />
        </div>
      </CardHeader>

      <CollapsibleBody isCollapsed={isCollapsed}>
        <div className="space-y-4 pt-1">
        <div className="px-6">
          {namespacesQuery.isLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-7 w-16 rounded-xl" />
                </div>
              ))}
            </div>
          ) : namespacesQuery.isError ? (
            <p className="py-4 text-sm text-destructive">{formatApiError(namespacesQuery.error)}</p>
          ) : namespacesQuery.data?.data.length ? (
            <Table className="animate-in fade-in-0 duration-300">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-36" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {namespacesQuery.data.data.map((namespace) => (
                  <NamespaceRow
                    key={namespace.name}
                    namespace={namespace}
                    isEditing={editingNamespace === namespace.name}
                    onStartEdit={() => setEditingNamespace(namespace.name)}
                    onCancelEdit={() => setEditingNamespace(null)}
                    onRequestDelete={() => setDeletingNamespace(namespace.name)}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              No namespaces yet - create one to start uploading datasets.
            </p>
          )}
        </div>

        <CardContent>
          <div className="flex justify-end">
            <CreateNamespaceInline />
          </div>
        </CardContent>
        </div>
      </CollapsibleBody>

      {deletingNamespace ? (
        <DeleteNamespaceDialog
          namespace={deletingNamespace}
          onClose={() => setDeletingNamespace(null)}
        />
      ) : null}
    </AppCard>
  );
}

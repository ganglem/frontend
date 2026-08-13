"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FieldMessage } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useNamespaceQuery, useNamespacesQuery } from "@/hooks/useCatalog";
import { createNamespace, updateNamespace } from "@/lib/api/namespaces";
import { formatApiError } from "@/lib/format";

const createSchema = z.object({
  name: z.string().min(1, "Enter a namespace name.").max(100),
  description: z.string().max(500).optional(),
});

type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  description: z.string().max(500).optional(),
});

type EditValues = z.infer<typeof editSchema>;

function CreateNamespaceDialog() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateValues) =>
      createNamespace(session!, { name: values.name, description: values.description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["namespaces", session?.catalogId] });
      setOpen(false);
      form.reset();
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          createMutation.reset();
        }
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus />
        New namespace
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create namespace</DialogTitle>
          <DialogDescription>
            Namespaces group datasets in the current catalog.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
        >
          <div>
            <Label htmlFor="new-namespace-name">Name</Label>
            <Input id="new-namespace-name" className="mt-1.5" {...form.register("name")} />
            <FieldMessage tone="danger">{form.formState.errors.name?.message}</FieldMessage>
          </div>
          <div>
            <Label htmlFor="new-namespace-description">Description (optional)</Label>
            <Textarea
              id="new-namespace-description"
              className="mt-1.5"
              {...form.register("description")}
            />
          </div>
          <FieldMessage tone="danger">
            {createMutation.isError ? formatApiError(createMutation.error) : undefined}
          </FieldMessage>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create namespace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditNamespaceDialog({
  namespace,
  initialDescription,
  onClose,
}: {
  namespace: string;
  initialDescription: string | null;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  // NamespaceResponse (GET by name) has no `description` field - only the list
  // item (NamespaceInfo) does - so the edit form is seeded from the list row.
  const namespaceQuery = useNamespaceQuery(namespace);
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { description: initialDescription ?? "" },
  });

  const updateMutation = useMutation({
    mutationFn: (values: EditValues) =>
      updateNamespace(session!, namespace, { description: values.description, properties: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["namespaces", session?.catalogId] });
      queryClient.invalidateQueries({ queryKey: ["namespace", session?.catalogId, namespace] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {namespace}</DialogTitle>
          <DialogDescription>
            {namespaceQuery.data
              ? `${namespaceQuery.data.table_count} dataset(s) in this namespace.`
              : "Loading namespace details…"}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
        >
          <div>
            <Label htmlFor="edit-namespace-description">Description</Label>
            <Textarea
              id="edit-namespace-description"
              className="mt-1.5"
              {...form.register("description")}
            />
          </div>
          <FieldMessage tone="danger">
            {updateMutation.isError ? formatApiError(updateMutation.error) : undefined}
          </FieldMessage>
          <DialogFooter>
            <Button type="submit" disabled={updateMutation.isPending || namespaceQuery.isLoading}>
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function NamespacesPage() {
  const namespacesQuery = useNamespacesQuery();
  const [editingNamespace, setEditingNamespace] = useState<{
    name: string;
    description: string | null;
  } | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organization"
        title="Namespaces"
        description="Create and manage the namespaces available in the current catalog."
        action={<CreateNamespaceDialog />}
      />

      <Card className="overflow-hidden py-0">
        {namespacesQuery.isLoading ? (
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">Loading namespaces…</p>
          </CardContent>
        ) : namespacesQuery.isError ? (
          <CardContent className="py-6">
            <p className="text-sm text-destructive">{formatApiError(namespacesQuery.error)}</p>
          </CardContent>
        ) : namespacesQuery.data?.data.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {namespacesQuery.data.data.map((namespace) => (
                <TableRow key={namespace.name}>
                  <TableCell className="font-medium">{namespace.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {namespace.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditingNamespace({
                          name: namespace.name,
                          description: namespace.description,
                        })
                      }
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              No namespaces yet - create one to start uploading datasets.
            </p>
          </CardContent>
        )}
      </Card>

      {editingNamespace ? (
        <EditNamespaceDialog
          namespace={editingNamespace.name}
          initialDescription={editingNamespace.description}
          onClose={() => setEditingNamespace(null)}
        />
      ) : null}
    </div>
  );
}

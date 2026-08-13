"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DataTable } from "@/components/DataTable";
import { FieldMessage } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { runQuery } from "@/lib/api/query";
import { formatApiError } from "@/lib/format";

const querySchema = z.object({
  sql: z.string().min(5, "Enter a SQL statement."),
});

type QueryValues = z.infer<typeof querySchema>;

export default function QueryPage() {
  const { session } = useAuth();
  const form = useForm<QueryValues>({
    resolver: zodResolver(querySchema),
    defaultValues: {
      sql: "SELECT * FROM your_namespace.your_dataset LIMIT 10",
    },
  });

  const queryMutation = useMutation({
    mutationFn: (values: QueryValues) => runQuery(session!, { sql: values.sql }),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Analysis" title="SQL Query Workspace" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Query builder</CardTitle>
            <CardDescription>
              Queries run against the current catalog. Reference tables as{" "}
              <code>namespace.dataset</code>, or fully-qualify with{" "}
              <code>catalog.namespace.dataset</code> to cross catalogs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit((values) => queryMutation.mutate(values))}
            >
              <div>
                <Label htmlFor="sql">SQL statement</Label>
                <Textarea
                  id="sql"
                  className="mt-1.5 min-h-40 font-mono text-xs"
                  spellCheck={false}
                  {...form.register("sql")}
                />
                <FieldMessage tone="danger">{form.formState.errors.sql?.message}</FieldMessage>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={queryMutation.isPending || !session}
              >
                {queryMutation.isPending ? "Running query…" : "Execute query"}
              </Button>

              <FieldMessage tone="danger">
                {queryMutation.isError ? formatApiError(queryMutation.error) : undefined}
              </FieldMessage>
            </form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Latest result</CardTitle>
                <CardDescription>Results are shown as returned by the API.</CardDescription>
              </div>
              {queryMutation.data ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{queryMutation.data.totalRows} rows</Badge>
                  {queryMutation.data.executionTimeMs !== null ? (
                    <Badge variant="outline">{queryMutation.data.executionTimeMs} ms</Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {queryMutation.data ? (
              <div className="space-y-4">
                {queryMutation.data.queryId ? (
                  <p className="text-sm text-muted-foreground">
                    Query <code>{queryMutation.data.queryId}</code> completed successfully.
                  </p>
                ) : null}
                <DataTable
                  rows={queryMutation.data.rows}
                  emptyMessage="No rows returned for this query. Try a broader filter or a different table."
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No query has been run yet in this session.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

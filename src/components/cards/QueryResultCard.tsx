"use client";

import { AppCard } from "@/components/cards/AppCard";
import { CollapseToggle, CollapsibleBody, useCollapsible } from "@/components/cards/Collapsible";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCellValue } from "@/lib/format";
import type { QueryResponse } from "@/types/api";

interface QueryResultCardProps {
  data: QueryResponse | undefined;
  isPending: boolean;
}

// Spawns independently once a query is run - not nested inside QueryCard,
// just a sibling that happens to appear/disappear based on `data`.
export function QueryResultCard({ data, isPending }: QueryResultCardProps) {
  const { isCollapsed, toggle } = useCollapsible();

  return (
    <AppCard className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-6 duration-500 ease-bounce">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <PageHeader title="SQL Query Result" />
          <div className="flex items-center gap-2">
            {data ? (
              <>
                <Badge variant="secondary">{data.totalRows} rows</Badge>
                {data.executionTimeMs !== null ? (
                  <Badge variant="outline">{data.executionTimeMs} ms</Badge>
                ) : null}
              </>
            ) : null}
            <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} label="SQL Query Result" />
          </div>
        </div>
      </CardHeader>
      <CollapsibleBody isCollapsed={isCollapsed}>
        <CardContent>
          {isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-8" />
              ))}
            </div>
          ) : data ? (
            <div className="animate-in space-y-4 fade-in-0 duration-300">
              {data.queryId ? (
                <p className="text-sm text-muted-foreground">
                  Query <code>{data.queryId}</code> completed successfully.
                </p>
              ) : null}
              {data.rows[0] ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(data.rows[0]).map((column) => (
                        <TableHead key={column}>{column.replace(/_/g, " ")}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row, index) => (
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
                  No rows returned for this query. Try a broader filter or a different table.
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </CollapsibleBody>
    </AppCard>
  );
}

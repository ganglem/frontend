"use client";

import { ArrowUp } from "lucide-react";
import { AppCard } from "@/components/cards/AppCard";
import { CollapseToggle, CollapsibleBody, useCollapsible } from "@/components/cards/Collapsible";
import { ExpandingIconButton } from "@/components/ExpandingIconButton";
import { FieldMessage } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatApiError } from "@/lib/format";
import { cn } from "@/lib/utils";

interface QueryCardProps {
  sql: string;
  onSqlChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  canSubmit: boolean;
  error?: unknown;
}

// The SQL input, chat-box style. Presentational - the page owns `sql` and
// the mutation so this card and QueryResultCard can be independent siblings
// sharing the same run.
export function QueryCard({ sql, onSqlChange, onSubmit, isPending, canSubmit, error }: QueryCardProps) {
  const { isCollapsed, toggle } = useCollapsible();

  return (
    <AppCard>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <PageHeader title="SQL Query Workspace" />
          <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} label="SQL Query Workspace" />
        </div>
      </CardHeader>
      <CollapsibleBody isCollapsed={isCollapsed}>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <Textarea
              className="min-h-40 resize-none font-mono text-xs"
              placeholder="SELECT * FROM namespace.dataset LIMIT 10"
              spellCheck={false}
              value={sql}
              onChange={(event) => onSqlChange(event.target.value)}
            />
            <div className="flex justify-end">
              <ExpandingIconButton
                type="submit"
                icon={<ArrowUp />}
                label="Query"
                className={cn(canSubmit && !isPending && "animate-breathe")}
                disabled={!canSubmit || isPending}
              />
            </div>

            <FieldMessage tone="danger">{error ? formatApiError(error) : undefined}</FieldMessage>
          </form>
        </CardContent>
      </CollapsibleBody>
    </AppCard>
  );
}

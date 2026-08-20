"use client";

import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { QueryCard } from "@/components/cards/QueryCard";
import { QueryResultCard } from "@/components/cards/QueryResultCard";
import { SortableCardList } from "@/components/SortableCardList";
import { useAuth } from "@/hooks/useAuth";
import { runQuery } from "@/lib/api/query";

const DEFAULT_ORDER = ["query-input", "query-results"];

// Owns the shared sql/mutation state and produces the (possibly two)
// independent cards for it. Called by both this page and Overview, each
// getting its own separate instance of the state.
export function useQueryCards(): { id: string; node: ReactNode }[] {
  const { session } = useAuth();
  const [sql, setSql] = useState("");

  const queryMutation = useMutation({
    mutationFn: (value: string) => runQuery(session!, { sql: value }),
  });

  const hasResult = queryMutation.data !== undefined;
  const canSubmit = sql.trim().length >= 5 && !!session;

  const cards: { id: string; node: ReactNode }[] = [
    {
      id: "query-input",
      node: (
        <QueryCard
          sql={sql}
          onSqlChange={setSql}
          onSubmit={() => queryMutation.mutate(sql)}
          isPending={queryMutation.isPending}
          canSubmit={canSubmit}
          error={queryMutation.error}
        />
      ),
    },
  ];

  if (hasResult) {
    cards.push({
      id: "query-results",
      node: <QueryResultCard data={queryMutation.data} isPending={queryMutation.isPending} />,
    });
  }

  return cards;
}

export default function QueryPage() {
  const cards = useQueryCards();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <SortableCardList storageKey="query-cards-order" defaultOrder={DEFAULT_ORDER} cards={cards} />
      </div>
    </div>
  );
}

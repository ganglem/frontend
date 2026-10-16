"use client";

import type { ReactNode } from "react";
import { NamespacesCard } from "@/components/cards/NamespacesCard";
import { SortableCardList } from "@/components/SortableCardList";
import { useChatVisualizationCardsForPath } from "@/hooks/useGeneratedCards";

const STATIC_DEFAULT_ORDER = ["namespaces-table"];

// Called by both this page and Overview, each getting the same chat cards
// targeted at "/namespaces" folded in - see useChatVisualizationCardsForPath.
export function useNamespacesCards(): { id: string; node: ReactNode }[] {
  const chatCards = useChatVisualizationCardsForPath("/namespaces");

  return [{ id: "namespaces-table", node: <NamespacesCard /> }, ...chatCards];
}

export default function NamespacesPage() {
  const cards = useNamespacesCards();
  const defaultOrder = [...STATIC_DEFAULT_ORDER, ...cards.map((c) => c.id).filter((id) => !STATIC_DEFAULT_ORDER.includes(id))];

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      <div className="w-full max-w-3xl">
        <SortableCardList storageKey="namespaces-cards-order" defaultOrder={defaultOrder} cards={cards} />
      </div>
    </div>
  );
}

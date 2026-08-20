"use client";

import type { ReactNode } from "react";
import { NamespacesCard } from "@/components/cards/NamespacesCard";
import { SortableCardList } from "@/components/SortableCardList";

const DEFAULT_ORDER = ["namespaces-table"];

export function useNamespacesCards(): { id: string; node: ReactNode }[] {
  return [{ id: "namespaces-table", node: <NamespacesCard /> }];
}

export default function NamespacesPage() {
  const cards = useNamespacesCards();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      <div className="w-full max-w-3xl">
        <SortableCardList storageKey="namespaces-cards-order" defaultOrder={DEFAULT_ORDER} cards={cards} />
      </div>
    </div>
  );
}

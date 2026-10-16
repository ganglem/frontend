"use client";

import type { ReactNode } from "react";
import { SortableCardList } from "@/components/SortableCardList";
import { UploadCard } from "@/components/cards/UploadCard";
import { useChatVisualizationCardsForPath } from "@/hooks/useGeneratedCards";

const STATIC_DEFAULT_ORDER = ["upload-form"];

// Called by both this page and Overview, each getting the same chat cards
// targeted at "/upload" folded in - see useChatVisualizationCardsForPath.
export function useUploadCards(): { id: string; node: ReactNode }[] {
  const chatCards = useChatVisualizationCardsForPath("/upload");

  return [{ id: "upload-form", node: <UploadCard /> }, ...chatCards];
}

export default function UploadPage() {
  const cards = useUploadCards();
  const defaultOrder = [...STATIC_DEFAULT_ORDER, ...cards.map((c) => c.id).filter((id) => !STATIC_DEFAULT_ORDER.includes(id))];

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <SortableCardList storageKey="upload-cards-order" defaultOrder={defaultOrder} cards={cards} />
      </div>
    </div>
  );
}

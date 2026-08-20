"use client";

import type { ReactNode } from "react";
import { SortableCardList } from "@/components/SortableCardList";
import { UploadCard } from "@/components/cards/UploadCard";

const DEFAULT_ORDER = ["upload-form"];

export function useUploadCards(): { id: string; node: ReactNode }[] {
  return [{ id: "upload-form", node: <UploadCard /> }];
}

export default function UploadPage() {
  const cards = useUploadCards();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <SortableCardList storageKey="upload-cards-order" defaultOrder={DEFAULT_ORDER} cards={cards} />
      </div>
    </div>
  );
}

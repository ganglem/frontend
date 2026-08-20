"use client";

import type { ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/SortableItem";
import { useSectionOrder } from "@/hooks/useSectionOrder";
import { cn } from "@/lib/utils";

interface SortableCardListProps {
  storageKey: string;
  defaultOrder: string[];
  cards: { id: string; node: ReactNode }[];
  className?: string;
  itemClassName?: string | ((id: string) => string);
  // When > 1, cards are distributed round-robin into this many independent
  // column stacks (real masonry) instead of one vertical list - CSS
  // multi-column doesn't reliably balance auto-height, dynamically resizing
  // content across browsers, so this is done in JS.
  columns?: number;
}

// Generic drag-to-reorder list: give it a storage key, the full default id
// order, and whichever cards are currently visible (already filtered by the
// caller) - it persists order per browser session and handles the actual
// dragging. Used standalone on every page and again, combined, on Overview.
export function SortableCardList({
  storageKey,
  defaultOrder,
  cards,
  className,
  itemClassName,
  columns = 1,
}: SortableCardListProps) {
  const [order, setOrder] = useSectionOrder(storageKey, defaultOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const orderedCards = order
    .map((id) => cards.find((card) => card.id === id))
    .filter((card): card is (typeof cards)[number] => !!card);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const visibleIds = orderedCards.map((card) => card.id);
    const oldIndex = visibleIds.indexOf(String(active.id));
    const newIndex = visibleIds.indexOf(String(over.id));

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedVisible = arrayMove(visibleIds, oldIndex, newIndex);
    let cursor = 0;
    const nextOrder = order.map((id) => (visibleIds.includes(id) ? reorderedVisible[cursor++] : id));

    setOrder(nextOrder);
  }

  function renderItem(card: (typeof orderedCards)[number]) {
    return (
      <SortableItem
        key={card.id}
        id={card.id}
        className={typeof itemClassName === "function" ? itemClassName(card.id) : itemClassName}
      >
        {card.node}
      </SortableItem>
    );
  }

  const isMasonry = columns > 1;
  const columnBuckets = isMasonry
    ? Array.from({ length: columns }, (_, columnIndex) =>
        orderedCards.filter((_, cardIndex) => cardIndex % columns === columnIndex),
      )
    : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={orderedCards.map((card) => card.id)}
        strategy={isMasonry ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {columnBuckets ? (
          <div className={cn("flex items-start gap-6", className)}>
            {columnBuckets.map((bucket, columnIndex) => (
              <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-6">
                {bucket.map(renderItem)}
              </div>
            ))}
          </div>
        ) : (
          <div className={cn("space-y-6", className)}>{orderedCards.map(renderItem)}</div>
        )}
      </SortableContext>
    </DndContext>
  );
}

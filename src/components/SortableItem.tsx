"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableItemProps {
  id: string;
  children: ReactNode;
  className?: string;
}

// Wraps one draggable section: a floating grab handle in the corner (so
// buttons/links inside the section itself stay clickable) plus the
// transform/transition dnd-kit needs to animate reordering.
export function SortableItem({ id, children, className }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group/sortable relative", isDragging && "z-10 opacity-90", className)}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute -top-3 -right-3 z-10 flex size-8 cursor-grab items-center justify-center rounded-full border bg-card text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover/sortable:opacity-100 hover:text-foreground focus-visible:opacity-100 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      {children}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  displayClassName?: string;
}

// Click-to-edit text: renders as static text with a pencil affordance on
// hover; clicking swaps it for an input/textarea. Commits on blur (or Enter
// for single-line), reverts on Escape.
export function EditableText({
  value,
  onCommit,
  placeholder = "Untitled",
  multiline = false,
  className,
  displayClassName,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    const next = draft.trim();

    if (next !== value) {
      onCommit(next);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  const fieldClassName = cn(
    "w-full resize-none rounded-md border border-transparent bg-transparent outline-none focus:border-ring focus:ring-3 focus:ring-ring/30",
    className,
  );

  if (editing && multiline) {
    return (
      <textarea
        autoFocus
        rows={2}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        className={fieldClassName}
      />
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        className={fieldClassName}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={cn(
        "group/editable flex w-full items-start gap-1.5 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        displayClassName,
      )}
    >
      <span className={cn("min-w-0 flex-1", !value && "text-muted-foreground italic")}>
        {value || placeholder}
      </span>
      <Pencil className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/editable:opacity-100" />
    </button>
  );
}

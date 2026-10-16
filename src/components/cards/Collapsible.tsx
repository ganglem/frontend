"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared collapse/expand behavior for card bodies: a header-row toggle
// button (rotating chevron) plus a grid-template-rows animation for the
// body, since `height` can't transition against an unknown content height.
export function useCollapsible(initial = false) {
  const [isCollapsed, setIsCollapsed] = useState(initial);

  return { isCollapsed, toggle: () => setIsCollapsed((current) => !current) };
}

export function CollapseToggle({
  isCollapsed,
  onToggle,
  label,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
      aria-label={isCollapsed ? `Expand ${label}` : `Collapse ${label}`}
      aria-expanded={!isCollapsed}
    >
      <ChevronDown
        className={cn("size-4 transition-transform duration-300 ease-bounce", !isCollapsed && "rotate-180")}
      />
    </button>
  );
}

export function CollapsibleBody({ isCollapsed, children }: { isCollapsed: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-[400ms] ease-out",
        isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
      )}
    >
      <div className="overflow-hidden">
        <div
          className={cn(
            "transition-opacity duration-300",
            isCollapsed ? "opacity-0" : "opacity-100 delay-150",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

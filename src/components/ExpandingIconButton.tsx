"use client";

import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExpandingIconButtonProps extends Omit<ComponentProps<typeof Button>, "children"> {
  icon: ReactNode;
  label: ReactNode;
}

// Icon-only until hovered or focused, then reveals its label. The icon stays
// put at the trailing edge, so the button visually grows to the left instead
// of shifting the icon around - meant for right-aligned action buttons that
// should stay quiet until you're actually pointed at them.
export function ExpandingIconButton({ icon, label, className, ...props }: ExpandingIconButtonProps) {
  return (
    <Button
      {...props}
      className={cn(
        "group/expand flex items-center gap-0 overflow-hidden rounded-full px-2 transition-[padding,gap] duration-300 ease-bounce hover:gap-1.5 hover:px-3 focus-visible:gap-1.5 focus-visible:px-3",
        className,
      )}
    >
      <span className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-bounce group-hover/expand:grid-cols-[1fr] group-focus-visible/expand:grid-cols-[1fr]">
        <span className="overflow-hidden whitespace-nowrap">{label}</span>
      </span>
      {icon}
    </Button>
  );
}

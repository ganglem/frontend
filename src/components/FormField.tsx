import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FieldMessage({
  className,
  children,
  tone = "muted",
}: {
  className?: string;
  children?: ReactNode;
  tone?: "muted" | "danger";
}) {
  if (!children) {
    return null;
  }

  return (
    <p
      className={cn(
        "mt-1.5 text-sm",
        tone === "danger" ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

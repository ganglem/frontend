import type { ComponentProps } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// The one card shell every card component in the app builds on - bakes in
// the shared entrance animation (grow-from-center, bounce easing) so
// individual cards don't each redeclare it.
export function AppCard({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card className={cn("animate-in fade-in-0 zoom-in-95 duration-300 ease-bounce", className)} {...props} />
  );
}

"use client";

import { X } from "lucide-react";
import { useToastStack } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismissToast } = useToastStack();

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-100 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl",
            toast.leaving
              ? "animate-out fade-out-0 zoom-out-95 slide-out-to-top-2 duration-200 ease-in"
              : "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-300 ease-bounce",
            toast.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          <p>{toast.message}</p>
          <button
            type="button"
            className="shrink-0 opacity-70 transition hover:opacity-100"
            onClick={() => dismissToast(toast.id)}
          >
            <X className="size-4" />
            <span className="sr-only">Dismiss</span>
          </button>
        </div>
      ))}
    </div>
  );
}

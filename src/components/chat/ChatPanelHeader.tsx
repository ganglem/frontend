"use client";

import { Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatPanelHeaderProps {
  onClear: () => void;
  onClose: () => void;
}

export function ChatPanelHeader({ onClear, onClose }: ChatPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-3.5" />
        </span>
        <div>
          <p className="font-heading text-sm leading-none font-medium">Data Lake Assistant</p>
          <p className="mt-1 text-xs text-muted-foreground">Ask about your tables</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Clear conversation">
          <Trash2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close chat">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

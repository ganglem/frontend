"use client";

import { useCallback, useMemo, useState, type ComponentType, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import * as AssistantUIReact from "@assistant-ui/react";
import { useLocalRuntime, type AssistantRuntime } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread.aui";
import { ChatPanelHeader } from "@/components/chat/ChatPanelHeader";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { createChatModelAdapter } from "@/lib/chat/chatModelAdapter";
import { normalizeDashboardPath, useGeneratedCards } from "@/hooks/useGeneratedCards";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";

// `AssistantRuntimeProvider` exists at runtime (confirmed in the compiled
// bundle) but is missing from this package version's own index.d.ts - an
// upstream type-declaration gap, not a typo here. Isolated to this one cast
// rather than widening types app-wide.
const AssistantRuntimeProvider = (
  AssistantUIReact as unknown as {
    AssistantRuntimeProvider: ComponentType<{ runtime: AssistantRuntime; children?: ReactNode }>;
  }
).AssistantRuntimeProvider;

function ToggleTab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open the Data Lake Assistant"
      className="fixed top-4 right-4 z-40 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-white/20 transition-transform duration-300 ease-bounce hover:scale-110 active:scale-95"
    >
      <Sparkles className="size-5" />
    </button>
  );
}

interface ChatRuntimeProps {
  onClear: () => void;
  onClose: () => void;
}

// Owns one conversation's lifetime: mounting this fresh (via a `key` change
// in ChatPanel below) is how "clear conversation" works - unmounting resets
// useLocalRuntime/useState/useMemo here in one shot, rather than trying to
// reach into assistant-ui's runtime to clear its history by hand.
function ChatRuntime({ onClear, onClose }: ChatRuntimeProps) {
  const [conversationId] = useState(() => crypto.randomUUID());
  const { session } = useAuth();
  const { cards, addCard, updateCard } = useGeneratedCards();
  const pathname = usePathname();

  // getSession/getCards/getTargetPath read live state on every call rather
  // than closing over a stale snapshot - this adapter instance lives for this
  // whole ChatRuntime mount, so it must not freeze session/cards/the current
  // page at construction time (the user can navigate mid-conversation).
  const adapter = useMemo(
    () =>
      createChatModelAdapter({
        getSession: () => session,
        conversationId,
        getCards: () => cards,
        getTargetPath: () => normalizeDashboardPath(pathname),
        onVisualization: addCard,
        onVisualizationUpdate: updateCard,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session/cards/pathname/addCard/updateCard are read live via the getters above, not captured here
    [conversationId],
  );

  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatPanelHeader onClear={onClear} onClose={onClose} />
      <div className="min-h-0 flex-1">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}

const DEFAULT_WIDTH = 368;
const MIN_WIDTH = 320;

// Drag handle on the panel's left edge: pointer capture keeps the drag alive
// even when the cursor leaves the 6px hit area. Double-click toggles between
// the default width and roughly half the viewport.
function ResizeHandle({ width, onResize }: { width: number; onResize: (w: number) => void }) {
  const clamp = (w: number) => Math.max(MIN_WIDTH, Math.min(w, window.innerWidth - 48));

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => onResize(clamp(startWidth + (startX - ev.clientX)));
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize assistant"
      onPointerDown={onPointerDown}
      onDoubleClick={() => onResize(width > DEFAULT_WIDTH + 40 ? DEFAULT_WIDTH : clamp(window.innerWidth / 2))}
      className="group absolute inset-y-0 left-0 z-10 flex w-3 cursor-col-resize touch-none items-center justify-center"
    >
      <span className="h-10 w-1 rounded-full bg-foreground/20 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

// Mounted once in (app)/layout.tsx, a sibling of AppSidebar/SidebarInset.
// Styled like the app's other floating cards (Card's own rounded-[4xl]/
// shadow-sm/ring treatment) but docked to the viewport edge like a sidebar,
// rather than a flush full-height panel or the shadcn Sidebar primitive -
// that primitive already means "primary left nav" in this codebase.
export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isMobile = useIsMobile();
  const handleResize = useCallback((w: number) => setWidth(w), []);

  const panelBody = (
    <ChatRuntime
      key={resetKey}
      onClear={() => setResetKey((k) => k + 1)}
      onClose={() => setIsOpen(false)}
    />
  );

  if (isMobile) {
    return (
      <>
        {!isOpen ? <ToggleTab onClick={() => setIsOpen(true)} /> : null}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
            <SheetTitle className="sr-only">Data Lake Assistant</SheetTitle>
            {panelBody}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  if (!isOpen) {
    return <ToggleTab onClick={() => setIsOpen(true)} />;
  }

  return (
    <div
      data-slot="chat-panel"
      style={{ width }}
      className={cn(
        "fixed top-4 right-4 z-40 flex h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] origin-top-right flex-col overflow-hidden",
        "rounded-[min(var(--radius-4xl),24px)] bg-card shadow-xl ring-1 ring-foreground/5 dark:ring-foreground/10",
        "animate-in fade-in-0 zoom-in-[0.15] duration-300 ease-bounce",
      )}
    >
      <ResizeHandle width={width} onResize={handleResize} />
      {panelBody}
    </div>
  );
}

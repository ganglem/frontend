"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
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
      className="group fixed top-1/2 right-0 z-40 flex -translate-y-1/2 items-center gap-2 rounded-l-2xl bg-primary py-3 pr-2 pl-3 text-primary-foreground shadow-lg transition-transform duration-300 ease-bounce hover:-translate-x-1"
    >
      <Sparkles className="size-4" />
      <span className="rotate-180 text-xs font-medium tracking-wide [writing-mode:vertical-rl]">
        Ask the data
      </span>
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

// Mounted once in (app)/layout.tsx, a sibling of AppSidebar/SidebarInset.
// Styled like the app's other floating cards (Card's own rounded-[4xl]/
// shadow-sm/ring treatment) but docked to the viewport edge like a sidebar,
// rather than a flush full-height panel or the shadcn Sidebar primitive -
// that primitive already means "primary left nav" in this codebase.
export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const isMobile = useIsMobile();

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
      className={cn(
        "fixed inset-y-4 right-4 z-40 flex w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden",
        "rounded-[min(var(--radius-4xl),24px)] bg-card shadow-xl ring-1 ring-foreground/5 dark:ring-foreground/10",
        "animate-in fade-in-0 zoom-in-95 slide-in-from-right-6 duration-300 ease-bounce",
      )}
    >
      {panelBody}
    </div>
  );
}

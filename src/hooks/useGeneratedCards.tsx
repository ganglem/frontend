"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ChatVisualizationCard } from "@/components/cards/ChatVisualizationCard";
import type { ChatVisualizationPayload } from "@/types/chat";

// Which of this app's pages a card can spawn on - a card lands wherever the
// user was chatting from, not only Overview. Overview itself stays in the
// list (it's the beta-testing "everything flattened" page), so a card
// created from there needs a home too.
export const DASHBOARD_PATHS = ["/namespaces", "/upload", "/query", "/datasets", "/overview"] as const;
export type DashboardPath = (typeof DASHBOARD_PATHS)[number];

export function normalizeDashboardPath(pathname: string | null): DashboardPath {
  return (DASHBOARD_PATHS as readonly string[]).includes(pathname ?? "")
    ? (pathname as DashboardPath)
    : "/overview";
}

export interface PinnedVisualization extends ChatVisualizationPayload {
  targetPath: DashboardPath;
}

// Visualization cards the chat creates, shared between the chat panel
// (appends) and every page's own use<Page>Cards() hook (reads, filtered to
// that page's path) - two unrelated subtrees, low update frequency (one
// append per generated card), so Context fits well without reaching for an
// external state library. Same createContext/Provider/hook-that-throws
// pattern as useAuth.tsx/useToast.tsx.
interface GeneratedCardsContextValue {
  cards: PinnedVisualization[];
  addCard: (card: ChatVisualizationPayload, targetPath: DashboardPath) => void;
  updateCard: (id: string, patch: Partial<Omit<ChatVisualizationPayload, "id">>) => void;
  removeCard: (id: string) => void;
}

const GeneratedCardsContext = createContext<GeneratedCardsContextValue | null>(null);

const STORAGE_KEY = "chat-generated-cards";

function loadPersisted(): PinnedVisualization[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    return Array.isArray(parsed) ? (parsed as PinnedVisualization[]) : [];
  } catch {
    return [];
  }
}

function persist(cards: PinnedVisualization[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // sessionStorage unavailable (private mode, quota, etc.) - cards just won't persist across reload.
  }
}

export function GeneratedCardsProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<PinnedVisualization[]>([]);

  // Deferred until after mount, same reasoning as useAuth.tsx/useSectionOrder -
  // sessionStorage isn't readable during SSR/first paint. Persisting happens
  // inside addCard/removeCard below (not a second reactive effect watching
  // `cards`), so this hydration doesn't get raced and overwritten by a
  // persist-on-change effect firing first with the pre-hydration empty array.
  useEffect(() => {
    const loaded = loadPersisted();

    if (loaded.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs from sessionStorage, an external system unreadable during SSR/first paint
      setCards(loaded);
    }
  }, []);

  function addCard(card: ChatVisualizationPayload, targetPath: DashboardPath) {
    setCards((current) => {
      const next = [...current, { ...card, targetPath }];
      persist(next);
      return next;
    });
  }

  function updateCard(id: string, patch: Partial<Omit<ChatVisualizationPayload, "id">>) {
    setCards((current) => {
      const next = current.map((c) => (c.id === id ? { ...c, ...patch } : c));
      persist(next);
      return next;
    });
  }

  function removeCard(id: string) {
    setCards((current) => {
      const next = current.filter((c) => c.id !== id);
      persist(next);
      return next;
    });
  }

  return (
    <GeneratedCardsContext.Provider value={{ cards, addCard, updateCard, removeCard }}>
      {children}
    </GeneratedCardsContext.Provider>
  );
}

export function useGeneratedCards() {
  const context = useContext(GeneratedCardsContext);

  if (!context) {
    throw new Error("useGeneratedCards must be used within a GeneratedCardsProvider.");
  }

  return context;
}

// Analogous to the page-local use<Page>Cards() hooks (useQueryCards(), etc.)
// but deliberately lives here instead of a page file - these cards aren't
// owned by any one page, they're pushed onto a specific page from chat.
// Called from inside each page's own use<Page>Cards() hook, filtered to
// that page's path, so Overview's existing "call every page's hook" pattern
// picks these up automatically without a separate, duplicate-counting path.
export function useChatVisualizationCardsForPath(path: DashboardPath): { id: string; node: ReactNode }[] {
  const { cards } = useGeneratedCards();

  return cards
    .filter((card) => card.targetPath === path)
    .map((card) => ({
      id: card.id,
      node: <ChatVisualizationCard record={card} />,
    }));
}

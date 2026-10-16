"use client";

import { useEffect, useRef, useState } from "react";

function readOrder(key: string, defaultOrder: string[]): string[] {
  try {
    const raw = window.sessionStorage.getItem(key);

    if (!raw) {
      return defaultOrder;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return defaultOrder;
    }

    // Keep persisted order for still-known ids, append any ids the page
    // knows about now but the stored order doesn't (e.g. a new section).
    const known = parsed.filter((id): id is string => defaultOrder.includes(id));
    const missing = defaultOrder.filter((id) => !known.includes(id));

    return [...known, ...missing];
  } catch {
    return defaultOrder;
  }
}

// Drag-to-reorder position for a page's sections, persisted per browser
// session under `key`. Starts at `defaultOrder` during SSR/first paint (
// sessionStorage isn't readable then) and syncs the real value right after
// mount - same pattern useAuth.tsx uses for its own sessionStorage reads.
export function useSectionOrder(key: string, defaultOrder: string[]) {
  const [order, setOrderState] = useState(defaultOrder);
  const knownIdsRef = useRef<string[]>(defaultOrder);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs from sessionStorage, an external system unreadable during SSR/first paint
    setOrderState(readOrder(key, defaultOrder));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultOrder is a literal array from the caller; only `key` should retrigger this
  }, [key]);

  // Handles ids that appear in defaultOrder only after mount (e.g. a
  // dashboard card created at runtime by the chat feature) - the effect
  // above only reconciles once per `key`. This effect's dependency never
  // changes identity on a page whose defaultOrder is a stable module-level
  // literal, so it never re-runs past the initial mount there; it only keeps
  // re-running on pages like Overview, whose defaultOrder array is
  // recomputed every render - cheap, since it bails out via the
  // content-equality check below before touching state.
  useEffect(() => {
    const previouslyKnown = knownIdsRef.current;
    const newlyAdded = defaultOrder.filter((id) => !previouslyKnown.includes(id));

    knownIdsRef.current = defaultOrder;

    if (newlyAdded.length === 0) {
      return;
    }

    setOrderState((current) => {
      const toAppend = newlyAdded.filter((id) => !current.includes(id));

      return toAppend.length ? [...current, ...toAppend] : current;
    });
  }, [defaultOrder]);

  function setOrder(next: string[]) {
    setOrderState(next);

    try {
      window.sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      // sessionStorage unavailable (private mode, quota, etc.) - order just won't persist.
    }
  }

  return [order, setOrder] as const;
}

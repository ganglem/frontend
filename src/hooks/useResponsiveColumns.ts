"use client";

import { useEffect, useState } from "react";

// Matches Tailwind's default md/lg breakpoints so this lines up with the
// md:/lg: classes used everywhere else in the app.
const BREAKPOINTS = { md: 768, lg: 1024 } as const;

interface ColumnConfig {
  base: number;
  md?: number;
  lg?: number;
}

function computeColumns(config: ColumnConfig): number {
  const width = window.innerWidth;

  if (config.lg !== undefined && width >= BREAKPOINTS.lg) {
    return config.lg;
  }

  if (config.md !== undefined && width >= BREAKPOINTS.md) {
    return config.md;
  }

  return config.base;
}

// Real column *count* for JS-driven masonry (round-robin card distribution),
// since CSS multi-column doesn't reliably balance auto-height, dynamically
// resizing content across browsers. Starts at `base` during SSR/first paint
// and syncs to the real viewport width right after mount.
export function useResponsiveColumns(config: ColumnConfig): number {
  const [columns, setColumns] = useState(config.base);

  useEffect(() => {
    function handleResize() {
      setColumns(computeColumns(config));
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config is a literal object from the caller; re-run only on mount/resize
  }, []);

  return columns;
}

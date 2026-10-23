"use client";

import { Map as MapIcon, Satellite } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { Basemap } from "@/components/GeoMap";

const OPTIONS: { value: Basemap; label: string; icon: typeof MapIcon }[] = [
  { value: "map", label: "Map view", icon: MapIcon },
  { value: "satellite", label: "Satellite view", icon: Satellite },
];

// Icon-only glass pill, bottom-left just right of the floating sidebar. It
// tracks the sidebar's width so it doesn't end up underneath it when expanded.
export function BasemapToggle({ value, onChange }: { value: Basemap; onChange: (value: Basemap) => void }) {
  const { state } = useSidebar();

  return (
    <div
      data-slot="card"
      role="radiogroup"
      aria-label="Base layer"
      style={
        {
          "--basemap-left":
            state === "collapsed"
              ? "calc(var(--sidebar-width-icon) + 2rem)"
              : "calc(var(--sidebar-width) + 1.5rem)",
        } as React.CSSProperties
      }
      className="fixed bottom-4 left-4 z-30 flex gap-1 rounded-full p-1 shadow-lg ring-1 ring-foreground/10 transition-[left] duration-200 ease-linear md:left-(--basemap-left)"
    >
      {OPTIONS.map(({ value: option, label, icon: Icon }) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          aria-label={label}
          title={label}
          onClick={() => onChange(option)}
          className={cn(
            "flex size-9 items-center justify-center rounded-full transition-colors",
            value === option ? "bg-primary text-primary-foreground" : "hover:bg-foreground/10",
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

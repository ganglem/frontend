"use client";

import { useState } from "react";
import { Crosshair, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GeoPoint } from "@/types/geo";

// Longitude/latitude sliders span a window around where the point was when it
// was selected: a global range would make one pixel of slider travel ~1 degree.
const POSITION_WINDOW_DEG = 0.05; // ~4-5 km
const MAX_HEIGHT_M = 5000;

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}

function SliderRow({ label, value, min, max, step, display, onChange }: SliderRowProps) {
  return (
    <label className="grid grid-cols-[3.5rem_1fr_6rem] items-center gap-3 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-primary"
      />
      <span className="text-right tabular-nums">{display}</span>
    </label>
  );
}

interface PointEditorProps {
  point: GeoPoint;
  onChange: (patch: Partial<Pick<GeoPoint, "lon" | "lat" | "height">>) => void;
  onClose: () => void;
}

// Mount with `key={point.id}` so the slider windows re-anchor per point.
export function PointEditor({ point, onChange, onClose }: PointEditorProps) {
  const [anchor] = useState({ lon: point.lon, lat: point.lat });

  return (
    <div
      data-slot="card"
      className="fixed top-4 left-1/2 z-30 w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 space-y-3 rounded-3xl p-4 shadow-lg ring-1 ring-foreground/10"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
          <Crosshair className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{point.name}</p>
          <p className="text-xs text-muted-foreground">Drag to move or change height above ground</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close point editor">
          <X className="size-4" />
        </Button>
      </div>

      <SliderRow
        label="Lon"
        value={point.lon}
        min={anchor.lon - POSITION_WINDOW_DEG}
        max={anchor.lon + POSITION_WINDOW_DEG}
        step={0.0001}
        display={`${point.lon.toFixed(4)}°`}
        onChange={(lon) => onChange({ lon })}
      />
      <SliderRow
        label="Lat"
        value={point.lat}
        min={anchor.lat - POSITION_WINDOW_DEG}
        max={anchor.lat + POSITION_WINDOW_DEG}
        step={0.0001}
        display={`${point.lat.toFixed(4)}°`}
        onChange={(lat) => onChange({ lat })}
      />
      <SliderRow
        label="Height"
        value={point.height}
        min={0}
        max={MAX_HEIGHT_M}
        step={10}
        display={`${Math.round(point.height)} m AGL`}
        onChange={(height) => onChange({ height })}
      />
    </div>
  );
}

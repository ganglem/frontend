"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BasemapToggle } from "@/components/BasemapToggle";
import type { Basemap } from "@/components/GeoMap";
import { GeoScenarioBar } from "@/components/GeoScenarioBar";
import { PointEditor } from "@/components/PointEditor";
import { usePlayback } from "@/hooks/usePlayback";
import { buildMockScenario, positionAt } from "@/lib/geo/scenario";
import type { GeoPoint, GeoScenario } from "@/types/geo";

// MapLibre needs WebGL/window, so this stays out of the server render.
const GeoMap = dynamic(() => import("@/components/GeoMap").then((m) => m.GeoMap), {
  ssr: false,
});

type Offset = Pick<GeoPoint, "lon" | "lat" | "height">;
const ZERO_OFFSET: Offset = { lon: 0, lat: 0, height: 0 };

// Full-bleed page: the map is fixed behind everything; the glass UI
// (see globals.css) floats on top of it.
export default function GeoMapPage() {
  const [scenario, setScenario] = useState<GeoScenario | null>(null);
  // Manual slider edits are kept as a constant offset from the scenario's
  // path, so a moved point keeps following its track instead of snapping back.
  const [offsets, setOffsets] = useState<Record<string, Offset>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("map");
  const playback = usePlayback(scenario?.duration ?? 0);

  const points = useMemo<GeoPoint[]>(() => {
    if (!scenario) return [];
    return scenario.tracks.map((track) => {
      const base = positionAt(track, playback.time);
      const o = offsets[track.id] ?? ZERO_OFFSET;
      return {
        id: track.id,
        name: track.name,
        lon: base.lon + o.lon,
        lat: base.lat + o.lat,
        height: Math.max(0, base.height + o.height),
      };
    });
  }, [scenario, offsets, playback.time]);

  const selected = points.find((p) => p.id === selectedId) ?? null;

  const handleApply = ({ namespace, dataset, snapshot }: { namespace: string; dataset: string; snapshot: string }) => {
    setScenario(buildMockScenario(`${namespace}/${dataset}/${snapshot}`));
    setOffsets({});
    setSelectedId(null);
    playback.reset();
  };

  const updatePoint = (id: string, patch: Partial<Offset>) => {
    const track = scenario?.tracks.find((t) => t.id === id);
    if (!track) return;
    const base = positionAt(track, playback.time);
    setOffsets((prev) => {
      const next = { ...(prev[id] ?? ZERO_OFFSET) };
      for (const key of Object.keys(patch) as (keyof Offset)[]) {
        next[key] = (patch[key] as number) - base[key];
      }
      return { ...prev, [id]: next };
    });
  };

  return (
    <div className="fixed inset-0 z-0 bg-[#05070d]">
      <GeoMap className="size-full" points={points} selectedId={selectedId} onSelect={setSelectedId} basemap={basemap} />
      <BasemapToggle value={basemap} onChange={setBasemap} />
      {selected ? (
        <PointEditor
          key={selected.id}
          point={selected}
          onChange={(patch) => updatePoint(selected.id, patch)}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
      <GeoScenarioBar
        onApply={handleApply}
        playback={
          scenario
            ? {
                time: playback.time,
                playing: playback.playing,
                speed: playback.speed,
                duration: scenario.duration,
                onPlay: playback.play,
                onPause: playback.pause,
                onReset: playback.reset,
                onSeek: playback.seek,
                onSpeedChange: playback.setSpeed,
              }
            : null
        }
      />
    </div>
  );
}

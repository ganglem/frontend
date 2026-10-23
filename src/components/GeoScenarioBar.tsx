"use client";

import { useState } from "react";
import { Check, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/SimpleSelect";
import { useDatasetsQuery, useNamespacesQuery, useSnapshotsQuery } from "@/hooks/useCatalog";
import type { SnapshotInfo } from "@/types/api";

const SPEEDS = [1, 2, 4];

const snapshotLabel = (s: SnapshotInfo) =>
  `#${s.snapshotId} · ${new Date(s.timestampMs).toLocaleString()}${s.operation ? ` · ${s.operation}` : ""}`;

const formatTime = (seconds: number) => {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export interface PlaybackControls {
  time: number;
  playing: boolean;
  speed: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSeek: (t: number) => void;
  onSpeedChange: (speed: number) => void;
}

interface GeoScenarioBarProps {
  // Present once a scenario is loaded; shows the play bar.
  playback: PlaybackControls | null;
  onApply: (selection: { namespace: string; dataset: string; snapshot: string }) => void;
}

// Bottom dock: namespace -> dataset -> snapshot pickers (each appears once the
// previous is chosen) with an Apply button, plus a play bar after a scenario
// has been loaded.
export function GeoScenarioBar({ playback, onApply }: GeoScenarioBarProps) {
  const [namespace, setNamespace] = useState("");
  const [dataset, setDataset] = useState("");
  const [snapshot, setSnapshot] = useState(""); // label of the chosen snapshot

  const namespacesQuery = useNamespacesQuery();
  const datasetsQuery = useDatasetsQuery(namespace);
  const snapshotsQuery = useSnapshotsQuery(namespace, dataset);

  const namespaceItems = namespacesQuery.data?.data.map((n) => n.name) ?? [];
  const datasetItems = datasetsQuery.data?.datasets.map((d) => d.name) ?? [];
  const snapshotItems = snapshotsQuery.data?.snapshots.map(snapshotLabel) ?? [];

  return (
    <div
      data-slot="card"
      className="fixed bottom-4 left-1/2 z-30 w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 space-y-3 rounded-3xl p-3 shadow-lg ring-1 ring-foreground/10"
    >
      {playback ? (
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            className="rounded-full"
            onClick={playback.playing ? playback.onPause : playback.onPlay}
            aria-label={playback.playing ? "Pause" : "Play"}
          >
            {playback.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={playback.onReset} aria-label="Restart">
            <RotateCcw className="size-4" />
          </Button>
          <input
            type="range"
            min={0}
            max={playback.duration}
            step={0.1}
            value={playback.time}
            onChange={(e) => playback.onSeek(Number(e.target.value))}
            aria-label="Scenario time"
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary"
          />
          <span className="w-20 shrink-0 text-right text-xs tabular-nums">
            {formatTime(playback.time)} / {formatTime(playback.duration)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="w-10 rounded-full tabular-nums"
            onClick={() => playback.onSpeedChange(SPEEDS[(SPEEDS.indexOf(playback.speed) + 1) % SPEEDS.length])}
            aria-label="Playback speed"
          >
            {playback.speed}×
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-28 flex-1">
          <SimpleSelect
            value={namespace}
            onValueChange={(v) => {
              setNamespace(v);
              setDataset("");
              setSnapshot("");
            }}
            items={namespaceItems}
            placeholder="Namespace"
            isLoading={namespacesQuery.isLoading}
          />
        </div>

        {namespace ? (
          <div className="min-w-28 flex-1">
            <SimpleSelect
              value={dataset}
              onValueChange={(v) => {
                setDataset(v);
                setSnapshot("");
              }}
              items={datasetItems}
              placeholder="Dataset"
              isLoading={datasetsQuery.isLoading}
            />
          </div>
        ) : null}

        {dataset ? (
          <div className="min-w-40 flex-[2]">
            <SimpleSelect
              value={snapshot}
              onValueChange={setSnapshot}
              items={snapshotItems}
              placeholder="Snapshot"
              isLoading={snapshotsQuery.isLoading}
            />
          </div>
        ) : null}

        {snapshot ? (
          <Button onClick={() => onApply({ namespace, dataset, snapshot })}>
            <Check className="size-4" />
            Apply
          </Button>
        ) : null}
      </div>
    </div>
  );
}

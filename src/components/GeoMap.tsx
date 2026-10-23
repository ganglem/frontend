"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { requireEnv } from "@/lib/env";
import type { GeoPoint } from "@/types/geo";

// Deferred to first use rather than module scope, same as the API/Keycloak
// URLs - the build prerenders every page and must not need these set.
function getMapStyleUrl() {
  return requireEnv("NEXT_PUBLIC_MAP_STYLE_URL", process.env.NEXT_PUBLIC_MAP_STYLE_URL);
}

function getTerrainTilesUrl() {
  return requireEnv("NEXT_PUBLIC_MAP_TERRAIN_TILES_URL", process.env.NEXT_PUBLIC_MAP_TERRAIN_TILES_URL);
}

function getSatelliteTilesUrl() {
  return requireEnv("NEXT_PUBLIC_MAP_SATELLITE_TILES_URL", process.env.NEXT_PUBLIC_MAP_SATELLITE_TILES_URL);
}

export type Basemap = "map" | "satellite";

// Worker is copied into public/ by scripts/copy-maplibre-worker.mjs (predev/
// prebuild) - see that file for why the default lookup breaks under Turbopack.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// Zoom limits. Below GLOBE_BELOW_ZOOM the view is a 3D globe; between that and
// FLAT_ABOVE_ZOOM it blends smoothly into the flat (Mercator) map, like Google
// Maps. Panning is unbounded.
const MIN_ZOOM = 1.5;
const MAX_ZOOM = 18;
const GLOBE_BELOW_ZOOM = 5;
const FLAT_ABOVE_ZOOM = 8;

// Tilt allowed at a zoom level: none at world scale (a tilted globe sits
// off-screen), ramping to the full MAX_PITCH once the map is flat.
const MAX_PITCH = 85;
const pitchCap = (zoom: number) => MAX_PITCH * Math.min(1, Math.max(0, (zoom - 4) / (FLAT_ABOVE_ZOOM - 4)));

const POINTS_SOURCE = "geo-points";
const POINTS_LAYER = "geo-points-layer";
const SATELLITE_LAYER = "satellite-layer";

// Flat 2D marker drawn once to a canvas and registered as a map image; the
// symbol layer then places it in 3D via symbol-height-offset.
function markerImage(selected: boolean) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  ctx.beginPath();
  ctx.arc(c, c, selected ? 26 : 18, 0, Math.PI * 2);
  ctx.fillStyle = selected ? "#f59e0b" : "#2563eb";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  if (selected) {
    ctx.beginPath();
    ctx.arc(c, c, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  return ctx.getImageData(0, 0, size, size);
}

function toFeatureCollection(points: GeoPoint[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: { id: p.id, name: p.name, height: p.height, selected: p.id === selectedId },
    })),
  };
}

interface GeoMapProps {
  className?: string;
  points: GeoPoint[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  basemap: Basemap;
}

// Tilted vector map with real elevation (raster-dem terrain + hillshade), the
// style's extruded 3D buildings, and a data layer of points floating at a
// height above the ground.
export function GeoMap({ className, points, selectedId, onSelect, basemap }: GeoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // Latest data/callback for the map's one-time load/click handlers.
  const latest = useRef({ points, selectedId, onSelect, basemap });

  useEffect(() => {
    latest.current = { points, selectedId, onSelect, basemap };
    const map = mapRef.current;
    const source = map?.getSource(POINTS_SOURCE) as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(points, selectedId));
    if (map?.getLayer(SATELLITE_LAYER)) {
      map.setLayoutProperty(SATELLITE_LAYER, "visibility", basemap === "satellite" ? "visible" : "none");
    }
  }, [points, selectedId, onSelect, basemap]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: getMapStyleUrl(),
      center: [9.5115, 47.6713], // Friedrichshafen airport (FDH)
      zoom: 14,
      pitch: 60,
      bearing: 20,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxPitch: MAX_PITCH,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    // Zooming out flattens the camera toward the globe view. While zooming,
    // the allowed tilt is lowered via maxPitch (changing pitch directly would
    // interrupt the scroll-zoom animation); once zoom settles, the tilt the
    // user chose is eased back in as far as the new zoom allows.
    let userPitch = map.getPitch();
    map.on("pitch", (e) => {
      if (e.originalEvent) userPitch = map.getPitch(); // user-driven only
    });
    map.on("zoom", () => map.setMaxPitch(pitchCap(map.getZoom())));
    map.on("zoomend", () => {
      const target = Math.min(userPitch, pitchCap(map.getZoom()));
      if (Math.abs(map.getPitch() - target) > 0.5) map.easeTo({ pitch: target, duration: 400 });
    });

    map.addControl(new NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new ScaleControl(), "bottom-left");

    // Surfaces tile/style failures (CORS, 404, worker) instead of a silent
    // blank map; dev server mirrors browser errors into its log.
    map.on("error", (e) => console.error("[geomap]", e.error?.message ?? e));

    map.on("load", () => {
      map.setProjection({
        type: [
          "interpolate",
          ["linear"],
          ["zoom"],
          GLOBE_BELOW_ZOOM,
          "vertical-perspective",
          FLAT_ABOVE_ZOOM,
          "mercator",
        ],
      });
      // Atmosphere glow around the globe, fading out as the map flattens.
      map.setSky({
        "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, GLOBE_BELOW_ZOOM, 1, FLAT_ABOVE_ZOOM, 0],
      });

      map.addSource("terrain-dem", {
        type: "raster-dem",
        tiles: [getTerrainTilesUrl()],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 15,
      });
      map.setTerrain({ source: "terrain-dem", exaggeration: 1.4 });

      // Shade slopes below the labels so relief reads at a glance.
      const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
      map.addLayer(
        {
          id: "terrain-hillshade",
          type: "hillshade",
          source: "terrain-dem",
          // Below this the DEM's ocean-floor data shows up as ripples on the globe.
          minzoom: 6,
          paint: { "hillshade-exaggeration": 0.5 },
        },
        firstSymbol,
      );

      map.addImage("point", markerImage(false), { pixelRatio: 2 });
      map.addImage("point-selected", markerImage(true), { pixelRatio: 2 });
      map.addSource(POINTS_SOURCE, {
        type: "geojson",
        data: toFeatureCollection(latest.current.points, latest.current.selectedId),
      });
      map.addLayer({
        id: POINTS_LAYER,
        type: "symbol",
        source: POINTS_SOURCE,
        layout: {
          "icon-image": ["case", ["get", "selected"], "point-selected", "point"],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          // Metres above the terrain surface under each point.
          "symbol-height-offset": ["get", "height"],
          "symbol-height-anchor": "ground",
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
          "text-offset": [0, 1.3],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#111827",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      // Imagery sits under the labels and points but over the vector fills,
      // so labels/places stay readable on the photo. Added last: a missing
      // env var then can't prevent the rest of the layers from loading.
      map.addSource("satellite", {
        type: "raster",
        tiles: [getSatelliteTilesUrl()],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
      });
      map.addLayer(
        {
          id: SATELLITE_LAYER,
          type: "raster",
          source: "satellite",
          layout: { visibility: latest.current.basemap === "satellite" ? "visible" : "none" },
        },
        firstSymbol,
      );

      map.on("click", POINTS_LAYER, (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) latest.current.onSelect(id);
      });
      map.on("mouseenter", POINTS_LAYER, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", POINTS_LAYER, () => (map.getCanvas().style.cursor = ""));
    });

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}

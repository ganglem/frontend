import type { GeoKeyframe, GeoPoint, GeoScenario, GeoTrack } from "@/types/geo";

// Friedrichshafen airport (FDH): where mock scenarios are staged.
const CENTER = { lon: 9.5115, lat: 47.6713 };
const TRACK_COUNT = 5;
const KEYFRAME_COUNT = 5;
const DURATION_S = 60;

// Deterministic PRNG so the same namespace/dataset/snapshot always yields the
// same scenario.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// PLACEHOLDER: the Lakehouse API has no position data yet, so a "loaded"
// scenario is generated from the selection's name. Replace with a mapper from
// real query rows (id, t, lon, lat, height) into GeoTrack[].
export function buildMockScenario(seedText: string): GeoScenario {
  const rand = mulberry32(hash(seedText));
  const tracks: GeoTrack[] = [];

  for (let i = 0; i < TRACK_COUNT; i++) {
    // Start within ~1 km of the airport, then wander in a gently turning path.
    let lon = CENTER.lon + (rand() - 0.5) * 0.02;
    let lat = CENTER.lat + (rand() - 0.5) * 0.014;
    let height = 60 + rand() * 300;
    let heading = rand() * Math.PI * 2;
    const keyframes: GeoKeyframe[] = [];

    for (let k = 0; k < KEYFRAME_COUNT; k++) {
      keyframes.push({ t: (k / (KEYFRAME_COUNT - 1)) * DURATION_S, lon, lat, height });
      heading += (rand() - 0.5) * (Math.PI / 1.5);
      const step = 0.004 + rand() * 0.004; // degrees, ~300-600 m
      lon += Math.cos(heading) * step * 1.3; // lon degrees are shorter at this latitude
      lat += Math.sin(heading) * step;
      height = Math.min(800, Math.max(30, height + (rand() - 0.5) * 300));
    }
    tracks.push({ id: `t${i + 1}`, name: `Point ${i + 1}`, keyframes });
  }

  return { name: seedText, duration: DURATION_S, tracks };
}

const smoothstep = (x: number) => x * x * (3 - 2 * x);

// Position at time `t`: eased interpolation between the two surrounding
// keyframes, held at the first/last keyframe outside the track's range.
export function positionAt(track: GeoTrack, t: number): Pick<GeoPoint, "lon" | "lat" | "height"> {
  const kf = track.keyframes;
  if (t <= kf[0].t) return kf[0];
  const last = kf[kf.length - 1];
  if (t >= last.t) return last;

  const next = kf.findIndex((k) => k.t > t);
  const a = kf[next - 1];
  const b = kf[next];
  const f = smoothstep((t - a.t) / (b.t - a.t));
  return {
    lon: a.lon + (b.lon - a.lon) * f,
    lat: a.lat + (b.lat - a.lat) * f,
    height: a.height + (b.height - a.height) * f,
  };
}

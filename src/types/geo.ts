// A point placed on the geomap. `height` is metres above the local ground
// (terrain surface), not above sea level.
export interface GeoPoint {
  id: string;
  name: string;
  lon: number;
  lat: number;
  height: number;
}

// A position the point should be at, `t` seconds into the scenario.
export interface GeoKeyframe {
  t: number;
  lon: number;
  lat: number;
  height: number;
}

export interface GeoTrack {
  id: string;
  name: string;
  keyframes: GeoKeyframe[];
}

// A loaded data scenario: moving points described by key positions. Everything
// between keyframes is interpolated by the client.
export interface GeoScenario {
  name: string;
  duration: number; // seconds
  tracks: GeoTrack[];
}

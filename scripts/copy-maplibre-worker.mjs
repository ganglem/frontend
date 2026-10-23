// MapLibre derives its worker URL from its own module location, which Turbopack
// rewrites to a chunk path where the worker doesn't exist. Serving the worker
// from public/ and pointing setWorkerUrl at it sidesteps the bundler.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/maplibre", { recursive: true });
copyFileSync(
  "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
  "public/maplibre/maplibre-gl-worker.mjs",
);

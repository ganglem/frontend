# TODO: port the new frontend look & behavior to the deviating branch

## Premise

Functionality from this repo has already been merged into the deviating branch (the deployed
app / "other project"). Most screens, components and flows **already exist there but look and
feel worse**. This task is **purely visual and behavioral on the frontend**: make the deviating
branch look and behave like this repo does at commit `7551588` (branch `feature/geomap`).

Nothing here is new product functionality except the Geomap page, which is a new page that has
to be added.

**Source of truth for "what it should look like":** run this repo with `npm run dev:noauth` and
compare page by page. For code, use `git show 7551588` (17 files) as the reference diff, but
**merge by hand, never copy files wholesale** over the deviating branch (see "Do not touch").

## Hard boundaries (read first)

This is frontend presentation only. **Do not touch:**

- Anything backend or agent-related: `src/app/api/chat/route.ts`, `src/lib/chat/*`
  (including `chatModelAdapter.ts`, `backendClient.ts`), `src/types/chat.ts`,
  `src/lib/mocks/chatFixtures.ts`, `src/lib/api/chat.ts`, the MCP server and the chat backend
  contract (`CHAT_BACKEND_URL` / `CHAT_BACKEND_API_KEY`).
- The API/auth layer, per `TODO.md`: `src/lib/api/*.ts`, `src/types/api.ts`,
  `src/lib/keycloak.ts`, `src/hooks/useAuth.tsx`, `src/lib/env.ts` (or their equivalents).
  The deployed copies are authoritative.
- `useGeneratedCards.tsx`, `ChatRuntime`'s logic inside `ChatPanel.tsx` (adapter wiring,
  `getSession`/`getCards`/`getTargetPath`, `onVisualization`) — the agent's behavior must stay
  exactly as it is. Only the panel's *shell* (positioning, sizing, styling, open/close) changes.
- Deployed sidebar **dark mode support and Airbus "A" logo** (from `TODO.md`) stay.

If a step seems to need a backend or agent change, **stop and write it down** instead of doing it.

## What to port

### 1. Liquid-glass styling (global)

Translucent (50%) surfaces with `backdrop-filter` blur, app-wide. All in one CSS block at the
end of `src/app/globals.css`:

- Glass surfaces: the sidebar inner panel `[data-sidebar="sidebar"]`, the chat panel
  `[data-slot="chat-panel"]`, `[data-slot="card"]` (every card), `dropdown-menu-content`,
  `select-content`. Background is `color-mix(in oklab, var(--card) 50%, transparent)`,
  `blur(24px) saturate(1.8)`, a bright inset top edge, and a **tight** drop shadow (a large soft
  shadow looked like blur spilling outside the card).
- Sidebar nav items get their own small frosted pane on hover/active
  (`[data-slot="sidebar-menu-button"]`).
- Inside the chat panel: thread root and footer transparent, **chat bubbles stay solid**
  (assistant message content gets an opaque `--card` bubble), scrollbars hidden.
- **Do not** add the ambient background gradient (it was tried and explicitly rejected).

Gotcha (cost hours): do **not** hand-write `-webkit-backdrop-filter` next to `backdrop-filter`.
The CSS minifier (Lightning CSS) kept only the prefixed one and dropped the standard property, so
Chrome computed `backdrop-filter: none`. Write only the standard property; the build adds the
prefix itself. Verify with `getComputedStyle(el).backdropFilter` in a real browser.

Deviating-branch components may use different markup/`data-slot`s or have their own background
classes (`bg-card`, `bg-sidebar`, …); adapt selectors rather than rewriting components, and check
that nested solid backgrounds don't defeat the effect.

### 2. Chat panel shell (`src/components/chat/ChatPanel.tsx`) — presentation only

- The attached right-edge "Ask the data" tab becomes a **round icon button in the top-right
  corner** (`ToggleTab`); clicking it expands the panel **from that corner**
  (`origin-top-right`, `animate-in fade-in-0 zoom-in-[0.15]`, `ease-bounce`).
- Panel is `fixed top-4 right-4`, `h-[calc(100dvh-2rem)]`, **horizontally resizable**: drag handle
  on the left edge (`ResizeHandle`, pointer capture), default 368px, min 320px, max viewport − 3rem,
  double-click toggles default ↔ half the viewport.
- Add `data-slot="chat-panel"` to the panel root (the glass CSS keys off it).
- Mobile path (`Sheet`) keeps working; it only picks up the new round button.
- Header/thread content and everything under `ChatRuntime` stay as-is.

### 3. Sidebar (`src/components/AppSidebar.tsx`)

- Add the **Geomap** nav item (`Globe` icon, `/geomap`).
- Footer row: the collapse button and a **circular, icon-only sun/moon toggle** side by side
  (stacks vertically when collapsed to icons).
- The deployed sidebar **already has dark mode**: reuse *its* toggle in that slot (restyled
  circular, icon-only). Do **not** add this repo's `ThemeToggle`/inline theme script on top.
  If the deployed dark mode works differently (class vs. data attribute), the glass CSS must work
  with both themes — check `--card`-based colors in dark.
- Keep the deployed Airbus logo and the "Beta" badge on Overview.

### 4. New page: `/geomap`

Files (all new unless noted): `src/app/(app)/geomap/page.tsx`, `src/components/GeoMap.tsx`,
`BasemapToggle.tsx`, `PointEditor.tsx`, `GeoScenarioBar.tsx`, `src/hooks/usePlayback.ts`,
`src/lib/geo/scenario.ts`, `src/types/geo.ts`, `scripts/copy-maplibre-worker.mjs`.

Dependency: `maplibre-gl` only (three.js / Google tiles were tried and removed).

Env vars (required, lazy getters via `requireEnv`, no hardcoded URLs — same convention as the
rest of the app; add to `.env.local`, they are git-ignored):

```
NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
NEXT_PUBLIC_MAP_TERRAIN_TILES_URL=https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
NEXT_PUBLIC_MAP_SATELLITE_TILES_URL=https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
```

Worker (required or the map is blank — log shows `Worker failed to load`): MapLibre derives its
worker URL from its module location, which Turbopack rewrites to a path where it doesn't exist.
`scripts/copy-maplibre-worker.mjs` copies `maplibre-gl-worker.mjs` into `public/maplibre/`;
`package.json` runs it as `predev`, `predev:noauth`, `prebuild`; `.gitignore` has
`/public/maplibre/`; `GeoMap.tsx` calls `setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")`.

Behavior to match:

- **Full-screen map** behind all UI (`fixed inset-0 z-0`); sidebar, chat, dock, popups float over
  it as glass.
- **Projection:** 3D globe below zoom 5 blending to flat Mercator by zoom 8
  (`GLOBE_BELOW_ZOOM`/`FLAT_ABOVE_ZOOM`), atmosphere glow fading out, dark space background.
  Zoom limits 1.5–18, panning unbounded (the earlier bounding box was removed on request).
- **Tilt vs. zoom:** a tilted camera pushes the globe off-screen, so allowed pitch scales from 0
  (zoom ≤ 4) to 85° (flat). Applied via `map.setMaxPitch` on `zoom`, and the user's own tilt is
  eased back on `zoomend`. Do **not** call `setPitch` inside the `zoom` handler — it interrupts the
  scroll-zoom animation and zooming stalls partway.
- **3D:** raster-dem terrain (exaggeration 1.4) + hillshade (`minzoom: 6`; below that the DEM's
  ocean-floor data shows as ripples on the globe) + the style's extruded buildings.
- **Satellite:** raster layer inserted *below the first symbol layer* so labels stay on top;
  toggled with `visibility`. `BasemapToggle` is an **icon-only** (map / satellite) glass pill at the
  bottom-left, positioned right of the sidebar via `useSidebar()` (tracks collapsed width).
- **Points:** GeoJSON source + `symbol` layer, `symbol-height-offset: ["get","height"]` with
  `symbol-height-anchor: "ground"` (metres above ground), 2D marker icon drawn to a canvas,
  selected point highlighted (orange). Click a point → `PointEditor`.
- **PointEditor:** glass popup, top-centre, crosshair icon + name + lon/lat/height sliders
  (lon/lat ±0.05° around where the point was when selected; height 0–5000 m AGL).
- **GeoScenarioBar (bottom dock):** Namespace → Dataset → Snapshot dropdowns, each appears once
  the previous is chosen, **Apply** appears after the third. After Apply a **play bar** appears
  above (play/pause, restart, scrub slider, time, 1×/2×/4×). The dock and the point editor share
  one width (`min(40rem, 100vw-2rem)`).
- **Initial view:** Friedrichshafen airport (FDH), `[9.5115, 47.6713]`, zoom 14, pitch 60.
- Slider edits are kept as an offset from the scenario path (`offsets` in `page.tsx`) so a moved
  point keeps following its track.

The dropdowns use the existing catalog hooks (`useNamespacesQuery`, `useDatasetsQuery`,
`useSnapshotsQuery` from `hooks/useCatalog.ts`) — confirm the deviating branch has them or their
equivalents, and use **its** versions; this is read-only use of the existing data layer.

**The scenario data is mock.** `buildMockScenario` in `src/lib/geo/scenario.ts` generates five
moving points from a seed (the selection). The API has no position data, so leave it mock; wiring
real rows into `GeoTrack[]` is a separate, backend-dependent task — out of scope here.

### 5. Minor

- `src/app/layout.tsx`: `suppressHydrationWarning` on `<html>` + the pre-paint theme script exist
  only for this repo's `ThemeToggle`; skip both if the deployed dark mode already handles this.
- Cards, dialogs, tables, forms across **all** existing pages pick up the glass automatically via
  the global CSS — see the verification list.

## Working method / gotchas

1. Branch off the deviating branch; port section by section; commit per section.
2. **Check line endings before editing.** Several files in this repo are CRLF
   (`package.json`, `layout.tsx`, `AppSidebar.tsx`). A scripted rewrite silently turned them to LF
   and produced a 400-line diff for a 10-line change. Check with
   `git show HEAD:<file> | grep -c $'\r'` and preserve the file's existing endings.
3. `NEXT_PUBLIC_*` is inlined at **build** time, and `next dev` needs a restart after `.env.local`
   changes. When running Windows Node from WSL, env vars don't cross over without
   `WSLENV=NEXT_PUBLIC_AUTH_MODE` — a build without it silently runs in Keycloak mode.
4. Verify visually in a real browser, not just `tsc`. A headless Chrome driven over the DevTools
   protocol worked well (log in via the noauth button, click through, screenshot, and read
   `getComputedStyle`); blur and map issues were all invisible to type-checking.
5. Conventions from `AGENTS.md` still apply (PascalCase component files, kebab-case in
   `components/ui`, lazy env getters, toasts for one-shot results). The Next.js here has breaking
   changes — read `node_modules/next/dist/docs/` before relying on memory.

## Verification checklist

- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` clean.
- [ ] `npm run dev:noauth`: every page (Namespaces, Upload, Query, Datasets, Overview, Geomap) —
      cards/tables/forms/inputs stay **legible** on glass in light *and* dark; no solid-white
      boxes left over inside glass panels; blur actually applied (computed `backdrop-filter`).
- [ ] Chat: opens from the top-right button, expands from the corner, resizes by dragging and
      double-click, closes; bubbles solid, body glass, no scrollbar. **Agent behavior unchanged**
      (send a message, a visualization card still spawns on the current page, clear conversation).
- [ ] Sidebar: collapse/expand, round dark-mode toggle beside it, Geomap item, Airbus logo and
      dark-mode support intact; dropdown/select menus are glass.
- [ ] Geomap: globe when zoomed out, smooth flatten, can zoom out/in without stalling, terrain
      + buildings at zoom 15+, satellite toggle, points render at height, click → editor → sliders
      move the point, dropdown cascade → Apply → play bar → play/pause/scrub/speed.
- [ ] Mobile width (~400px): Geomap dock/popup fit, toggle visible, chat sheet works (untested
      in this repo so far).
- [ ] `git diff <deviating-branch>` touches **none** of the "do not touch" files.

## Known rough edges (don't "fix" without asking)

- With the gradient removed, glass cards on plain white pages have little behind them to blur —
  expected; the effect is strongest on `/geomap`.
- Dialogs (`ConfirmDialog`) and tooltips are not glass.
- MapLibre's expanded attribution can sit under the bottom dock until the map is first touched.
- Public tile servers (OpenFreeMap, AWS terrain, Esri World Imagery) are fine for dev; check terms
  and uptime before production — all three are swappable via the env vars. Esri imagery in
  particular has usage terms.
- Geomap sample/scenario data is placeholder (generic "Point N" names around FDH).

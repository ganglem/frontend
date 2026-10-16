# TODO: real Keycloak + API integration

## Current status

There's a **deployed version of this app that's older than this repo's current state**, but it isn't just stale — since it went out, the backend has been adjusted, and (presumably in step with that) its own API-integration layer has moved on too. It also carries two pieces of branding this repo doesn't have: a **dark mode toggle in the sidebar**, and a **large Airbus "A" logo** in place of this repo's placeholder "DL" mark. The deployed repo isn't available in this working directory — whoever does this merge needs access to it separately.

**Treat the deployed version as the base you're updating, not something to overwrite with this repo.** Concretely:

### Do not touch (the deployed version's copy is authoritative)

- Everything under `src/lib/api/*.ts`, `src/types/api.ts`, `src/lib/keycloak.ts`, `src/hooks/useAuth.tsx`, `src/lib/env.ts` — or whatever the deployed repo's equivalents are named. If a file's job is talking to the Lakehouse Gateway API or Keycloak, assume the deployed copy already reflects the real, adjusted backend and this repo's copy does not (this repo has never been run against a live backend at all — see sections 1–4 above). Port UI/feature code *around* these files; don't replace them wholesale with this repo's versions.
- The deployed sidebar's **dark mode support** and **Airbus "A" logo**. Don't bring over this repo's `AppSidebar.tsx` wholesale (it has neither) — adapt the new nav/structure into the deployed sidebar, keeping its dark mode and logo intact.

### Do bring over from this repo

1. **The card-based dashboard system**: `AppCard`, `SortableCardList`/`SortableItem`, `useSectionOrder`, `Collapsible`, the `use<Page>Cards()` hook pattern, and the per-page card components in `src/components/cards/`.
2. **The chat/AI assistant integration**: `src/app/api/chat/route.ts`, `src/lib/chat/*`, `src/lib/mocks/chatFixtures.ts`, `src/lib/api/chat.ts`, `src/types/chat.ts`, `src/hooks/useGeneratedCards.tsx`, `src/components/chat/*`, `src/components/assistant-ui/*`, `src/components/cards/ChatVisualizationCard.tsx`, `src/components/ui/chart.tsx`, plus the new dependencies (`@assistant-ui/react`, `@assistant-ui/react-markdown`, `recharts`, `remark-gfm`, `server-only`). The `/api/chat` route is a thin proxy + secret holder — it doesn't touch the Lakehouse Gateway API at all, so it should drop into the deployed repo without conflicting with its API layer. **Still "GUESS, NOT CONFIRMED"**: the colleague's real chat/MCP backend contract — see `src/types/chat.ts`'s banner comment before wiring `CHAT_BACKEND_URL` to anything real.
3. **Resolved: nav is Namespaces/Upload/Query/Datasets (the "four paths"), plus `Overview` kept as a beta-testing page**, not a production destination — it's now labeled as such (a "Beta" badge in `AppSidebar.tsx`'s nav item and on the page's own `PageHeader` in `src/app/(app)/overview/page.tsx`). Keep that labeling when merging into the deployed sidebar — don't quietly drop the beta marker, and don't drop the page itself.
4. **A card spawns wherever the user was chatting from, not just Overview.** Every page's `use<Page>Cards()` hook now calls `useChatVisualizationCardsForPath("/that-page")` (see `src/hooks/useGeneratedCards.tsx`'s `DASHBOARD_PATHS`/`PinnedVisualization`/`targetPath`), and `chatModelAdapter.ts` stamps the current page (`usePathname()`, via `ChatPanel.tsx`'s `ChatRuntime`) onto each card as it's created. `Overview`'s page still aggregates every other page's hook (each of which now already includes its own chat cards) plus its own directly-targeted ones — it doesn't double-count. Bring all of this over together; it doesn't work piecemeal.

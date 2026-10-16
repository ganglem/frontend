// Kept separate from types/api.ts, which is scoped to mirror api-docs-v2.json
// field-for-field - the chat backend is a different service entirely.
//
// The "Internal contract" below is ours to define and is stable. The
// "External contract" is a GUESS, NOT CONFIRMED - the colleague who owns
// that backend hasn't shared its real request/response shape, auth header,
// or streaming behavior yet. Everything unconfirmed is isolated to that
// section plus src/app/api/chat/route.ts and src/lib/chat/backendClient.ts -
// updating all three together is what it takes to swap in the real contract.

// --- Internal contract: browser <-> this repo's /api/chat route ---

export type ChatRole = "user" | "assistant";

export type ChatMessageStatus = "pending" | "streaming" | "complete" | "error";

export interface ChatVisualizationPayload {
  id: string;
  title: string;
  description?: string;
  chartType: "bar" | "line" | "area" | "pie";
  xKey: string;
  series: { key: string; label?: string }[];
  data: Record<string, unknown>[];
  sourceQuery?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status?: ChatMessageStatus;
  visualizations?: ChatVisualizationPayload[];
}

export interface ChatHistoryEntry {
  role: ChatRole;
  content: string;
}

// What the assistant currently sees of the dashboard: full data, not just
// titles, so it can reason about values ("which namespace has the most
// rows") - not only recreate but also read and edit what's already pinned.
export type ChatCardContext = ChatVisualizationPayload;

export interface ChatSendRequest {
  conversationId: string;
  message: string;
  history: ChatHistoryEntry[];
  context?: {
    catalogId?: string;
    cards?: ChatCardContext[];
  };
}

export type ChatStreamEvent =
  | { type: "token"; delta: string }
  | { type: "visualization"; payload: ChatVisualizationPayload }
  | { type: "visualization_update"; id: string; patch: Partial<Omit<ChatVisualizationPayload, "id">> }
  | { type: "done"; message: ChatMessage }
  | { type: "error"; message: string };

// --- External contract: src/app/api/chat/route.ts <-> colleague's backend ---
// GUESS, NOT CONFIRMED. Field names, auth header scheme, and whether this
// backend streams at all are all placeholders pending the real spec.

export interface ChatBackendRequest {
  conversationId: string;
  message: string;
  history: ChatHistoryEntry[];
  context?: { catalogId?: string; cards?: ChatCardContext[] };
}

export interface ChatBackendResponse {
  message: string;
  visualizations?: ChatVisualizationPayload[];
}

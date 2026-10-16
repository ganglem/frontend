import "server-only";

import type {
  ChatBackendRequest,
  ChatBackendResponse,
  ChatMessage,
  ChatSendRequest,
  ChatStreamEvent,
} from "@/types/chat";

// Talks to the colleague's chat/MCP backend - a separate service, not part
// of this repo. GUESS, NOT CONFIRMED: endpoint path, auth header scheme, and
// response shape are all placeholders pending their real API contract. This
// module is the one place that needs to change once it's confirmed - the
// route handler calling it and the browser-facing SSE contract stay stable
// regardless (see src/types/chat.ts's "External contract" note).
//
// "server-only" above makes an accidental client-side import of this module
// (and the API key it reads) fail the build instead of silently bundling
// the secret into client JS - worth it since this is the first server-only
// secret this repo holds.

let backendUrl: string | null = null;

function getChatBackendUrl() {
  backendUrl ??= (process.env.CHAT_BACKEND_URL ?? "").replace(/\/$/, "");

  return backendUrl;
}

export function isChatBackendConfigured() {
  return !!process.env.CHAT_BACKEND_URL;
}

function toBackendRequest(request: ChatSendRequest): ChatBackendRequest {
  return {
    conversationId: request.conversationId,
    message: request.message,
    history: request.history,
    context: request.context,
  };
}

// Normalizes whatever the real backend turns out to send into our stable
// internal ChatStreamEvent shape. Until the real contract's streaming
// behavior is confirmed, this assumes a single JSON response per request -
// swap this function's body for an SSE/chunked reader if theirs streams,
// without touching anything else (route.ts, lib/api/chat.ts, the UI).
export async function* streamFromChatBackend(
  request: ChatSendRequest,
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch(`${getChatBackendUrl()}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CHAT_BACKEND_API_KEY ?? ""}`,
    },
    body: JSON.stringify(toBackendRequest(request)),
  });

  if (!response.ok) {
    yield { type: "error", message: `Chat backend request failed with status ${response.status}.` };
    return;
  }

  const data = (await response.json()) as ChatBackendResponse;

  if (data.message) {
    yield { type: "token", delta: data.message };
  }

  for (const payload of data.visualizations ?? []) {
    yield { type: "visualization", payload };
  }

  const message: ChatMessage = {
    id: `${request.conversationId}-${crypto.randomUUID()}`,
    role: "assistant",
    content: data.message ?? "",
    createdAt: new Date().toISOString(),
    status: "complete",
    visualizations: data.visualizations ?? [],
  };

  yield { type: "done", message };
}

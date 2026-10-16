import type { FrontendSession } from "@/types/api";
import type { ChatCardContext, ChatHistoryEntry, ChatStreamEvent } from "@/types/chat";

// Doesn't reuse request()/requestJson() from lib/api/client.ts - those
// target the external Lakehouse Gateway via getApiBaseUrl() and parse a
// single JSON body. This hits this repo's own same-origin /api/chat route
// and needs to read a streaming body, so it gets its own small fetch here.
// An async generator rather than a callback - it's the natural shape for
// the assistant-ui ChatModelAdapter that consumes it (see
// src/lib/chat/chatModelAdapter.ts), which is itself an async generator.
interface SendChatMessageInput {
  conversationId: string;
  message: string;
  history: ChatHistoryEntry[];
  cards?: ChatCardContext[];
}

export async function* sendChatMessage(
  session: FrontendSession,
  input: SendChatMessageInput,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({
      conversationId: input.conversationId,
      message: input.message,
      history: input.history,
      context: { catalogId: session.catalogId, cards: input.cards },
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    yield { type: "error", message: `Chat request failed with status ${response.status}.` };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));

      if (!line) {
        continue;
      }

      try {
        yield JSON.parse(line.slice("data: ".length)) as ChatStreamEvent;
      } catch {
        // Malformed frame - skip it rather than killing the whole stream.
      }
    }
  }
}

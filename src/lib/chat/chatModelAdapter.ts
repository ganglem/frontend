import type {
  ChatModelAdapter,
  ChatModelRunResult,
  TextMessagePart,
  ThreadMessage,
} from "@assistant-ui/react";
import { sendChatMessage } from "@/lib/api/chat";
import type { FrontendSession } from "@/types/api";
import type { ChatCardContext, ChatHistoryEntry, ChatVisualizationPayload } from "@/types/chat";

// Bridges this repo's own /api/chat SSE contract (src/types/chat.ts,
// src/lib/api/chat.ts) into assistant-ui's ChatModelAdapter shape, so
// useLocalRuntime() can drive the pre-built Thread UI without assistant-ui
// needing to know anything about our backend. Everything upstream of this
// file (route.ts, backendClient.ts, chatFixtures.ts) is unchanged by the UI
// swap - only the consumer of the event stream changed shape (async
// generator -> async generator, just a different caller).
function extractText(message: ThreadMessage): string {
  return message.content
    .filter((part): part is TextMessagePart => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function toHistoryEntry(message: ThreadMessage): ChatHistoryEntry | null {
  if (message.role !== "user" && message.role !== "assistant") {
    return null;
  }

  return { role: message.role, content: extractText(message) };
}

interface CreateChatModelAdapterOptions {
  getSession: () => FrontendSession | null;
  conversationId: string;
  // Read access: the assistant sees what's currently pinned, including its
  // data, not just titles - it can reason about values, not only recreate.
  getCards: () => ChatCardContext[];
  // Write access: how the assistant creates or edits a dashboard card.
  onVisualization: (payload: ChatVisualizationPayload) => void;
  onVisualizationUpdate: (id: string, patch: Partial<Omit<ChatVisualizationPayload, "id">>) => void;
}

export function createChatModelAdapter(options: CreateChatModelAdapterOptions): ChatModelAdapter {
  const { getSession, conversationId, getCards, onVisualization, onVisualizationUpdate } = options;

  return {
    async *run({ messages, abortSignal }) {
      const session = getSession();

      if (!session) {
        const result: ChatModelRunResult = {
          content: [{ type: "text", text: "You need to be signed in to chat." }],
        };
        yield result;
        return;
      }

      const latest = messages[messages.length - 1];
      const userText = latest ? extractText(latest) : "";
      const history = messages.slice(0, -1).map(toHistoryEntry).filter((h): h is ChatHistoryEntry => h !== null);

      let text = "";

      for await (const event of sendChatMessage(
        session,
        { conversationId, message: userText, history, cards: getCards() },
        abortSignal,
      )) {
        switch (event.type) {
          case "token":
            text += event.delta;
            yield { content: [{ type: "text", text }] };
            break;
          case "visualization":
            onVisualization(event.payload);
            text += `\n\n📌 Pinned **${event.payload.title}** to your dashboard. [View it on Overview](/overview)`;
            yield { content: [{ type: "text", text }] };
            break;
          case "visualization_update":
            onVisualizationUpdate(event.id, event.patch);
            text += `\n\n🔄 Updated a chart on your dashboard. [View it on Overview](/overview)`;
            yield { content: [{ type: "text", text }] };
            break;
          case "error":
            yield {
              content: [{ type: "text", text: text || event.message }],
              status: { type: "incomplete", reason: "error", error: event.message },
            };
            return;
          case "done":
            return;
        }
      }
    },
  };
}

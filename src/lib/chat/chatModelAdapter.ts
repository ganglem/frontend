import type {
  ChatModelAdapter,
  ChatModelRunResult,
  TextMessagePart,
  ThreadMessage,
} from "@assistant-ui/react";
import { sendChatMessage } from "@/lib/api/chat";
import type { DashboardPath } from "@/hooks/useGeneratedCards";
import type { FrontendSession } from "@/types/api";
import type { ChatCardContext, ChatHistoryEntry, ChatVisualizationPayload } from "@/types/chat";

const PATH_LABELS: Record<DashboardPath, string> = {
  "/namespaces": "Namespaces",
  "/upload": "Upload",
  "/query": "Query",
  "/datasets": "Datasets",
  "/overview": "Overview",
};

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
  // targetPath is included so an update's confirmation can link to where the
  // card actually lives, which may differ from where the user is chatting
  // from right now.
  getCards: () => (ChatCardContext & { targetPath: DashboardPath })[];
  // Where a newly-created card spawns: wherever the user is chatting from,
  // not always Overview - read live so it reflects navigation mid-conversation.
  getTargetPath: () => DashboardPath;
  // Write access: how the assistant creates or edits a dashboard card.
  onVisualization: (payload: ChatVisualizationPayload, targetPath: DashboardPath) => void;
  onVisualizationUpdate: (id: string, patch: Partial<Omit<ChatVisualizationPayload, "id">>) => void;
}

export function createChatModelAdapter(options: CreateChatModelAdapterOptions): ChatModelAdapter {
  const { getSession, conversationId, getCards, getTargetPath, onVisualization, onVisualizationUpdate } = options;

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
      const targetPath = getTargetPath();
      const targetLabel = PATH_LABELS[targetPath];

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
            onVisualization(event.payload, targetPath);
            text += `\n\n📌 Pinned **${event.payload.title}** to ${targetLabel}. [View it](${targetPath})`;
            yield { content: [{ type: "text", text }] };
            break;
          case "visualization_update": {
            const target = getCards().find((c) => c.id === event.id);
            const path = target?.targetPath ?? targetPath;
            const label = target ? PATH_LABELS[target.targetPath] : targetLabel;
            onVisualizationUpdate(event.id, event.patch);
            text += `\n\n🔄 Updated **${target?.title ?? "a chart"}** on ${label}. [View it](${path})`;
            yield { content: [{ type: "text", text }] };
            break;
          }
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

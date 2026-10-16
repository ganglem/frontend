import type { ChatMessage, ChatSendRequest, ChatStreamEvent, ChatVisualizationPayload } from "@/types/chat";

// Fixture responder for src/app/api/chat/route.ts, used whenever
// CHAT_BACKEND_URL isn't set - lets the chat panel be exercised end to end
// (streaming, markdown, visualization cards, and card updates) with zero
// live backend, the same philosophy as npm run dev:noauth for the rest of
// the app. Chunks are paced with a real delay so the streaming code path is
// actually exercised, not just the single-shot fallback.
const UPDATE_KEYWORDS = /\b(update|change|modify|switch|edit)\b/i;
const VISUALIZATION_KEYWORDS = /chart|plot|visuali[sz]e|graph/i;

const NEXT_CHART_TYPE: Record<ChatVisualizationPayload["chartType"], ChatVisualizationPayload["chartType"]> = {
  bar: "line",
  line: "area",
  area: "pie",
  pie: "bar",
};

const FIXTURE_REPLY = [
  "Here's a quick look at what I found.",
  "\n\n",
  "I queried the catalog's recent activity and broke it down by **namespace**. A few things stand out:\n\n",
  "- Upload volume is concentrated in a small number of namespaces\n",
  "- Row counts vary by an order of magnitude across datasets\n",
  "- Nothing here required a schema change to answer\n\n",
  "I've added a chart to your dashboard with the breakdown.",
];

function mockDelay(ms = 60 + Math.random() * 90) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildFixtureVisualization(): ChatVisualizationPayload {
  return {
    id: `chat-viz-${crypto.randomUUID()}`,
    title: "Rows by namespace",
    description: "Mock data from the fixture chat responder (no live chat backend configured).",
    chartType: "bar",
    xKey: "namespace",
    series: [{ key: "rows", label: "Rows" }],
    data: [
      { namespace: "dev-team", rows: 18420 },
      { namespace: "analytics", rows: 9120 },
      { namespace: "raw-ingest", rows: 42010 },
      { namespace: "curated", rows: 6305 },
    ],
    sourceQuery: "SELECT namespace, count(*) AS rows FROM ... GROUP BY namespace",
  };
}

async function* streamText(chunks: string[]): AsyncGenerator<ChatStreamEvent, string> {
  let content = "";

  for (const chunk of chunks) {
    await mockDelay();
    content += chunk;
    yield { type: "token", delta: chunk };
  }

  return content;
}

function doneEvent(conversationId: string, content: string, visualizations: ChatVisualizationPayload[] = []): ChatStreamEvent {
  const message: ChatMessage = {
    id: `${conversationId}-${crypto.randomUUID()}`,
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    status: "complete",
    visualizations,
  };

  return { type: "done", message };
}

export async function* generateFixtureChatEvents(request: ChatSendRequest): AsyncGenerator<ChatStreamEvent> {
  const { conversationId, message: userMessage, context } = request;
  const existingCards = context?.cards ?? [];

  // Demonstrates the "read + edit what's already pinned" path even without a
  // real backend: picks the most recently touched card and cycles its chart
  // type, so useGeneratedCards().updateCard() is exercised end to end.
  if (UPDATE_KEYWORDS.test(userMessage) && existingCards.length > 0) {
    const target = existingCards[existingCards.length - 1];
    const nextChartType = NEXT_CHART_TYPE[target.chartType];

    const content = yield* streamText([
      `Sure — updating **${target.title}**.`,
      "\n\n",
      `Switching it from a ${target.chartType} chart to a ${nextChartType} chart.`,
    ]);

    await mockDelay(150);
    yield { type: "visualization_update", id: target.id, patch: { chartType: nextChartType } };
    yield doneEvent(conversationId, content);
    return;
  }

  const content = yield* streamText(FIXTURE_REPLY);
  const visualizations: ChatVisualizationPayload[] = [];

  if (VISUALIZATION_KEYWORDS.test(userMessage)) {
    await mockDelay(150);
    const payload = buildFixtureVisualization();
    visualizations.push(payload);
    yield { type: "visualization", payload };
  }

  yield doneEvent(conversationId, content, visualizations);
}

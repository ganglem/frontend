// First server-side route in this repo - every other page talks to the
// Lakehouse Gateway API directly from the browser. This one exists solely
// to hold the chat backend's API key server-side (CHAT_BACKEND_API_KEY),
// since shipping that key to the browser would leak it to anyone who opens
// devtools.
//
// GUESS, NOT CONFIRMED: see src/types/chat.ts's "External contract" note -
// the colleague's real backend contract isn't confirmed yet. This route's
// job is to stay a stable SSE contract to the browser regardless of what
// that turns out to be - see src/lib/chat/backendClient.ts for the one
// place that absorbs the real shape once it's known.
import { getCurrentUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { isChatBackendConfigured, streamFromChatBackend } from "@/lib/chat/backendClient";
import { generateFixtureChatEvents } from "@/lib/mocks/chatFixtures";
import type { ChatSendRequest, ChatStreamEvent } from "@/types/chat";

export const dynamic = "force-dynamic";

function sseFrame(event: ChatStreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// Auth gate: the client-side redirect in src/app/(app)/layout.tsx only
// decides what the UI shows - it does nothing to protect this route from a
// direct request. Without this check, anyone who can reach the server could
// hit /api/chat directly and reach the colleague's MCP-backed backend (which
// can read datalake tables) with no enforcement at all. Reusing
// getCurrentUser() instead of hand-rolling JWT/JWKS verification - it
// already validates real tokens against the Gateway's /api/v1/auth/me (JWKS
// under the hood) and already short-circuits correctly in dev:noauth mode.
async function requireSession(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return null;
  }

  try {
    await getCurrentUser(token);
    return token;
  } catch (err) {
    if (err instanceof ApiError) {
      return null;
    }
    throw err;
  }
}

function iteratorToSseStream(iterator: AsyncGenerator<ChatStreamEvent>) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();

        if (done) {
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(sseFrame(value)));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Chat backend request failed.";
        controller.enqueue(encoder.encode(sseFrame({ type: "error", message })));
        controller.close();
      }
    },
  });
}

export async function POST(request: Request) {
  const token = await requireSession(request);

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as ChatSendRequest;

  const events = isChatBackendConfigured()
    ? streamFromChatBackend(body)
    : generateFixtureChatEvents(body);

  const stream = iteratorToSseStream(events);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { sessionToken } from "@/features/annytrade/server/http/handler";
import { getSessionUser } from "@/features/annytrade/server/services/auth";
import { listNotifications } from "@/features/annytrade/server/repos/notifications";
import { toPublicNotification } from "@/features/annytrade/server/domain/types";
import { securityHeaders } from "@/features/annytrade/server/http/errors";

/**
 * SSE notification feed for signed-in users (in-app realtime delivery).
 * Polls DB periodically — no vendor push required.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionUser(sessionToken(request));
  if (!session) {
    return securityHeaders(
      NextResponse.json(
        {
          ok: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 },
      ),
    );
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();
  let lastIds = new Set<string>();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const tick = async () => {
        try {
          const rows = await listNotifications(userId, 20);
          const publicRows = rows.map(toPublicNotification);
          const ids = new Set(publicRows.map((n) => n.id));
          const fresh = publicRows.filter((n) => !lastIds.has(n.id));
          lastIds = ids;
          send("snapshot", {
            notifications: publicRows,
            unread: publicRows.filter((n) => !n.read).length,
          });
          for (const n of fresh) {
            if (!n.read) send("notification", n);
          }
        } catch {
          send("error", { message: "notification poll failed" });
        }
      };

      await tick();
      const interval = setInterval(() => {
        void tick();
      }, 8_000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  const response = new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
  return securityHeaders(response);
}

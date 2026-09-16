import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import {
  listPaperClosedPositions,
  listPaperPositions,
} from "@/features/annytrade/server/trading/engine";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const accountId =
        request.nextUrl.searchParams.get("accountId") ?? undefined;
      const closed = request.nextUrl.searchParams.get("closed") === "1";
      if (closed) {
        const positions = await listPaperClosedPositions(user.id, accountId);
        return { body: { positions, paper: true } };
      }
      const positions = await listPaperPositions(user.id, accountId);
      return { body: { positions, paper: true } };
    },
    {
      csrf: false,
      rateLimit: { scope: "positions-list", limit: 60, windowMs: 60_000 },
    },
  );
}

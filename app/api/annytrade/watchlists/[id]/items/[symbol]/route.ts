import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { removeWatchlistItem } from "@/features/annytrade/server/repos/watchlists";
import { ApiError } from "@/features/annytrade/server/http/errors";

type Ctx = { params: Promise<{ id: string; symbol: string }> };

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return handleApi(request, async () => {
    const { id, symbol } = await ctx.params;
    const { user } = await requireSessionUser(sessionToken(request));
    const ok = await removeWatchlistItem(
      user.id,
      id,
      decodeURIComponent(symbol).toUpperCase(),
    );
    if (!ok) throw new ApiError(404, "NOT_FOUND", "Watchlist item not found");
    return { body: { ok: true } };
  });
}

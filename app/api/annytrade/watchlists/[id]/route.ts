import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import {
  deleteWatchlist,
  renameWatchlist,
} from "@/features/annytrade/server/repos/watchlists";
import { watchlistPatchSchema } from "@/features/annytrade/server/validation/schemas";
import { ApiError } from "@/features/annytrade/server/http/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return handleApi(request, async () => {
    const { id } = await ctx.params;
    const { user } = await requireSessionUser(sessionToken(request));
    const body = watchlistPatchSchema.parse(await request.json());
    try {
      const watchlist = await renameWatchlist(user.id, id, body.name);
      return { body: { watchlist } };
    } catch {
      throw new ApiError(404, "NOT_FOUND", "Watchlist not found");
    }
  });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return handleApi(request, async () => {
    const { id } = await ctx.params;
    const { user } = await requireSessionUser(sessionToken(request));
    const ok = await deleteWatchlist(user.id, id);
    if (!ok) throw new ApiError(404, "NOT_FOUND", "Watchlist not found");
    return { body: { ok: true } };
  });
}

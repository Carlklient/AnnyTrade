import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { addWatchlistItem } from "@/features/annytrade/server/repos/watchlists";
import { watchlistItemSchema } from "@/features/annytrade/server/validation/schemas";
import { ApiError } from "@/features/annytrade/server/http/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  return handleApi(request, async () => {
    const { id } = await ctx.params;
    const { user } = await requireSessionUser(sessionToken(request));
    const body = watchlistItemSchema.parse(await request.json());
    try {
      const watchlist = await addWatchlistItem(user.id, id, body.symbol);
      return { body: { watchlist }, status: 201 };
    } catch {
      throw new ApiError(404, "NOT_FOUND", "Watchlist not found");
    }
  });
}

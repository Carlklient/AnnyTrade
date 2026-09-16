import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import {
  createWatchlist,
  listWatchlists,
} from "@/features/annytrade/server/repos/watchlists";
import { watchlistCreateSchema } from "@/features/annytrade/server/validation/schemas";
import { ApiError } from "@/features/annytrade/server/http/errors";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const watchlists = await listWatchlists(user.id);
      return { body: { watchlists } };
    },
    { csrf: false },
  );
}

export async function POST(request: NextRequest) {
  return handleApi(request, async () => {
    const { user } = await requireSessionUser(sessionToken(request));
    const body = watchlistCreateSchema.parse(await request.json());
    try {
      const watchlist = await createWatchlist(user.id, body.name);
      return { body: { watchlist }, status: 201 };
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        throw new ApiError(409, "CONFLICT", "Watchlist name already exists");
      }
      throw error;
    }
  });
}

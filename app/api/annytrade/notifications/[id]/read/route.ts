import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { markNotificationRead } from "@/features/annytrade/server/repos/notifications";
import { ApiError } from "@/features/annytrade/server/http/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return handleApi(request, async () => {
    const { id } = await ctx.params;
    const { user } = await requireSessionUser(sessionToken(request));
    const ok = await markNotificationRead(user.id, id);
    if (!ok) throw new ApiError(404, "NOT_FOUND", "Notification not found");
    return { body: { ok: true } };
  });
}

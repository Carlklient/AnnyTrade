import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { ApiError } from "@/features/annytrade/server/http/errors";
import {
  cancelPriceAlert,
  toPublicPriceAlert,
} from "@/features/annytrade/server/repos/alerts";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: Ctx) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const { id } = await context.params;
      const row = await cancelPriceAlert(user.id, id);
      if (!row) throw new ApiError(404, "NOT_FOUND", "Alert not found");
      return { body: { alert: toPublicPriceAlert(row), paper: true } };
    },
    {
      rateLimit: { scope: "alerts-cancel", limit: 60, windowMs: 60_000 },
    },
  );
}

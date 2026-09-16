import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireAdmin } from "@/features/annytrade/server/admin/auth";
import { unsuspendUserAsAdmin } from "@/features/annytrade/server/admin/users";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { z } from "zod";

const schema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return handleApi(
    request,
    async () => {
      const admin = await requireAdmin(sessionToken(request), {
        minRole: "OPERATOR",
      });
      const { id } = await ctx.params;
      const json = await request.json().catch(() => null);
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION", "reason required");
      }
      const result = await unsuspendUserAsAdmin(admin, id, parsed.data.reason);
      return { body: result };
    },
    {
      rateLimit: { scope: "admin-unsuspend", limit: 20, windowMs: 60_000 },
    },
  );
}

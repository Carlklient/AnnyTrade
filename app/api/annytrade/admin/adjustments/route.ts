import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireAdmin } from "@/features/annytrade/server/admin/auth";
import { createLedgerAdjustment } from "@/features/annytrade/server/admin/adjustments";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { z } from "zod";

const schema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().finite(),
  reason: z.string().trim().min(8).max(500),
});

/** Immutable ADJUSTMENT ledger entry — ADMIN only. */
export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const admin = await requireAdmin(sessionToken(request), {
        minRole: "ADMIN",
      });
      const json = await request.json().catch(() => null);
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION",
          parsed.error.issues[0]?.message ?? "Invalid",
        );
      }
      const result = await createLedgerAdjustment(admin, parsed.data);
      return { status: 201, body: result };
    },
    {
      rateLimit: { scope: "admin-adjustments", limit: 10, windowMs: 60_000 },
    },
  );
}

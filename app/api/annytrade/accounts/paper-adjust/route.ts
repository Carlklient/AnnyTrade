import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import {
  PRACTICE_TOP_UP_AMOUNTS,
  practicePaperAdjust,
} from "@/features/annytrade/server/trading/paper-practice";

const schema = z.object({
  action: z.enum(["top_up", "reset"]),
  amount: z.number().finite().optional(),
  accountId: z.string().uuid().optional(),
});

/** Self-service practice paper cash top-up / reset (signed-in user only). */
export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const json = await request.json().catch(() => null);
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION",
          parsed.error.issues[0]?.message ?? "Invalid body",
        );
      }
      if (
        parsed.data.action === "top_up" &&
        parsed.data.amount != null &&
        !(PRACTICE_TOP_UP_AMOUNTS as readonly number[]).includes(
          parsed.data.amount,
        )
      ) {
        throw new ApiError(400, "VALIDATION", "Invalid top-up amount");
      }
      const result = await practicePaperAdjust(user.id, parsed.data);
      return { status: 201, body: result };
    },
    {
      rateLimit: { scope: "paper-adjust", limit: 20, windowMs: 60_000 },
    },
  );
}

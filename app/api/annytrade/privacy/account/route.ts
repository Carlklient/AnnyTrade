import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import {
  closeUserAccount,
  exportUserPrivacySummary,
} from "@/features/annytrade/server/services/privacy";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { z } from "zod";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const summary = await exportUserPrivacySummary(user.id);
      return { body: summary };
    },
    {
      csrf: false,
      rateLimit: { scope: "privacy-export", limit: 10, windowMs: 60_000 },
    },
  );
}

const closeSchema = z.object({
  confirmation: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const json = await request.json().catch(() => null);
      const parsed = closeSchema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION", "confirmation required");
      }
      const result = await closeUserAccount({
        userId: user.id,
        confirmation: parsed.data.confirmation,
        reason: parsed.data.reason,
      });
      return {
        body: result,
        setSession: null,
      };
    },
    {
      rateLimit: { scope: "privacy-close", limit: 3, windowMs: 60_000 },
    },
  );
}

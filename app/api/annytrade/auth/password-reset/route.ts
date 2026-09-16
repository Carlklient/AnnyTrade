import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "@/features/annytrade/server/services/auth";
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "@/features/annytrade/server/validation/schemas";

export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const json = await request.json();
      if ("token" in json && "password" in json) {
        const body = passwordResetConfirmSchema.parse(json);
        await confirmPasswordReset(body);
        return { body: { ok: true } };
      }
      const body = passwordResetRequestSchema.parse(json);
      await requestPasswordReset(body.email);
      return { body: { ok: true } };
    },
    {
      rateLimit: { scope: "auth.password_reset", limit: 8, windowMs: 60_000 },
    },
  );
}

import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { verifyEmailToken } from "@/features/annytrade/server/services/auth";
import { emailVerifySchema } from "@/features/annytrade/server/validation/schemas";

export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const body = emailVerifySchema.parse(await request.json());
      await verifyEmailToken(body.token);
      return { body: { ok: true } };
    },
    {
      rateLimit: { scope: "auth.verify", limit: 20, windowMs: 60_000 },
    },
  );
}

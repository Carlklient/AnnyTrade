import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { connectBrokerSandbox } from "@/features/annytrade/server/broker/service";

const bodySchema = z
  .object({
    apiKeyId: z.string().trim().min(8).max(128).optional(),
    apiSecretKey: z.string().trim().min(8).max(256).optional(),
  })
  .refine(
    (v) => (v.apiKeyId && v.apiSecretKey) || (!v.apiKeyId && !v.apiSecretKey),
    { message: "Provide both apiKeyId and apiSecretKey, or neither (use env)" },
  );

export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const json = await request.json().catch(() => ({}));
      const parsed = bodySchema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION",
          parsed.error.issues[0]?.message ?? "Invalid body",
        );
      }
      const result = await connectBrokerSandbox(user.id, parsed.data);
      return { body: result };
    },
    {
      rateLimit: { scope: "broker-connect", limit: 10, windowMs: 60_000 },
    },
  );
}

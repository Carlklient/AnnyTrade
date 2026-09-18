import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { registerUser } from "@/features/annytrade/server/services/auth";
import { registerSchema } from "@/features/annytrade/server/validation/schemas";

export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const body = registerSchema.parse(await request.json());
      const result = await registerUser({
        email: body.email,
        password: body.password,
        displayName: body.displayName,
        request,
      });
      return {
        body: {
          user: result.user,
          emailDelivery: result.emailDelivery,
        },
        status: 201,
        setSession: result.token,
      };
    },
    {
      rateLimit: { scope: "auth.register", limit: 8, windowMs: 60_000 },
    },
  );
}

import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { loginUser } from "@/features/annytrade/server/services/auth";
import { loginSchema } from "@/features/annytrade/server/validation/schemas";

export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const body = loginSchema.parse(await request.json());
      const result = await loginUser({
        email: body.email,
        password: body.password,
        request,
      });
      return {
        body: { user: result.user },
        setSession: result.token,
      };
    },
    {
      rateLimit: { scope: "auth.login", limit: 20, windowMs: 60_000 },
    },
  );
}

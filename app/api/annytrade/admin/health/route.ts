import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireAdmin } from "@/features/annytrade/server/admin/auth";
import { getProviderHealth } from "@/features/annytrade/server/admin/dashboard";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      await requireAdmin(sessionToken(request), { minRole: "READONLY" });
      return { body: await getProviderHealth() };
    },
    {
      csrf: false,
      rateLimit: { scope: "admin-health", limit: 30, windowMs: 60_000 },
    },
  );
}

import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireAdmin } from "@/features/annytrade/server/admin/auth";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const admin = await requireAdmin(sessionToken(request), {
        minRole: "READONLY",
      });
      return {
        body: {
          admin: {
            userId: admin.userId,
            role: admin.role,
            displayName: admin.displayName,
          },
          liveTradingDisabled: true,
        },
      };
    },
    {
      csrf: false,
      rateLimit: { scope: "admin-me", limit: 60, windowMs: 60_000 },
    },
  );
}

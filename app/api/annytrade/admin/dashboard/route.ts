import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import {
  requireAdmin,
  recordAdminAction,
} from "@/features/annytrade/server/admin/auth";
import { getAdminDashboardSnapshot } from "@/features/annytrade/server/admin/dashboard";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const admin = await requireAdmin(sessionToken(request), {
        minRole: "READONLY",
      });
      const snapshot = await getAdminDashboardSnapshot();
      await recordAdminAction({
        actorUserId: admin.userId,
        action: "dashboard.view",
        metadata: {},
      });
      return { body: snapshot };
    },
    {
      csrf: false,
      rateLimit: { scope: "admin-dashboard", limit: 30, windowMs: 60_000 },
    },
  );
}

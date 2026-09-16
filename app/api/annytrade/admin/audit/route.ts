import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import {
  requireAdmin,
  recordAdminAction,
} from "@/features/annytrade/server/admin/auth";
import {
  listAuditEventsForAdmin,
  listAdminActionAudit,
} from "@/features/annytrade/server/admin/audit";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const admin = await requireAdmin(sessionToken(request), {
        minRole: "READONLY",
      });
      const { searchParams } = request.nextUrl;
      const events = await listAuditEventsForAdmin({
        eventType: searchParams.get("eventType"),
        userId: searchParams.get("userId"),
        limit: Number(searchParams.get("limit") ?? 50),
        offset: Number(searchParams.get("offset") ?? 0),
      });
      const actions = await listAdminActionAudit(30);
      await recordAdminAction({
        actorUserId: admin.userId,
        action: "audit.view",
        metadata: { filters: Object.fromEntries(searchParams) },
      });
      return { body: { ...events, adminActions: actions } };
    },
    {
      csrf: false,
      rateLimit: { scope: "admin-audit", limit: 30, windowMs: 60_000 },
    },
  );
}

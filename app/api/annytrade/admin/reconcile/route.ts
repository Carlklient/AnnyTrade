import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireAdmin } from "@/features/annytrade/server/admin/auth";
import { getReconciliationAdminView } from "@/features/annytrade/server/admin/audit";
import { listRecentOpsAlerts } from "@/features/annytrade/server/execution/ops-alerts";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      await requireAdmin(sessionToken(request), { minRole: "READONLY" });
      const view = await getReconciliationAdminView();
      const opsAlerts = await listRecentOpsAlerts(40);
      return { body: { ...view, opsAlerts } };
    },
    {
      csrf: false,
      rateLimit: { scope: "admin-reconcile", limit: 30, windowMs: 60_000 },
    },
  );
}

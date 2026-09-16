import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { listPaperLedgerForUser } from "@/features/annytrade/server/trading/paper-practice";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const accountId =
        request.nextUrl.searchParams.get("accountId") ?? undefined;
      const limit = Number(request.nextUrl.searchParams.get("limit") ?? 40);
      const body = await listPaperLedgerForUser(user.id, {
        accountId,
        limit: Number.isFinite(limit) ? limit : 40,
      });
      return { body };
    },
    {
      csrf: false,
      rateLimit: { scope: "paper-ledger", limit: 60, windowMs: 60_000 },
    },
  );
}

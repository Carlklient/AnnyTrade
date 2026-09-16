import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireAdmin } from "@/features/annytrade/server/admin/auth";
import { listUsersForAdmin } from "@/features/annytrade/server/admin/users";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      await requireAdmin(sessionToken(request), { minRole: "READONLY" });
      const { searchParams } = request.nextUrl;
      const body = await listUsersForAdmin({
        status: searchParams.get("status"),
        query: searchParams.get("q"),
        limit: Number(searchParams.get("limit") ?? 50),
        offset: Number(searchParams.get("offset") ?? 0),
      });
      return { body };
    },
    {
      csrf: false,
      rateLimit: { scope: "admin-users", limit: 30, windowMs: 60_000 },
    },
  );
}

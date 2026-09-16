import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import {
  listPublicAccounts,
  requireSessionUser,
} from "@/features/annytrade/server/services/auth";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const accounts = await listPublicAccounts(user.id);
      return { body: { accounts } };
    },
    { csrf: false },
  );
}

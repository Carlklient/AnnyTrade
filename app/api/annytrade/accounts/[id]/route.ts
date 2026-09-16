import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import {
  getAccountForUser,
  getLedgerBalance,
} from "@/features/annytrade/server/repos/accounts";
import { ApiError } from "@/features/annytrade/server/http/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  return handleApi(
    request,
    async () => {
      const { id } = await ctx.params;
      const { user } = await requireSessionUser(sessionToken(request));
      const account = await getAccountForUser(id, user.id);
      if (!account) throw new ApiError(404, "NOT_FOUND", "Account not found");
      const ledgerBalance = await getLedgerBalance(account.id);
      return {
        body: {
          account: {
            id: account.id,
            accountType: account.account_type,
            baseCurrency: account.base_currency,
            status: account.status,
            label: account.label,
            ledgerBalance,
            createdAt: account.created_at.toISOString(),
          },
        },
      };
    },
    { csrf: false },
  );
}

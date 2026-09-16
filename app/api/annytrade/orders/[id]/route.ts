import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { getPaperOrderDetail } from "@/features/annytrade/server/trading/engine";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  return handleApi(
    request,
    async () => {
      const { id } = await ctx.params;
      const { user } = await requireSessionUser(sessionToken(request));
      const detail = await getPaperOrderDetail(user.id, id);
      return { body: { ...detail, paper: true } };
    },
    { csrf: false },
  );
}

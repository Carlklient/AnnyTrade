import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { getSignalById } from "@/features/annytrade/server/analysis/service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  return handleApi(
    request,
    async () => {
      const { id } = await context.params;
      const signal = await getSignalById(decodeURIComponent(id));
      return {
        body: {
          signal,
          disclosure: signal.disclosure,
          paper: true,
        },
      };
    },
    {
      csrf: false,
      rateLimit: { scope: "signals-detail", limit: 60, windowMs: 60_000 },
    },
  );
}

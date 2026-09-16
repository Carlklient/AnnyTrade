import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { getSessionUser } from "@/features/annytrade/server/services/auth";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const session = await getSessionUser(sessionToken(request));
      return {
        body: {
          authenticated: Boolean(session),
          user: session?.user ?? null,
          profile: session?.profile ?? null,
        },
      };
    },
    { csrf: false },
  );
}

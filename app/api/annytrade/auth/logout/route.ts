import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { logoutUser } from "@/features/annytrade/server/services/auth";

export async function POST(request: NextRequest) {
  return handleApi(request, async () => {
    await logoutUser({ token: sessionToken(request), request });
    return { body: { ok: true }, setSession: null };
  });
}

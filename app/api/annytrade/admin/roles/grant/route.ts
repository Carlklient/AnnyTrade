import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import {
  requireAdmin,
  grantAdminRole,
  recordAdminAction,
} from "@/features/annytrade/server/admin/auth";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { findUserByNormalizedEmail } from "@/features/annytrade/server/repos/users";
import { normalizeEmail } from "@/features/annytrade/server/validation/schemas";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "OPERATOR", "READONLY"]),
  reason: z.string().trim().min(3).max(500),
});

/** Explicit admin assignment — only existing ADMIN can grant. */
export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const admin = await requireAdmin(sessionToken(request), {
        minRole: "ADMIN",
      });
      const json = await request.json().catch(() => null);
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION", "email, role, reason required");
      }
      const emailNorm = normalizeEmail(parsed.data.email);
      const user = await findUserByNormalizedEmail(emailNorm);
      if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");

      await grantAdminRole({
        userId: user.id,
        role: parsed.data.role,
        grantedBy: admin.userId,
        grantSource: "explicit",
        reason: parsed.data.reason,
      });
      await recordAdminAction({
        actorUserId: admin.userId,
        action: "role.grant",
        targetUserId: user.id,
        metadata: { role: parsed.data.role, reason: parsed.data.reason },
      });
      return {
        body: {
          userId: user.id,
          role: parsed.data.role,
          granted: true,
        },
      };
    },
    {
      rateLimit: { scope: "admin-grant", limit: 10, windowMs: 60_000 },
    },
  );
}

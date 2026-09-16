import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/features/annytrade/server/repos/notifications";
import { toPublicNotification } from "@/features/annytrade/server/domain/types";
import { ApiError } from "@/features/annytrade/server/http/errors";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const rows = await listNotifications(user.id);
      return {
        body: {
          notifications: rows.map(toPublicNotification),
        },
      };
    },
    { csrf: false },
  );
}

export async function PATCH(request: NextRequest) {
  return handleApi(request, async () => {
    const { user } = await requireSessionUser(sessionToken(request));
    const body = (await request.json()) as { action?: string };
    if (body.action === "mark_all_read") {
      const updated = await markAllNotificationsRead(user.id);
      return { body: { updated } };
    }
    throw new ApiError(400, "VALIDATION_ERROR", "Unsupported action");
  });
}

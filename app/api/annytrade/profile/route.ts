import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import {
  getProfile,
  updateProfile,
} from "@/features/annytrade/server/repos/profiles";
import { toPublicProfile } from "@/features/annytrade/server/domain/types";
import { profilePatchSchema } from "@/features/annytrade/server/validation/schemas";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { updateUserDisplayName } from "@/features/annytrade/server/repos/users";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const profile = await getProfile(user.id);
      if (!profile) throw new ApiError(404, "NOT_FOUND", "Profile not found");
      return { body: { profile: toPublicProfile(profile), user } };
    },
    { csrf: false },
  );
}

export async function PATCH(request: NextRequest) {
  return handleApi(request, async () => {
    const { user } = await requireSessionUser(sessionToken(request));
    const body = profilePatchSchema.parse(await request.json());
    const profile = await updateProfile(user.id, body);
    if (body.displayName) {
      await updateUserDisplayName(user.id, body.displayName);
    }
    return { body: { profile: toPublicProfile(profile) } };
  });
}

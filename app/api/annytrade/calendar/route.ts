import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { calendarService } from "@/features/annytrade/server/calendar/service";
import type { CalendarImportance } from "@/features/annytrade/server/calendar/types";
import { MarketDataError } from "@/features/annytrade/server/market/types";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const sp = request.nextUrl.searchParams;
      const now = new Date();
      const from = sp.get("from")
        ? new Date(sp.get("from")!)
        : new Date(now.getTime() - 2 * 24 * 3600_000);
      const to = sp.get("to")
        ? new Date(sp.get("to")!)
        : new Date(now.getTime() + 7 * 24 * 3600_000);
      if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
        throw new ApiError(400, "VALIDATION", "Invalid from/to date");
      }
      if (to.getTime() - from.getTime() > 40 * 24 * 3600_000) {
        throw new ApiError(400, "VALIDATION", "Date range max 40 days");
      }
      const country = sp.get("country") ?? undefined;
      const importance = (sp.get("importance") ?? undefined) as
        CalendarImportance | undefined;
      const limit = Number(sp.get("limit") ?? 100);
      try {
        const events = await calendarService.list({
          from,
          to,
          country,
          importance,
          limit: Number.isFinite(limit) ? limit : 100,
        });
        return {
          body: {
            events,
            meta: calendarService.meta(),
            timezoneNote:
              "Event times are UTC ISO. UI should display in the user profile timezone.",
          },
        };
      } catch (err) {
        if (err instanceof MarketDataError) {
          throw new ApiError(err.status, err.code, err.message);
        }
        throw err;
      }
    },
    {
      csrf: false,
      rateLimit: { scope: "calendar", limit: 30, windowMs: 60_000 },
    },
  );
}

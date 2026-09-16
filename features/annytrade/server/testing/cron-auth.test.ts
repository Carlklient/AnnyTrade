import { describe, expect, it } from "vitest";

import {
  assertCronJobAuthorized,
  cronJobsEnabled,
} from "../security/cron-auth";
import { ApiError } from "../http/errors";
import { PHASE8_LIVE_SUBMISSION_HARD_BLOCK } from "../execution/live-guard";

describe("Phase 12 cron auth", () => {
  it("keeps live hard-block", () => {
    expect(PHASE8_LIVE_SUBMISSION_HARD_BLOCK).toBe(true);
  });

  it("rejects when secret missing", () => {
    delete process.env.ANNYTRADE_CRON_SECRET;
    delete process.env.CRON_SECRET;
    expect(cronJobsEnabled()).toBe(false);
    expect(() =>
      assertCronJobAuthorized(new Request("http://localhost/cron")),
    ).toThrow(ApiError);
  });

  it("accepts bearer matching ANNYTRADE_CRON_SECRET", () => {
    process.env.ANNYTRADE_CRON_SECRET = "phase12-cron-secret-value";
    delete process.env.CRON_SECRET;
    expect(cronJobsEnabled()).toBe(true);
    expect(() =>
      assertCronJobAuthorized(
        new Request("http://localhost/cron", {
          headers: { Authorization: "Bearer phase12-cron-secret-value" },
        }),
      ),
    ).not.toThrow();
  });
});

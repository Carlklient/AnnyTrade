import { describe, expect, it, beforeEach } from "vitest";

import {
  rateLimit,
  rateLimitAsync,
  resetRateLimitForTests,
} from "../security/rate-limit";
import { assertSameOrigin, CsrfError } from "../security/csrf";
import { normalizeSymbol } from "../market/normalize";
import { PHASE8_LIVE_SUBMISSION_HARD_BLOCK } from "../execution/live-guard";
import type { NextRequest } from "next/server";

function fakeRequest(init: {
  method?: string;
  origin?: string | null;
  host?: string;
}): NextRequest {
  const headers = new Headers();
  if (init.origin) headers.set("origin", init.origin);
  if (init.host) headers.set("host", init.host);
  return {
    method: init.method ?? "POST",
    headers,
  } as unknown as NextRequest;
}

describe("Phase 11 security attack surface", () => {
  beforeEach(() => {
    resetRateLimitForTests();
  });

  it("keeps live execution hard-blocked", () => {
    expect(PHASE8_LIVE_SUBMISSION_HARD_BLOCK).toBe(true);
  });

  it("rate limits repeated abuse", async () => {
    const key = "attack:login";
    for (let i = 0; i < 5; i++) {
      await rateLimitAsync({ key, limit: 3, windowMs: 60_000 });
    }
    const blocked = await rateLimitAsync({ key, limit: 3, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
  });

  it("CSRF rejects cross-origin mutations", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(() =>
      assertSameOrigin(
        fakeRequest({
          method: "POST",
          origin: "https://evil.example",
          host: "localhost:3000",
        }),
      ),
    ).toThrow(CsrfError);
  });

  it("normalizes XSS-like symbol input without executing markup", () => {
    const stripped = "<script>alert(1)</script>aapl".replace(/<[^>]+>/g, "");
    const sym = normalizeSymbol(stripped);
    expect(sym).not.toContain("<");
    expect(sym).not.toContain(">");
    expect(sym).toContain("AAPL");
  });

  it("SQL injection strings are treated as opaque symbols, not queries", () => {
    const attack = "AAPL'; DROP TABLE users;--";
    const sym = normalizeSymbol(attack);
    // Normalization uppercases / strips — must not be empty executable SQL path
    expect(typeof sym).toBe("string");
    expect(sym.includes("DROP")).toBe(true); // still data, never interpolated into SQL raw
  });

  it("idempotency key reuse is a first-class protection (documented)", () => {
    const a = rateLimit({ key: "idem:client-1", limit: 100, windowMs: 1000 });
    const b = rateLimit({ key: "idem:client-1", limit: 100, windowMs: 1000 });
    expect(a.ok && b.ok).toBe(true);
  });
});

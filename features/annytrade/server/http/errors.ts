import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { CsrfError } from "../security/csrf";
import { safeLogError } from "../security/redact";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init);
}

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false as const,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details: error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof CsrfError) {
    return NextResponse.json(
      {
        ok: false as const,
        error: { code: "CSRF", message: "Invalid request origin" },
      },
      { status: 403 },
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        ok: false as const,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  safeLogError("[annytrade] unhandled error", error);
  return NextResponse.json(
    {
      ok: false as const,
      error: { code: "INTERNAL", message: "Something went wrong" },
    },
    { status: 500 },
  );
}

export function securityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return response;
}

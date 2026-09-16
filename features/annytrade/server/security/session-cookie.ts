import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { SESSION_DAYS } from "../repos/sessions";

export const SESSION_COOKIE = "annytrade_session";

export function sessionCookieOptions(token: string) {
  const secure =
    process.env.ANNYTRADE_COOKIE_INSECURE === "1"
      ? false
      : process.env.NODE_ENV === "production";
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export function clearSessionCookieOptions() {
  const secure =
    process.env.ANNYTRADE_COOKIE_INSECURE === "1"
      ? false
      : process.env.NODE_ENV === "production";
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export function readSessionTokenFromRequest(
  request: NextRequest,
): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export async function readSessionTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export function attachSessionCookie(response: NextResponse, token: string) {
  const opts = sessionCookieOptions(token);
  response.cookies.set(opts);
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  const opts = clearSessionCookieOptions();
  response.cookies.set(opts);
  return response;
}

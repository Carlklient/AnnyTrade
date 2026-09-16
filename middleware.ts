import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Standalone AnnyTrade product: land visitors on the desk marketing page.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/annytrade";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};

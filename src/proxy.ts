import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/signup"];
const PUBLIC_ROUTES = ["/", "/privacy", "/terms"];
// Routes that are always accessible regardless of auth state
const ALWAYS_PUBLIC_ROUTES = ["/verify-email"];
const API_AUTH_PREFIX = "/api/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let API auth routes, Next internals, and static files pass through
  if (
    pathname.startsWith(API_AUTH_PREFIX) ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Always-public routes (e.g. email verification callback) — never redirect
  if (ALWAYS_PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // BetterAuth session cookie name
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");
  const isAuthenticated = !!sessionCookie?.value;

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Logged in → redirect away from landing/auth pages to dashboard
  if ((isAuthRoute || isPublicRoute) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Not logged in + protected route → redirect to login
  if (!isAuthRoute && !isPublicRoute && !isAuthenticated) {
    const callbackUrl = encodeURIComponent(pathname + (request.nextUrl.search ?? ""));
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authRoutes = ["/login", "/signup"];
const publicRoutes = ["/"];
const apiAuthPrefix = "/api/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes and static files to pass through
  if (
    pathname.startsWith(apiAuthPrefix) ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("better-auth.session_token");
  const isAuthenticated = !!sessionCookie?.value;

  const isAuthRoute = authRoutes.includes(pathname);
  const isPublicRoute = publicRoutes.includes(pathname);

  // If logged in and visiting login/signup OR the landing page, go to dashboard
  if ((isAuthRoute || isPublicRoute) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If not logged in and not on a public/auth route, force login
  if (!isAuthRoute && !isPublicRoute && !isAuthenticated) {
    let from = pathname;
    if (request.nextUrl.search) {
      from += request.nextUrl.search;
    }

    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(from)}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

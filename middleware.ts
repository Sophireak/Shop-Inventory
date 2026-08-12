import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isAuth = request.cookies.get("shop_auth")?.value === "authenticated";
  const isLoginPage = request.nextUrl.pathname === "/login";

  // Not logged in and not on login page → redirect to login
  if (!isAuth && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already logged in and trying to access login → redirect to dashboard
  if (isAuth && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes (we'll handle auth separately)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_VALUE,
  getSafeRedirectPath,
} from "@/libs/auth_session";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isLoggedIn = session === SESSION_COOKIE_VALUE;

  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/", request.url);
      const returnTo = `${pathname}${request.nextUrl.search}`;
      loginUrl.searchParams.set("redirect", returnTo);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname === "/" && isLoggedIn) {
    const redirectTo = request.nextUrl.searchParams.get("redirect");
    const safeRedirect = getSafeRedirectPath(redirectTo);
    return NextResponse.redirect(new URL(safeRedirect, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard", "/dashboard/:path*"],
};

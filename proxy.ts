import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { authRoutes, defaultProtectedRoute } from "@/lib/constants";

const protectedPrefixes = [
  "/dashboard",
  "/user-management",
  "/program-management",
  "/exercise-library",
  "/recipes-management",
  "/subscription-management",
  "/revenue",
  "/feedback",
  "/support",
  "/settings",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthRoute = authRoutes.includes(pathname);
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const token = await getToken({ req });
  const isLoggedIn = Boolean(token);
  const userRole = String(token?.role || "");

  if (isProtected && (!isLoggedIn || userRole !== "admin")) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isAuthRoute && isLoggedIn && userRole === "admin") {
    return NextResponse.redirect(new URL(defaultProtectedRoute, req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};


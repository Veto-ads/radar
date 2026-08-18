import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "veto_session";

function getSecret() {
  const secret = process.env.SESSION_SECRET || "veto-ads-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

const ROUTE_PERMISSION: Record<string, "upload" | "review" | "dashboard" | "admin"> = {
  "/upload": "upload",
  "/review": "review",
  "/dashboard": "dashboard",
  "/admin": "admin",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  let user: { permissions: Record<string, boolean> } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      user = payload.user as { permissions: Record<string, boolean> };
    } catch {
      user = null;
    }
  }

  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const requiredPerm = Object.entries(ROUTE_PERMISSION).find(([prefix]) =>
    pathname.startsWith(prefix)
  )?.[1];

  if (requiredPerm && !user.permissions[requiredPerm]) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/upload/:path*", "/review/:path*", "/dashboard/:path*", "/admin/:path*"],
};

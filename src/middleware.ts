import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { appPath } from "@/lib/app-path";

const protectedPrefixes = ["/canvas", "/admin"];
const adminPrefix = "/admin";
const cookieName = "canvas_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(cookieName)?.value;
  if (!token) {
    return NextResponse.redirect(new URL(appPath("/"), request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-only-secret-change-me");
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role === "admin" ? "admin" : "member";
    if (pathname.startsWith(adminPrefix) && role !== "admin") {
      return NextResponse.redirect(new URL(appPath("/canvas"), request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL(appPath("/"), request.url));
  }
}

export const config = {
  matcher: ["/canvas/:path*", "/admin/:path*"]
};

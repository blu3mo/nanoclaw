import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/share", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths (login, share pages, auth endpoint)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for owner cookie
  const cookie = request.cookies.get("blueclaw-token")?.value;
  const ownerToken = process.env.BLUECLAW_OWNER_TOKEN || "";

  if (cookie && cookie === ownerToken) {
    return NextResponse.next();
  }

  // For API routes: also allow share token in Authorization header
  // (the API route handlers do their own fine-grained permission checks)
  if (pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      // Let the request through — the API route will validate the token
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pages redirect to login
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

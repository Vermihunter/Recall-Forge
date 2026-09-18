import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();
  const username = process.env.APP_USERNAME || "recall";
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const colon = decoded.indexOf(":");
      const u = colon >= 0 ? decoded.slice(0, colon) : decoded;
      const p = colon >= 0 ? decoded.slice(colon + 1) : "";
      if (u === username && p === password) return NextResponse.next();
    } catch {}
  }
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Recall Forge", charset="UTF-8"' } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

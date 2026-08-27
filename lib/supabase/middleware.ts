import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseSessionCookie } from "./session-cookie";

export function updateSession(request: NextRequest) {
  // Do not contact Supabase from Routing Middleware. A network stall here holds
  // the entire request until Vercel terminates the middleware invocation. This
  // cookie check is only a fast gate; the protected server layout validates the
  // user with Supabase before rendering any private data.
  if (!hasSupabaseSessionCookie(request.cookies.getAll())) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request });
}

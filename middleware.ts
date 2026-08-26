import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) { return updateSession(request); }
export const config = { matcher: ["/dashboard/:path*", "/today/:path*", "/tasks/:path*", "/schedule/:path*", "/projects/:path*", "/wbs/:path*", "/reflections/:path*", "/analytics/:path*", "/login"] };

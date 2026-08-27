type RequestCookie = { name: string; value: string };

// Supabase SSR stores the session in `sb-<project-ref>-auth-token`. Large
// sessions are split into cookies with numeric suffixes such as `.0` and `.1`.
const AUTH_COOKIE = /^sb-.+-auth-token(?:\.\d+)?$/;

export function hasSupabaseSessionCookie(cookies: RequestCookie[]) {
  return cookies.some(({ name, value }) => AUTH_COOKIE.test(name) && value.length > 0);
}

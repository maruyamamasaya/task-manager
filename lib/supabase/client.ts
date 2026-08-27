import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (browserClient) return browserClient;
  const { url, key } = getSupabaseEnv();
  browserClient = createBrowserClient(url, key);
  return browserClient;
}

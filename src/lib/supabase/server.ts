import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/** Per-request server client. Cookie writes are ignored in Server Components (the proxy refreshes sessions). */
export async function getServerClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy handles refresh writes.
        }
      },
    },
  });
}

/** Returns the authenticated user id or null. Uses the verified JWT claims (no network round trip). */
export async function getUserId(): Promise<string | null> {
  const supabase = await getServerClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

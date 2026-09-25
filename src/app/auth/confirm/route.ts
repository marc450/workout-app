import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

/**
 * Magic-link fallback. Handles both link styles:
 *  - custom template:  /auth/confirm?token_hash=...&type=email
 *  - default template: Supabase verifies the token itself and redirects here with ?code=... (PKCE)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const to = request.nextUrl.clone();
  to.search = "";

  const supabase = await getServerClient();
  let ok = false;
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (ok) {
    to.pathname = "/";
    return NextResponse.redirect(to);
  }
  to.pathname = "/login";
  to.search = "?error=link";
  return NextResponse.redirect(to);
}

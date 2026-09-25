import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

/** Magic-link fallback: /auth/confirm?token_hash=...&type=email */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const to = request.nextUrl.clone();
  to.search = "";

  if (token_hash && type) {
    const supabase = await getServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      to.pathname = "/";
      return NextResponse.redirect(to);
    }
  }

  to.pathname = "/login";
  to.search = "?error=link";
  return NextResponse.redirect(to);
}

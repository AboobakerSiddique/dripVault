import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The ONLY place a magic-link or signup-confirmation code gets exchanged
// for a real session. Both signInWithOtp and signUp are configured
// (see login page) to send users here via emailRedirectTo, never to "/".
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}

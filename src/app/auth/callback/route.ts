import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/url";

/**
 * Where an OAuth provider drops the user back.
 *
 * The browser client started the flow with PKCE, so the verifier is already in
 * a cookie; exchanging the code here sets the session on the server and the
 * user continues as if they had signed in with a password.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(absoluteUrl(request, "/sign-in?error=oauth"));
  }

  if (!code) {
    return NextResponse.redirect(absoluteUrl(request, "/sign-in?error=oauth"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(absoluteUrl(request, "/sign-in?error=oauth"));
  }

  // The onboarding guard decides whether they still need a username and a pin.
  const destination = next && next.startsWith("/") ? next : "/home";
  return NextResponse.redirect(absoluteUrl(request, destination));
}

import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/url";

/**
 * Landing point for every link Supabase emails: confirmation, recovery,
 * email change. Verifies the token, sets the session cookie, then hands the
 * user to wherever that kind of link should end up.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const next = params.get("next");

  if (!tokenHash || !type) {
    return NextResponse.redirect(absoluteUrl(request, "/sign-in?error=link_invalid"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(absoluteUrl(request, "/sign-in?error=link_expired"));
  }

  const destination =
    type === "recovery"
      ? "/update-password"
      : next && next.startsWith("/")
        ? next
        : "/onboarding";

  redirect(destination);
}

"use client";

import { useState } from "react";

import { Notice } from "@/components/ui/Notice";
import { humanError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";

/**
 * Continue with Google.
 *
 * Kept quieter than the primary action: an account here is a place on a map
 * and a username, and both still have to be chosen afterwards — this only
 * settles how you get through the door.
 */
export function GoogleButton({
  nextPath,
  label = "Continue with Google",
}: {
  nextPath?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const target = new URL("/auth/callback", window.location.origin);
    if (nextPath?.startsWith("/")) target.searchParams.set("next", nextPath);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: target.toString(),
        queryParams: { prompt: "select_account" },
      },
    });

    // On success the browser has already been sent to Google.
    if (oauthError) {
      setError(humanError(oauthError));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        <span className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={start}
        disabled={busy}
        aria-busy={busy || undefined}
        className="tap inline-flex min-h-[46px] items-center justify-center gap-3 rounded-full border border-line bg-transparent px-6 text-[15px] text-ink transition-colors hover:border-ink-faint disabled:opacity-40"
      >
        <GoogleMark />
        {busy ? "Taking you to Google…" : label}
      </button>

      <Notice>{error}</Notice>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-[17px] w-[17px]" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.42 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

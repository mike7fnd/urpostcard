"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { humanError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";

export function SignUpForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }

    setBusy(true);
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`,
      },
    });

    if (signUpError) {
      setError(humanError(signUpError));
      setBusy(false);
      return;
    }

    // With email confirmation on, there is no session yet.
    if (!data.session) {
      setCheckInbox(true);
      setBusy(false);
      return;
    }

    router.replace("/onboarding");
    router.refresh();
  }

  if (checkInbox) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-display text-[22px] leading-snug text-ink">
          Check your inbox.
        </p>
        <p className="max-w-[36ch] text-[15px] leading-relaxed text-ink-soft">
          We sent a link to <span className="text-ink">{email.trim()}</span>. Open
          it and you can pin your place on the map.
        </p>
      </div>
    );
  }

  return (
    <>
    <form onSubmit={onSubmit} className="flex flex-col gap-7" noValidate>
      <Field
        label="Your name"
        name="display_name"
        autoComplete="name"
        required
        maxLength={60}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        hint="However you would sign a letter."
      />

      <Field
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Field
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint="At least 8 characters."
      />

      <Notice>{error}</Notice>

      <Button type="submit" loading={busy}>
        Create account
      </Button>
    </form>

      <div className="mt-8">
        <GoogleButton nextPath="/onboarding" label="Continue with Google" />
      </div>
    </>
  );
}

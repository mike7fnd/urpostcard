"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { humanError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";

export function SignInForm({
  nextPath,
  linkProblem,
}: {
  nextPath?: string;
  linkProblem?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(linkProblem ?? null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(humanError(signInError));
      setBusy(false);
      return;
    }

    // The onboarding guard decides where they actually land.
    router.replace(nextPath?.startsWith("/") ? nextPath : "/home");
    router.refresh();
  }

  return (
    <>
    <form onSubmit={onSubmit} className="flex flex-col gap-7" noValidate>
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
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Notice>{error}</Notice>

      <div className="flex flex-col gap-4">
        <Button type="submit" loading={busy}>
          Sign in
        </Button>
        <Link
          href="/reset-password"
          className="tap self-center text-[14px] text-ink-faint transition-colors hover:text-ink-soft"
        >
          I have forgotten my password
        </Link>
      </div>
    </form>

      <div className="mt-8">
        <GoogleButton nextPath={nextPath} />
      </div>
    </>
  );
}

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { humanError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth/confirm?next=/update-password` },
    );

    setBusy(false);

    if (resetError) {
      setError(humanError(resetError));
      return;
    }

    // Deliberately the same outcome whether or not the address exists.
    setSent(true);
  }

  if (sent) {
    return (
      <p className="max-w-[36ch] text-[15px] leading-relaxed text-ink-soft">
        If that address has an account, a link is on its way to it.
      </p>
    );
  }

  return (
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

      <Notice>{error}</Notice>

      <Button type="submit" loading={busy}>
        Send the link
      </Button>
    </form>
  );
}

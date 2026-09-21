"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LocationPicker, type PickedLocation } from "@/components/location/LocationPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { humanError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { normalizeUsername, validateUsername } from "@/lib/username";

type Step = "name" | "place";

export function OnboardingFlow({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(profile.username ? "place" : "name");

  return (
    <AnimatePresence mode="wait">
      {step === "name" ? (
        <motion.div
          key="name"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <NameStep profile={profile} onDone={() => setStep("place")} />
        </motion.div>
      ) : (
        <motion.div
          key="place"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          <PlaceStep
            profile={profile}
            onDone={() => {
              router.replace("/home");
              router.refresh();
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ----------------------------------------------------------------- step 1 */

function NameStep({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username ?? "");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const localProblem = username.length > 0 ? validateUsername(username) : null;

  /* availability, debounced, server-checked */
  useEffect(() => {
    const candidate = normalizeUsername(username);
    if (validateUsername(candidate) !== null) {
      setAvailable(null);
      return;
    }

    let cancelled = false;
    const id = window.setTimeout(async () => {
      setChecking(true);
      const supabase = createClient();
      const { data } = await supabase.rpc("is_username_available", {
        p_username: candidate,
      });
      if (!cancelled) {
        setAvailable(data === true);
        setChecking(false);
      }
    }, 340);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [username]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const candidate = normalizeUsername(username);
    const problem = validateUsername(candidate);
    if (problem) {
      setError(problem);
      return;
    }
    if (!displayName.trim()) {
      setError("Tell us what to call you.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ username: candidate, display_name: displayName.trim() })
      .eq("id", profile.id);

    if (saveError) {
      setError(humanError(saveError));
      setBusy(false);
      return;
    }

    onDone();
  }

  const hint =
    localProblem ??
    (checking
      ? "Checking…"
      : available === true
        ? "That one is free."
        : available === false
          ? "Taken. Try another."
          : "This is how people will address postcards to you.");

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-6 py-10">
      <span className="text-[13px] uppercase tracking-[0.22em] text-ink-soft">
        urpostcard
      </span>

      <div className="flex flex-1 flex-col justify-center py-14">
        <h1 className="font-display text-[32px] leading-tight tracking-tight text-ink">
          What should people call you?
        </h1>

        <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-7" noValidate>
          <Field
            label="Your name"
            name="display_name"
            autoComplete="name"
            required
            maxLength={60}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <Field
            label="Username"
            name="username"
            prefix="@"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={20}
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            hint={hint}
            error={error && localProblem ? localProblem : null}
          />

          <Notice>{error && !localProblem ? error : null}</Notice>

          <Button
            type="submit"
            loading={busy}
            disabled={available === false || localProblem !== null}
          >
            Continue
          </Button>
        </form>
      </div>
    </main>
  );
}

/* ----------------------------------------------------------------- step 2 */

function PlaceStep({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(location: PickedLocation) {
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("profiles")
      .update({
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.name,
      })
      .eq("id", profile.id);

    if (saveError) {
      setError(humanError(saveError));
      setBusy(false);
      return;
    }

    onDone();
  }

  return (
    <div className="relative">
      <LocationPicker onConfirm={save} busy={busy}>
        <div>
          <h1 className="font-display text-[28px] leading-tight tracking-tight text-ink drop-shadow-[0_1px_10px_rgba(255,255,255,0.85)] sm:text-[32px]">
            Where should your postcards find you?
          </h1>
          {error ? (
            <p role="alert" className="mt-2 text-[14px] text-accent">
              {error}
            </p>
          ) : null}
        </div>
      </LocationPicker>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { LocationPicker, type PickedLocation } from "@/components/location/LocationPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { humanError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { normalizeUsername, validateUsername } from "@/lib/username";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function ProfileView({ profile }: { profile: Profile }) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movingPin, setMovingPin] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const usernameProblem = username ? validateUsername(username) : null;
  const dirty =
    displayName !== profile.display_name ||
    normalizeUsername(username) !== (profile.username ?? "");

  async function saveIdentity(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const candidate = normalizeUsername(username);
    const problem = validateUsername(candidate);
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), username: candidate })
      .eq("id", profile.id);

    setSaving(false);

    if (saveError) {
      setError(humanError(saveError));
      return;
    }

    setSaved(true);
    router.refresh();
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);

    if (file.size > MAX_AVATAR_BYTES) {
      setError("That image is larger than 2 MB.");
      return;
    }

    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${profile.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError(humanError(uploadError));
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error: saveError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id);

    if (saveError) {
      setError(humanError(saveError));
      return;
    }

    setAvatarUrl(publicUrl);
    router.refresh();
  }

  async function savePlace(location: PickedLocation) {
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("profiles")
      .update({
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.name,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (saveError) {
      setError(humanError(saveError));
      return;
    }

    setMovingPin(false);
    router.refresh();
  }

  return (
    <main className="safe-top safe-bottom mx-auto w-full max-w-[520px] px-6 pb-32 pt-8 lg:pt-20">
      <h1 className="font-display text-[30px] leading-tight tracking-tight text-ink">
        You
      </h1>

      {/* identity */}
      <section className="mt-10">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="tap relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border border-line bg-paper-deep"
            aria-label="Change your picture"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                fill
                sizes="72px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-display text-[24px] text-ink-faint">
                {(displayName || username || "?").slice(0, 1).toUpperCase()}
              </span>
            )}
          </button>

          <div className="min-w-0">
            <p className="truncate text-[17px] text-ink">
              {profile.display_name || `@${profile.username}`}
            </p>
            <p className="mt-0.5 text-[14px] text-ink-faint">
              Tap the circle to change your picture
            </p>
          </div>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={uploadAvatar}
          className="sr-only"
          tabIndex={-1}
        />

        <form onSubmit={saveIdentity} className="mt-8 flex flex-col gap-7" noValidate>
          <Field
            label="Your name"
            value={displayName}
            maxLength={60}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />

          <Field
            label="Username"
            prefix="@"
            value={username}
            maxLength={20}
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            error={usernameProblem}
            hint="Changing this changes how people address postcards to you."
          />

          <Notice>{error}</Notice>
          {saved && !error ? <Notice tone="quiet">Saved.</Notice> : null}

          <div>
            <Button
              type="submit"
              loading={saving}
              disabled={!dirty || usernameProblem !== null}
            >
              Save
            </Button>
          </div>
        </form>
      </section>

      {/* place */}
      <section className="mt-12 border-t border-line pt-8">
        <p className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">
          Where your postcards find you
        </p>
        <p className="mt-2 font-display text-[24px] leading-tight text-ink">
          {profile.location_name ?? "Nowhere yet"}
        </p>
        <p className="mt-3 max-w-[40ch] text-[13.5px] leading-relaxed text-ink-faint">
          Other people see this name only. The pin behind it is rounded to about a
          kilometre and used to work out how far a postcard has to travel.
        </p>

        <button
          type="button"
          onClick={() => setMovingPin(true)}
          className="tap mt-5 min-h-[46px] rounded-full border border-line px-6 text-[14px] text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
        >
          Move my pin
        </button>
      </section>

      {/* out */}
      <section className="mt-12 border-t border-line pt-8">
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="tap min-h-[46px] text-[15px] text-ink-soft transition-colors hover:text-accent"
          >
            Sign out
          </button>
        </form>
      </section>

      <AnimatePresence>
        {movingPin ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-50"
          >
            <LocationPicker
              initial={
                profile.latitude !== null && profile.longitude !== null
                  ? {
                      latitude: profile.latitude,
                      longitude: profile.longitude,
                      name: profile.location_name ?? "",
                    }
                  : null
              }
              confirmLabel="Move it here"
              busy={saving}
              onConfirm={savePlace}
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-display text-[26px] leading-tight text-night-ink">
                  Where should your postcards find you?
                </h2>
                <button
                  type="button"
                  onClick={() => setMovingPin(false)}
                  className="tap min-h-[44px] shrink-0 rounded-full border border-night-line px-4 text-[14px] text-night-ink-soft"
                >
                  Cancel
                </button>
              </div>
            </LocationPicker>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

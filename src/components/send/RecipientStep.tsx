"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { StepShell } from "@/components/send/StepShell";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { formatDistance, formatDuration } from "@/lib/delivery";
import { humanError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { JourneyPreview, PublicProfile } from "@/lib/types";
import { normalizeUsername } from "@/lib/username";

export function RecipientStep({
  recipient,
  preview,
  onPick,
  onClear,
  onNext,
}: {
  recipient: PublicProfile | null;
  preview: JourneyPreview | null;
  onPick: (person: PublicProfile, journey: JourneyPreview) => void;
  onClear: () => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const term = normalizeUsername(query);
    if (term.length < 1 || recipient) {
      setResults([]);
      return;
    }

    const id = window.setTimeout(async () => {
      const mine = ++requestId.current;
      setSearching(true);

      const supabase = createClient();
      const { data } = await supabase.rpc("search_profiles", {
        p_query: term,
        p_limit: 8,
      });

      if (mine === requestId.current) {
        setResults((data ?? []) as PublicProfile[]);
        setSearching(false);
      }
    }, 280);

    return () => window.clearTimeout(id);
  }, [query, recipient]);

  async function choose(person: PublicProfile) {
    setError(null);
    setPending(person.username);

    const supabase = createClient();
    const { data, error: previewError } = await supabase.rpc("preview_journey", {
      p_recipient_username: person.username,
    });

    setPending(null);

    if (previewError || !data) {
      setError(humanError(previewError));
      return;
    }

    onPick(person, data as JourneyPreview);
    setQuery("");
    setResults([]);
  }

  return (
    <StepShell title="Step one" backHref="/home">
      <h1 className="font-display text-[30px] leading-tight tracking-tight text-ink sm:text-[34px]">
        Who is it for?
      </h1>

      <AnimatePresence mode="wait">
        {recipient && preview ? (
          <motion.div
            key="picked"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-10"
          >
            <div className="border-t border-line pt-6">
              <p className="font-display text-[26px] leading-tight text-ink">
                {recipient.display_name || `@${recipient.username}`}
              </p>
              <p className="mt-1 text-[15px] text-ink-soft">@{recipient.username}</p>

              <dl className="mt-7 space-y-3">
                <Row label="Lives in">{preview.destination_location_name ?? "Somewhere"}</Row>
                <Row label="Distance">{formatDistance(preview.distance_km)}</Row>
                <Row label="A postcard takes">
                  about {formatDuration(preview.travel_duration_seconds)}
                </Row>
              </dl>
            </div>

            <button
              type="button"
              onClick={onClear}
              className="tap mt-6 text-[14px] text-ink-faint underline decoration-line underline-offset-4 transition-colors hover:text-ink-soft"
            >
              Someone else
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-10"
          >
            <Field
              label="Username"
              prefix="@"
              value={query}
              onChange={(e) => setQuery(e.target.value.replace(/\s/g, ""))}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              placeholder="anna"
              hint="Postcards are addressed by username."
            />

            <div className="mt-5 min-h-[120px]">
              {results.length > 0 ? (
                <ul className="divide-y divide-line/70 border-y border-line/70">
                  {results.map((person) => (
                    <li key={person.id}>
                      <button
                        type="button"
                        onClick={() => choose(person)}
                        disabled={pending !== null}
                        className="tap flex min-h-[62px] w-full items-center justify-between gap-4 py-3 text-left transition-opacity disabled:opacity-40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[16px] text-ink">
                            @{person.username}
                          </span>
                          <span className="block truncate text-[13.5px] text-ink-faint">
                            {person.display_name}
                            {person.location_name ? ` · ${person.location_name}` : ""}
                          </span>
                        </span>
                        {!person.has_location ? (
                          <span className="shrink-0 text-[12px] text-ink-faint">
                            no place yet
                          </span>
                        ) : pending === person.username ? (
                          <span className="shrink-0 text-[12px] text-ink-faint">…</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.length > 0 && !searching ? (
                <p className="text-[14px] text-ink-faint">No one goes by that name.</p>
              ) : null}
            </div>

            <Notice className="mt-4">{error}</Notice>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-10">
        <Button onClick={onNext} disabled={!recipient} className="w-full sm:w-auto">
          Choose a postcard
        </Button>
      </div>
    </StepShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className="text-[12px] uppercase tracking-[0.14em] text-ink-faint">{label}</dt>
      <dd className="text-right text-[15px] text-ink">{children}</dd>
    </div>
  );
}

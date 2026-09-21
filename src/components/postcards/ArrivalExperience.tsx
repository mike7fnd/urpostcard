"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Postcard } from "@/components/postcard/Postcard";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatDistance } from "@/lib/delivery";
import { humanError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { PostcardView } from "@/lib/types";

/**
 * A postcard arriving at the phone.
 *
 * It comes in from above, carries its own weight down, overshoots very
 * slightly and settles. Only then can it be opened — and opening it is a real
 * write: open_postcard() stamps opened_at server-side and returns the message,
 * which the recipient has not been sent until this moment.
 */
export function ArrivalExperience({ card }: { card: PostcardView }) {
  const reduced = usePrefersReducedMotion();
  const router = useRouter();

  const [phase, setPhase] = useState<"incoming" | "landed" | "open">("incoming");
  const [opened, setOpened] = useState<PostcardView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setPhase("landed"), reduced ? 250 : 1500);
    return () => window.clearTimeout(id);
  }, [reduced]);

  async function open() {
    if (busy) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: openError } = await supabase.rpc("open_postcard", {
      p_id: card.id,
    });

    setBusy(false);

    if (openError || !data) {
      setError(humanError(openError));
      return;
    }

    setOpened(data as PostcardView);
    setPhase("open");
    router.refresh();
  }

  const shown = opened ?? card;

  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col items-center justify-center px-6 pb-28 pt-8">
      <div className="w-full max-w-[520px]" style={{ perspective: "1600px" }}>
        <motion.div
          initial={
            reduced
              ? { opacity: 0 }
              : { y: "-125vh", rotateX: -38, rotateZ: -13, scale: 1.16, opacity: 0.9 }
          }
          animate={
            phase === "incoming"
              ? reduced
                ? { opacity: 1 }
                : { y: "-125vh", rotateX: -38, rotateZ: -13, scale: 1.16, opacity: 0.9 }
              : { y: 0, rotateX: 0, rotateZ: 0, scale: 1, opacity: 1 }
          }
          transition={
            reduced
              ? { duration: 0.3 }
              : {
                  type: "spring",
                  stiffness: 62,
                  damping: 13,
                  mass: 1.15,
                  restDelta: 0.001,
                }
          }
          style={{ transformStyle: "preserve-3d" }}
          className="shadow-lift-lg rounded-[var(--radius-card)]"
        >
          <button
            type="button"
            onClick={phase === "landed" ? open : undefined}
            disabled={phase !== "landed" || busy}
            className="w-full rounded-[var(--radius-card)] disabled:cursor-default"
            aria-label={
              phase === "open"
                ? "The postcard, open"
                : "Open the postcard"
            }
            style={{ perspective: "1600px" }}
          >
            <Postcard
              design={shown.template_design_config}
              face={phase === "open" ? "back" : "front"}
              to={shown.direction === "received" ? undefined : shown.counterpart_username}
              from={shown.counterpart_username}
              message={shown.message}
              caption={shown.origin_location_name}
              postmark={{
                place: shown.origin_location_name,
                date: shown.sent_at
                  ? new Date(shown.sent_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })
                  : null,
              }}
            />
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "incoming" ? 0 : 1 }}
        transition={{ duration: 0.6, delay: phase === "landed" ? 0.35 : 0 }}
        className="mt-10 max-w-[420px] text-center"
      >
        {phase === "open" ? (
          <>
            <p className="text-[14px] text-ink-soft">
              From @{shown.counterpart_username}
            </p>
            <p className="mt-1.5 text-[13px] text-ink-faint">
              Sent from {shown.origin_location_name ?? "somewhere"} · arrived from{" "}
              {formatDistance(shown.distance_km)} away
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-[24px] leading-snug text-ink">
              A postcard has arrived for you.
            </p>
            <p className="mt-2 text-[14px] text-ink-faint">
              {busy ? "Opening…" : "Tap it to read."}
            </p>
          </>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-[13.5px] text-accent">
            {error}
          </p>
        ) : null}
      </motion.div>
    </main>
  );
}

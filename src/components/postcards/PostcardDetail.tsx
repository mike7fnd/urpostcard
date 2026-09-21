"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { JourneyGlobe } from "@/components/globe/JourneyGlobe";
import { Postcard } from "@/components/postcard/Postcard";
import { useNow } from "@/hooks/useNow";
import {
  formatCountdown,
  formatDistance,
  formatDuration,
  millisUntilArrival,
  statusLabel,
} from "@/lib/delivery";
import type { PostcardView } from "@/lib/types";

const STAMP = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * A postcard, with the journey it made around it.
 *
 * While it is in transit the globe is live; once delivered the journey can be
 * replayed, but only if the reader asks for it.
 */
export function PostcardDetail({ card }: { card: PostcardView }) {
  const router = useRouter();
  const now = useNow(card.status === "in_transit" ? 1000 : 600_000);
  const [face, setFace] = useState<"front" | "back">(
    card.message_available ? "back" : "front",
  );
  const [replaying, setReplaying] = useState(false);

  const travelling = card.status === "in_transit";
  const onSettlementDue = useCallback(() => router.refresh(), [router]);

  return (
    <main className="safe-top safe-bottom mx-auto w-full max-w-[640px] px-6 pb-32 pt-5 lg:max-w-[780px] lg:pt-16">
      <div className="flex items-center justify-between">
        <Link
          href="/postcards"
          className="tap -ml-2 flex h-11 items-center gap-2 rounded-full px-2 text-[14px] text-ink-soft transition-colors hover:text-ink"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden focusable="false">
            <path
              d="M12.5 4.5 7 10l5.5 5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Postcards
        </Link>

        <span className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">
          {statusLabel(card)}
        </span>
      </div>

      {/* the object */}
      <div className="mt-8" style={{ perspective: "1600px" }}>
        <button
          type="button"
          onClick={() => setFace((f) => (f === "front" ? "back" : "front"))}
          className="shadow-lift w-full rounded-[var(--radius-card)]"
          aria-label="Turn the postcard over"
        >
          <Postcard
            design={card.template_design_config}
            face={face}
            to={card.direction === "sent" ? card.counterpart_username : null}
            from={card.direction === "sent" ? null : card.counterpart_username}
            message={card.message}
            sealed={!card.message_available}
            caption={card.origin_location_name}
            postmark={{
              place: card.origin_location_name,
              date: card.sent_at
                ? new Date(card.sent_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })
                : null,
            }}
          />
        </button>
      </div>

      {/* where it is */}
      {travelling ? (
        <div className="mt-8 overflow-hidden rounded-3xl border border-line/70">
          <div className="h-[280px] w-full sm:h-[340px]">
            <JourneyGlobe card={card} mode="observe" onSettlementDue={onSettlementDue} />
          </div>
          <div className="bg-paper-deep/60 px-5 py-4">
            <p className="text-[14px] text-ink">
              Arriving in {formatCountdown(millisUntilArrival(card, now))}
            </p>
            <p className="mt-1 text-[13px] text-ink-faint">
              {card.direction === "sent"
                ? `On its way to ${card.destination_location_name ?? "them"}`
                : `On its way from ${card.origin_location_name ?? "somewhere"}`}
            </p>
          </div>
        </div>
      ) : null}

      {/* the facts */}
      <dl className="mt-10 divide-y divide-line/70 border-y border-line/70">
        <Row label={card.direction === "sent" ? "To" : "From"}>
          {card.counterpart_display_name || `@${card.counterpart_username}`}{" "}
          <span className="text-ink-faint">@{card.counterpart_username}</span>
        </Row>
        <Row label="Sent from">{card.origin_location_name ?? "Somewhere"}</Row>
        <Row label="Addressed to">{card.destination_location_name ?? "Somewhere"}</Row>
        <Row label="Distance">{formatDistance(card.distance_km)}</Row>
        <Row label="Time in transit">
          {formatDuration(card.travel_duration_seconds)}
        </Row>
        {card.sent_at ? (
          <Row label="Posted">{STAMP.format(new Date(card.sent_at))}</Row>
        ) : null}
        {card.delivered_at ? (
          <Row label="Arrived">{STAMP.format(new Date(card.delivered_at))}</Row>
        ) : card.estimated_delivery_at ? (
          <Row label="Expected">
            {STAMP.format(new Date(card.estimated_delivery_at))}
          </Row>
        ) : null}
        {card.opened_at ? (
          <Row label="Opened">{STAMP.format(new Date(card.opened_at))}</Row>
        ) : null}
      </dl>

      {!travelling ? (
        <button
          type="button"
          onClick={() => setReplaying(true)}
          className="tap mt-8 min-h-[46px] rounded-full border border-line px-6 text-[14px] text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
        >
          Replay the journey
        </button>
      ) : null}

      <AnimatePresence>
        {replaying ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 bg-night"
          >
            <JourneyGlobe card={card} mode="replay" />
            <button
              type="button"
              onClick={() => setReplaying(false)}
              className="safe-top tap absolute right-4 top-4 z-10 min-h-[44px] rounded-full border border-night-line bg-night-soft/80 px-5 text-[14px] text-night-ink backdrop-blur"
            >
              Close
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3.5">
      <dt className="shrink-0 text-[12px] uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </dt>
      <dd className="text-right text-[15px] text-ink">{children}</dd>
    </div>
  );
}

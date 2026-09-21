"use client";

import Link from "next/link";

import { Postcard } from "@/components/postcard/Postcard";
import { useNow } from "@/hooks/useNow";
import {
  formatCountdown,
  formatDistance,
  millisUntilArrival,
  statusLabel,
} from "@/lib/delivery";
import type { PostcardView } from "@/lib/types";

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function PostcardRow({ card }: { card: PostcardView }) {
  const now = useNow(card.status === "in_transit" ? 30_000 : 600_000);

  const unread = card.direction === "received" && card.status === "arrived";
  const place =
    card.direction === "sent"
      ? card.destination_location_name
      : card.origin_location_name;

  const when =
    card.status === "in_transit"
      ? `arriving in ${formatCountdown(millisUntilArrival(card, now))}`
      : card.delivered_at
        ? DATE.format(new Date(card.delivered_at))
        : card.sent_at
          ? DATE.format(new Date(card.sent_at))
          : "";

  return (
    <Link
      href={`/postcards/${card.id}`}
      className="group flex items-center gap-5 py-5 transition-opacity hover:opacity-90"
    >
      <div
        className="w-[112px] shrink-0 rounded-[var(--radius-card)] transition-transform duration-500 group-hover:-translate-y-0.5 sm:w-[136px]"
        style={{ boxShadow: "var(--shadow-lift-sm)" }}
      >
        <Postcard design={card.template_design_config} face="front" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[16px] text-ink">
          <span className="truncate">
            {card.direction === "sent" ? "To" : "From"} @{card.counterpart_username}
          </span>
          {unread ? (
            <span
              className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent"
              aria-label="Not opened yet"
            />
          ) : null}
        </p>

        <p className="mt-1 truncate text-[13.5px] text-ink-faint">
          {place ?? "Somewhere"} · {formatDistance(card.distance_km)}
        </p>

        <p className="mt-2.5 text-[12px] uppercase tracking-[0.14em] text-ink-faint">
          {statusLabel(card)}
          {when ? ` · ${when}` : ""}
        </p>
      </div>
    </Link>
  );
}

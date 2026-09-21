"use client";

import Link from "next/link";

import { Postcard } from "@/components/postcard/Postcard";
import { useNow } from "@/hooks/useNow";
import {
  formatCountdown,
  formatDistance,
  millisUntilArrival,
} from "@/lib/delivery";
import type { PostcardView } from "@/lib/types";

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/**
 * Everything of yours that is out in the world, along the bottom of the home
 * screen: still crossing first, then the ones that got there.
 *
 * A strip rather than a list — the globe behind it is the point of this
 * screen, and a full-height feed would bury it.
 */
export function TravellingStrip({ cards }: { cards: PostcardView[] }) {
  const now = useNow(30_000);

  if (cards.length === 0) return null;

  return (
    <div className="-mx-6 lg:-mx-12">
      <ul className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-1 lg:px-12">
        {cards.map((card) => {
          const travelling = card.status === "in_transit";

          return (
            <li key={card.id} className="w-[176px] shrink-0 snap-start sm:w-[200px]">
              <Link
                href={`/postcards/${card.id}`}
                className="group block rounded-2xl border border-line/60 bg-paper/92 p-2.5 shadow-lift-sm backdrop-blur transition-transform duration-500 hover:-translate-y-0.5"
              >
                <div className="rounded-[var(--radius-card)] shadow-lift-sm">
                  <Postcard design={card.template_design_config} face="front" />
                </div>

                <p className="mt-2.5 truncate text-[13.5px] text-ink">
                  {card.direction === "sent" ? "To" : "From"} @
                  {card.counterpart_username}
                </p>

                <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11.5px] text-ink-faint">
                  {travelling ? (
                    <>
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                        aria-hidden
                      />
                      {formatCountdown(millisUntilArrival(card, now))} away
                    </>
                  ) : (
                    <>
                      {card.opened_at ? "Read" : "Delivered"}
                      {card.delivered_at
                        ? ` · ${DATE.format(new Date(card.delivered_at))}`
                        : ""}
                    </>
                  )}
                </p>

                <p className="mt-0.5 truncate text-[11.5px] text-ink-faint/80">
                  {formatDistance(card.distance_km)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

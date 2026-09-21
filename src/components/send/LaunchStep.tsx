"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

import { JourneyGlobe } from "@/components/globe/JourneyGlobe";
import { formatCountdown, formatDistance } from "@/lib/delivery";
import type { PostcardView } from "@/lib/types";

/**
 * The moment after the swipe: the interface becomes the world and the postcard
 * is already out there. Nothing here is interactive until the camera settles.
 */
export function LaunchStep({ card }: { card: PostcardView }) {
  const [settled, setSettled] = useState(false);

  // The journey now runs at its real pace, so there is no "flight over" to
  // wait for — the postcard will still be out there in eight minutes' time.
  // The copy arrives once the camera has finished dropping onto the pin.
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(true), 2_400);
    return () => window.clearTimeout(id);
  }, []);

  const eta = card.estimated_delivery_at
    ? formatCountdown(Date.parse(card.estimated_delivery_at) - Date.now())
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-night">
      <JourneyGlobe card={card} mode="launch" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: settled ? 1 : 0 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-8"
      >
        <div className="mx-auto max-w-[520px] text-center">
          <p className="font-display text-[26px] leading-tight text-night-ink">
            On its way to @{card.counterpart_username}.
          </p>
          <p className="mt-2 text-[14px] text-night-ink-soft">
            {formatDistance(card.distance_km)}
            {eta ? ` · arriving in about ${eta}` : ""}
          </p>

          <Link
            href={`/postcards/${card.id}`}
            className={`tap mt-7 inline-flex min-h-[46px] items-center justify-center rounded-full border border-night-line px-7 text-[15px] text-night-ink transition-colors hover:bg-white/5 ${
              settled ? "pointer-events-auto" : ""
            }`}
          >
            Watch it travel
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

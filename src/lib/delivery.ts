/**
 * The delivery model, client side.
 *
 * Nothing here decides anything. The database computes and stores
 * travel_duration_seconds, sent_at and estimated_delivery_at when a postcard
 * is sent (public.send_postcard), and public.settle_due_postcards is the only
 * thing that ever marks one 'arrived'. These functions exist to *preview* a
 * journey before it is sent, and to *describe* a journey already stored.
 */

import type { DeliverySettings, PostcardView } from "@/lib/types";

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  virtual_speed_kmh: 1200,
  min_travel_seconds: 300,
  max_travel_seconds: 172800,
  variation_pct: 0.07,
};

/**
 * Estimate, without the per-postcard atmospheric variation the server applies
 * (that is seeded from the postcard's own id, which does not exist yet at
 * preview time). Same clamp, same speed — mirrors public.travel_duration_seconds.
 */
export function estimateTravelSeconds(
  distanceKm: number,
  settings: DeliverySettings = DEFAULT_DELIVERY_SETTINGS,
): number {
  const raw = (distanceKm / settings.virtual_speed_kmh) * 3600;
  return Math.max(
    settings.min_travel_seconds,
    Math.min(settings.max_travel_seconds, Math.ceil(raw)),
  );
}

/** How far along its route a postcard is, 0 → 1, from persisted timestamps. */
export function journeyProgress(card: PostcardView, now: number = Date.now()): number {
  if (card.status === "arrived" || card.status === "opened") return 1;
  if (!card.sent_at || !card.estimated_delivery_at) return 0;

  const start = Date.parse(card.sent_at);
  const end = Date.parse(card.estimated_delivery_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;

  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/** Milliseconds until the server will consider this postcard delivered. */
export function millisUntilArrival(card: PostcardView, now: number = Date.now()): number {
  if (!card.estimated_delivery_at) return 0;
  return Math.max(0, Date.parse(card.estimated_delivery_at) - now);
}

/**
 * True when the browser's clock says the estimate has passed but the stored
 * status has not caught up yet. The UI uses this to trigger a re-read, never
 * to render the postcard as delivered on its own authority.
 */
export function isSettlementDue(card: PostcardView, now: number = Date.now()): boolean {
  return (
    card.status === "in_transit" &&
    card.estimated_delivery_at !== null &&
    Date.parse(card.estimated_delivery_at) <= now
  );
}

export function isReadable(card: PostcardView): boolean {
  return card.message_available && card.message !== null;
}

/** "4 hours", "2 days", "in a moment" — deliberately unhurried language. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return "less than a minute";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;

  const hours = seconds / 3600;
  if (hours < 24) {
    const rounded = Math.round(hours * 10) / 10;
    const display = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
    return `${display} hour${rounded === 1 ? "" : "s"}`;
  }

  const days = Math.round((seconds / 86400) * 10) / 10;
  const display = days % 1 === 0 ? String(days) : days.toFixed(1);
  return `${display} day${days === 1 ? "" : "s"}`;
}

export function formatDistance(km: number): string {
  if (km < 1) return "less than a kilometre";
  return `${Math.round(km).toLocaleString("en-US")} km`;
}

/** Short countdown for a card in flight: "3h 12m", "under a minute". */
export function formatCountdown(millis: number): string {
  const seconds = Math.max(0, Math.floor(millis / 1000));
  if (seconds < 60) return "under a minute";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function statusLabel(card: PostcardView): string {
  switch (card.status) {
    case "in_transit":
      return card.direction === "sent" ? "Travelling" : "On its way";
    case "arrived":
      return card.direction === "sent" ? "Delivered" : "Waiting for you";
    case "opened":
      return card.direction === "sent" ? "Read" : "Read";
    case "cancelled":
      return "Cancelled";
    default:
      return "Draft";
  }
}

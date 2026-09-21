import { describe, expect, it } from "vitest";

import {
  DEFAULT_DELIVERY_SETTINGS,
  estimateTravelSeconds,
  formatCountdown,
  formatDistance,
  formatDuration,
  isReadable,
  isSettlementDue,
  journeyProgress,
  millisUntilArrival,
} from "@/lib/delivery";
import { greatCirclePath, haversineKm, interpolateGreatCircle } from "@/lib/geo";
import type { PostcardView } from "@/lib/types";

/**
 * The delivery model has to be deterministic, or a postcard's arrival time
 * would move around under the reader. These tests pin the two halves of it:
 * the geography, and the clamp.
 */

const LONDON = { lat: 51.51, lng: -0.13 };
const PARIS = { lat: 48.86, lng: 2.35 };
const MANILA = { lat: 14.6, lng: 120.98 };

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm(LONDON, LONDON)).toBe(0);
  });

  it("matches known great-circle distances", () => {
    // London–Paris is ~344 km.
    expect(haversineKm(LONDON, PARIS)).toBeGreaterThan(330);
    expect(haversineKm(LONDON, PARIS)).toBeLessThan(355);

    // London–Manila is ~10,750 km.
    expect(haversineKm(LONDON, MANILA)).toBeGreaterThan(10_600);
    expect(haversineKm(LONDON, MANILA)).toBeLessThan(10_900);
  });

  it("is symmetric", () => {
    expect(haversineKm(LONDON, MANILA)).toBeCloseTo(haversineKm(MANILA, LONDON), 9);
  });

  it("handles antipodes without NaN", () => {
    const distance = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    expect(Number.isFinite(distance)).toBe(true);
    expect(distance).toBeGreaterThan(20_000);
  });

  it("crosses the antimeridian by the short way", () => {
    // Two points either side of the date line are close, not a world apart.
    const distance = haversineKm({ lat: 0, lng: 179 }, { lat: 0, lng: -179 });
    expect(distance).toBeLessThan(250);
  });
});

describe("interpolateGreatCircle", () => {
  it("returns the endpoints exactly at 0 and 1", () => {
    expect(interpolateGreatCircle(LONDON, MANILA, 0).lat).toBeCloseTo(LONDON.lat, 6);
    expect(interpolateGreatCircle(LONDON, MANILA, 1).lng).toBeCloseTo(MANILA.lng, 6);
  });

  it("puts the halfway point at half the distance", () => {
    const mid = interpolateGreatCircle(LONDON, MANILA, 0.5);
    const total = haversineKm(LONDON, MANILA);
    expect(haversineKm(LONDON, mid)).toBeCloseTo(total / 2, 3);
  });

  it("does not follow the straight line in lat/lng space", () => {
    // A long east-west route bends poleward; a naive lerp would not.
    const mid = interpolateGreatCircle(LONDON, MANILA, 0.5);
    const naiveLat = (LONDON.lat + MANILA.lat) / 2;
    expect(mid.lat).toBeGreaterThan(naiveLat + 5);
  });

  it("clamps out-of-range fractions", () => {
    expect(interpolateGreatCircle(LONDON, PARIS, -3).lat).toBeCloseTo(LONDON.lat, 6);
    expect(interpolateGreatCircle(LONDON, PARIS, 9).lat).toBeCloseTo(PARIS.lat, 6);
  });

  it("survives identical endpoints", () => {
    const point = interpolateGreatCircle(LONDON, LONDON, 0.5);
    expect(point.lat).toBeCloseTo(LONDON.lat, 9);
  });
});

describe("greatCirclePath", () => {
  it("returns segments + 1 points, in order", () => {
    const path = greatCirclePath(LONDON, MANILA, 8);
    expect(path).toHaveLength(9);
    expect(path[0]!.lat).toBeCloseTo(LONDON.lat, 6);
    expect(path[8]!.lat).toBeCloseTo(MANILA.lat, 6);
  });
});

describe("estimateTravelSeconds", () => {
  const settings = DEFAULT_DELIVERY_SETTINGS;

  it("never returns less than the floor", () => {
    expect(estimateTravelSeconds(0, settings)).toBe(settings.min_travel_seconds);
    expect(estimateTravelSeconds(1, settings)).toBe(settings.min_travel_seconds);
  });

  it("never returns more than the ceiling", () => {
    expect(estimateTravelSeconds(5_000_000, settings)).toBe(
      settings.max_travel_seconds,
    );
  });

  it("is monotonic in distance between the bounds", () => {
    const near = estimateTravelSeconds(2_000, settings);
    const far = estimateTravelSeconds(9_000, settings);
    expect(far).toBeGreaterThan(near);
  });

  it("is deterministic", () => {
    expect(estimateTravelSeconds(4_321.5, settings)).toBe(
      estimateTravelSeconds(4_321.5, settings),
    );
  });

  it("follows distance / speed for a mid-range journey", () => {
    // 1200 km at 1200 km/h is one hour, inside both bounds.
    expect(estimateTravelSeconds(1_200, settings)).toBe(3_600);
  });

  it("honours a different configured speed", () => {
    const slow = { ...settings, virtual_speed_kmh: 600 };
    expect(estimateTravelSeconds(1_200, slow)).toBe(7_200);
  });
});

/* ------------------------------------------------------------------ state */

function card(overrides: Partial<PostcardView> = {}): PostcardView {
  const sentAt = new Date("2026-01-01T00:00:00Z").toISOString();
  const arriveAt = new Date("2026-01-01T04:00:00Z").toISOString();

  return {
    id: "00000000-0000-0000-0000-000000000001",
    direction: "received",
    status: "in_transit",
    message: null,
    message_available: false,
    template_id: "t",
    template_slug: "plain-white",
    template_name: "Plain",
    template_design_config: {} as PostcardView["template_design_config"],
    counterpart_id: "u",
    counterpart_username: "anna",
    counterpart_display_name: "Anna",
    counterpart_avatar_url: null,
    origin_location_name: "Paris",
    destination_location_name: "London",
    origin_latitude: PARIS.lat,
    origin_longitude: PARIS.lng,
    destination_latitude: LONDON.lat,
    destination_longitude: LONDON.lng,
    distance_km: 344,
    travel_duration_seconds: 14_400,
    sent_at: sentAt,
    estimated_delivery_at: arriveAt,
    delivered_at: null,
    opened_at: null,
    created_at: sentAt,
    ...overrides,
  };
}

const AT = (iso: string) => Date.parse(iso);

describe("journeyProgress", () => {
  it("is 0 at the moment of sending", () => {
    expect(journeyProgress(card(), AT("2026-01-01T00:00:00Z"))).toBe(0);
  });

  it("is half way at half the duration", () => {
    expect(journeyProgress(card(), AT("2026-01-01T02:00:00Z"))).toBeCloseTo(0.5, 6);
  });

  it("clamps at 1 past the estimate", () => {
    expect(journeyProgress(card(), AT("2026-06-01T00:00:00Z"))).toBe(1);
  });

  it("is 1 for a postcard the server has already settled", () => {
    // Regardless of clock skew on the reader's device.
    expect(
      journeyProgress(card({ status: "arrived" }), AT("2026-01-01T00:00:01Z")),
    ).toBe(1);
    expect(
      journeyProgress(card({ status: "opened" }), AT("2026-01-01T00:00:01Z")),
    ).toBe(1);
  });

  it("never goes negative if the clock is behind", () => {
    expect(journeyProgress(card(), AT("2025-12-31T00:00:00Z"))).toBe(0);
  });
});

describe("isSettlementDue", () => {
  it("is false while genuinely in transit", () => {
    expect(isSettlementDue(card(), AT("2026-01-01T01:00:00Z"))).toBe(false);
  });

  it("is true once the estimate has passed but the status has not caught up", () => {
    expect(isSettlementDue(card(), AT("2026-01-01T05:00:00Z"))).toBe(true);
  });

  it("is false once the server has settled it", () => {
    expect(
      isSettlementDue(card({ status: "arrived" }), AT("2026-01-01T05:00:00Z")),
    ).toBe(false);
  });
});

describe("millisUntilArrival", () => {
  it("counts down and stops at zero", () => {
    expect(millisUntilArrival(card(), AT("2026-01-01T03:00:00Z"))).toBe(3_600_000);
    expect(millisUntilArrival(card(), AT("2026-01-02T00:00:00Z"))).toBe(0);
  });
});

describe("isReadable", () => {
  it("is false while the server withholds the message", () => {
    expect(isReadable(card())).toBe(false);
  });

  it("is true once the message is actually present", () => {
    expect(
      isReadable(card({ message: "hello", message_available: true })),
    ).toBe(true);
  });

  it("is false if the flag says available but nothing came back", () => {
    expect(isReadable(card({ message: null, message_available: true }))).toBe(false);
  });
});

/* ----------------------------------------------------------------- copy */

describe("formatting", () => {
  it("describes durations in human units", () => {
    expect(formatDuration(30)).toBe("less than a minute");
    expect(formatDuration(600)).toBe("10 minutes");
    expect(formatDuration(3_600)).toBe("1 hour");
    expect(formatDuration(7_200)).toBe("2 hours");
    expect(formatDuration(172_800)).toBe("2 days");
  });

  it("describes distances", () => {
    expect(formatDistance(0.4)).toBe("less than a kilometre");
    expect(formatDistance(1_247)).toBe("1,247 km");
  });

  it("counts down compactly", () => {
    expect(formatCountdown(20_000)).toBe("under a minute");
    expect(formatCountdown(3_600_000)).toBe("1h 0m");
    expect(formatCountdown(90_000_000)).toBe("1d 1h");
  });
});

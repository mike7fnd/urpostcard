"use client";

import { useEffect, useMemo, useState } from "react";

import { GlobeStage } from "@/components/globe/GlobeStage";
import { useMapStyle } from "@/components/map/MapStyleProvider";
import type { GlobePoint } from "@/components/globe/WorldGlobe";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { journeyProgress } from "@/lib/delivery";
import { angularDistance, interpolateGreatCircle } from "@/lib/geo";
import type { PostcardView } from "@/lib/types";

/**
 * The world as it stands right now: where you are, and every postcard
 * currently between somewhere and somewhere else.
 *
 * Quiet by design — it rotates slowly and does nothing else.
 */
export function HomeGlobe({
  home,
  inFlight,
}: {
  home: { lat: number; lng: number };
  inFlight: PostcardView[];
}) {
  const reduced = usePrefersReducedMotion();
  const mapStyle = useMapStyle();
  const [, setTick] = useState(0);

  // Trails creep forward; once a minute is far more than enough to see it.
  useEffect(() => {
    if (inFlight.length === 0) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [inFlight.length]);

  const journeys = useMemo(
    () =>
      inFlight.map((card) => {
        const from = { lat: card.origin_latitude, lng: card.origin_longitude };
        const to = {
          lat: card.destination_latitude,
          lng: card.destination_longitude,
        };
        const ratio = angularDistance(from, to) / Math.PI;
        const maxAltitude = Math.min(0.42, Math.max(0.06, 0.06 + ratio * 0.52));
        return { card, from, to, maxAltitude, progress: journeyProgress(card) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inFlight],
  );

  const routes = useMemo(
    () => journeys.map((j) => ({ from: j.from, to: j.to, maxAltitude: j.maxAltitude })),
    [journeys],
  );

  const trails = useMemo(
    () =>
      journeys
        .filter((j) => j.progress > 0.002)
        .map((j) => {
          const steps = 32;
          const coords: [number, number, number][] = [];
          for (let i = 0; i <= steps; i += 1) {
            const t = (i / steps) * j.progress;
            const p = interpolateGreatCircle(j.from, j.to, t);
            coords.push([p.lat, p.lng, j.maxAltitude * Math.sin(Math.PI * t)]);
          }
          return { coords };
        }),
    [journeys],
  );

  const points = useMemo<GlobePoint[]>(() => {
    const all: GlobePoint[] = [{ lat: home.lat, lng: home.lng, kind: "self" }];
    for (const j of journeys) {
      all.push({ lat: j.to.lat, lng: j.to.lng, kind: "destination" });
    }
    return all;
  }, [home, journeys]);

  return (
    <GlobeStage
      points={points}
      routes={routes}
      trails={trails}
      pov={{ lat: home.lat, lng: home.lng, altitude: 2.0 }}
      povMs={2600}
      autoRotate={!reduced}
      interactive={false}
      basemap={mapStyle}
      maxTileLevel={4}
    />
  );
}

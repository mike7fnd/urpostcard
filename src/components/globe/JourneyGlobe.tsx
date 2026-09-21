"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GlobeStage } from "@/components/globe/GlobeStage";
import type { GlobeApi } from "@/components/globe/WorldGlobe";
import { useMapStyle } from "@/components/map/MapStyleProvider";
import { Postcard } from "@/components/postcard/Postcard";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  angularDistance,
  initialBearing,
  interpolateGreatCircle,
  type LatLng,
} from "@/lib/geo";
import { isSettlementDue } from "@/lib/delivery";
import type { PostcardView } from "@/lib/types";

/**
 * A postcard crossing the world, in real time.
 *
 * The movement is fitted to the actual delivery. If the server decided the
 * journey takes eight minutes, the card takes eight minutes to cross, and at
 * any moment it is exactly where those two stored timestamps put it. Watch a
 * while and you see it move; close the tab and come back tomorrow and it is
 * further along, because the clock was never this page's to keep.
 *
 *   live (launch, observe) — the real journey, at its real pace.
 *   replay                 — the same route compressed into seconds, offered
 *                            only for a journey that already finished.
 *
 * The camera sits directly over the card, so the postcard holds the centre of
 * the frame and the world moves underneath it. A dashed line runs from it to
 * the recipient: the distance still to cover.
 *
 * Nothing out there is marked with a dot. The only thing named is the person
 * it is going to, and their name rises over the horizon as the card nears.
 */

export type JourneyMode = "launch" | "observe" | "replay";

const REPLAY_MS = 13_000;
/** A beat to fall out of the sky onto the sender's pin before anything moves. */
const DESCENT_MS = 1_100;

export function JourneyGlobe({
  card,
  mode = "observe",
  onSettlementDue,
  onFlightEnd,
  className = "",
}: {
  card: PostcardView;
  mode?: JourneyMode;
  onSettlementDue?: () => void;
  onFlightEnd?: () => void;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const mapStyle = useMapStyle();
  const [api, setApi] = useState<GlobeApi | null>(null);

  const cardHolder = useRef<HTMLButtonElement | null>(null);
  const nameHolder = useRef<HTMLDivElement | null>(null);
  const settled = useRef(false);
  const startedAt = useRef<number | null>(null);

  const replaying = mode === "replay";

  // The globe is the viewer's to move. Taking hold of it lets the postcard go;
  // tapping the postcard takes hold of it again.
  const [locked, setLocked] = useState(true);
  const follows = locked && !reduced;

  const tRef = useRef(0);
  const resumeUntil = useRef(0);

  const origin = useMemo<LatLng>(
    () => ({ lat: card.origin_latitude, lng: card.origin_longitude }),
    [card.origin_latitude, card.origin_longitude],
  );
  const destination = useMemo<LatLng>(
    () => ({ lat: card.destination_latitude, lng: card.destination_longitude }),
    [card.destination_latitude, card.destination_longitude],
  );

  /** The two timestamps the whole thing is fitted to. */
  const schedule = useMemo(() => {
    const from = card.sent_at ? Date.parse(card.sent_at) : NaN;
    const to = card.estimated_delivery_at ? Date.parse(card.estimated_delivery_at) : NaN;
    const done = card.status === "arrived" || card.status === "opened";
    return { from, to, done };
  }, [card.sent_at, card.estimated_delivery_at, card.status]);

  /**
   * Position straight off the clock, read per frame rather than from React
   * state, so however slow the motion is it is at least smooth.
   */
  const progressNow = useCallback(
    (now: number) => {
      if (schedule.done) return 1;
      if (!Number.isFinite(schedule.from) || !Number.isFinite(schedule.to)) return 0;
      if (schedule.to <= schedule.from) return 1;
      const span = schedule.to - schedule.from;
      return Math.min(1, Math.max(0, (now - schedule.from) / span));
    },
    [schedule],
  );

  const ratio = useMemo(
    () => angularDistance(origin, destination) / Math.PI,
    [origin, destination],
  );

  /** Low. A postcard crossing a country, not a satellite. */
  const cardAltitude = useMemo(() => Math.min(0.06, 0.012 + ratio * 0.07), [ratio]);

  /**
   * Cruising height, derived from how far there is to go.
   *
   * This has to come from the route, not a constant. At a fixed altitude a
   * short hop occupies a sliver of the frame and — spread across its real
   * delivery time — moves too little per minute to read as moving at all. So
   * the camera drops until the journey roughly fills the view: a neighbouring
   * town is watched from low down, a crossing of the Pacific from high up.
   *
   * Geometry: from altitude h you can see an arc of acos(1 / (1 + h)) radians,
   * so inverting that gives the altitude at which a given arc fits the frame.
   */
  const cruise = useMemo(() => {
    const route = angularDistance(origin, destination);
    const visible = Math.min(1.25, Math.max(0.02, route * 1.8));
    // The floor keeps the camera clear of the surface; below roughly this the
    // near plane starts clipping the terrain it is meant to be skimming.
    return Math.max(0.004, 1 / Math.cos(visible) - 1);
  }, [origin, destination]);

  /** Low over each pin at the ends, but never above the cruise itself. */
  const overPin = useMemo(() => Math.min(0.06, cruise * 0.5), [cruise]);

  /**
   * The camera sits directly over the postcard, always.
   *
   * Because it looks at the centre of the globe, every altitude along that
   * same radius projects to the same screen position — so the card lands dead
   * centre of frame and stays there for the whole journey. Nothing about it
   * moves; the world moves underneath it.
   */
  const cameraAt = useCallback(
    (t: number, descent: number) => {
      const here = interpolateGreatCircle(origin, destination, t);

      const lift = Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
      const flight = overPin + lift * (cruise - overPin);

      const from = Math.max(1.25, cruise * 2.2);
      const eased = 1 - (1 - descent) ** 3;
      return { lat: here.lat, lng: here.lng, altitude: from + (flight - from) * eased };
    },
    [origin, destination, cruise, overPin],
  );

  /* ---------------------------------------------------------- bookkeeping */

  // Drives the accessible status line, the trail, and the settlement check.
  // The visible motion does not wait on any of it.
  const [spoken, setSpoken] = useState(() => (replaying ? 0 : progressNow(Date.now())));

  useEffect(() => {
    if (replaying) return;

    const tick = () => {
      setSpoken(progressNow(Date.now()));
      if (!settled.current && isSettlementDue(card)) {
        settled.current = true;
        onSettlementDue?.();
      }
    };

    tick();
    const id = window.setInterval(tick, 5_000);
    return () => window.clearInterval(id);
  }, [card, replaying, progressNow, onSettlementDue]);

  useEffect(() => {
    if (!replaying) return;

    // The trail has to grow during a replay too, so this one does tick.
    const started = Date.now();
    const id = window.setInterval(() => {
      const t = Math.min(1, Math.max(0, (Date.now() - started - DESCENT_MS) / REPLAY_MS));
      setSpoken(t);
      if (t >= 1) {
        window.clearInterval(id);
        onFlightEnd?.();
      }
    }, 120);

    return () => window.clearInterval(id);
  }, [replaying, onFlightEnd]);

  /* ------------------------------------------------------ handing over the
     camera, and taking it back */

  const releaseToViewer = useCallback(() => setLocked(false), []);

  /** Tap the postcard and the camera flies back to it, then rides along. */
  const followPostcard = useCallback(() => {
    setLocked(true);
    if (!api) return;
    // Ease back rather than cutting, and hold off the per-frame updates until
    // that transition has played out.
    resumeUntil.current = performance.now() + 900;
    api.pointOfView(cameraAt(tRef.current, 1), 900);
  }, [api, cameraAt]);

  /* --------------------------------------------- camera when not following */

  const [pov, setPov] = useState<{ lat: number; lng: number; altitude: number } | null>(
    null,
  );

  useEffect(() => {
    if (!api || follows) return;
    // Reduced motion: one still frame holding the whole route.
    setPov({
      ...interpolateGreatCircle(origin, destination, 0.5),
      altitude: 1.15 + ratio * 1.45,
    });
  }, [api, follows, origin, destination, ratio]);

  /* ------------------------------------ one loop: the world, card and name */

  useEffect(() => {
    if (!api) return;
    let frame = 0;

    /** Positions an overlay, and hides it when its point is over the horizon. */
    const place = (
      el: HTMLElement | null,
      point: LatLng,
      pointAltitude: number,
      camera: { lat: number; lng: number; altitude: number },
      apply: (el: HTMLElement, screen: { x: number; y: number }) => void,
    ) => {
      if (!el) return;

      // How much of the sphere is visible from where the camera is. Without
      // this, anything on the far side projects straight through the planet.
      const horizon = Math.acos(1 / (1 + Math.max(camera.altitude, 0.001))) + 0.06;
      const away = angularDistance(point, { lat: camera.lat, lng: camera.lng });
      const screen =
        away > horizon ? null : api.screenCoords(point.lat, point.lng, pointAltitude);

      if (!screen) {
        el.style.opacity = "0";
        return;
      }

      apply(el, screen);
      // Fade up as it clears the horizon rather than popping into existence.
      el.style.opacity = Math.min(1, (horizon - away) / 0.12).toFixed(3);
    };

    const draw = (clock: number) => {
      startedAt.current ??= clock;
      const since = clock - startedAt.current;
      const descent = follows ? Math.min(1, since / DESCENT_MS) : 1;

      const t = replaying
        ? easeInOutSine(Math.min(1, Math.max(0, (since - DESCENT_MS) / REPLAY_MS)))
        : progressNow(Date.now());

      tRef.current = t;

      // Unlocked, the camera belongs to whoever is dragging it, so the horizon
      // test has to read where it actually ended up rather than where this
      // component would have put it.
      const camera = follows
        ? cameraAt(t, descent)
        : (api.currentPov() ?? pov ?? cameraAt(t, 1));

      // A re-lock flies the camera back over a beat; do not stamp on it.
      if (follows && clock >= resumeUntil.current) api.pointOfView(camera, 0);

      const here = interpolateGreatCircle(origin, destination, t);
      const altitude = cardAltitude * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));

      place(cardHolder.current, here, altitude, camera, (el, screen) => {
        const bearing = initialBearing(here, destination);
        const lift = 0.7 + (altitude / Math.max(cardAltitude, 0.001)) * 0.55;
        el.style.transform =
          `translate3d(${screen.x}px, ${screen.y}px, 0) translate(-50%, -50%) ` +
          `scale(${lift.toFixed(3)}) rotateX(46deg) ` +
          `rotateZ(${(bearing - 90).toFixed(2)}deg)`;
      });

      place(nameHolder.current, destination, 0, camera, (el, screen) => {
        el.style.transform =
          `translate3d(${screen.x}px, ${screen.y}px, 0) translate(-50%, -100%)`;
      });

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [
    api,
    follows,
    replaying,
    pov,
    cameraAt,
    progressNow,
    origin,
    destination,
    cardAltitude,
  ]);

  /* ----------------------------------------------------------------- route */

  // Rebuilt a few hundred times across the whole journey, not per frame.
  const trailStep = Math.round(spoken * 400);

  /**
   * Two lines, meeting at the postcard: the ground already covered, solid
   * behind it, and the road still to go, dashed and running ahead of it all
   * the way to the recipient.
   */
  const trailList = useMemo(() => {
    const at = trailStep / 400;
    const steps = 48;

    const sample = (from: number, to: number, dashed: boolean) => {
      const coords: [number, number, number][] = [];
      for (let i = 0; i <= steps; i += 1) {
        const t = from + ((to - from) * i) / steps;
        const p = interpolateGreatCircle(origin, destination, t);
        coords.push([p.lat, p.lng, cardAltitude * Math.sin(Math.PI * t)]);
      }
      return { coords, dashed };
    };

    const lines: { coords: [number, number, number][]; dashed: boolean }[] = [];
    if (at > 0.001) lines.push(sample(0, at, false));
    if (at < 0.999) lines.push(sample(at, 1, true));
    return lines;
  }, [origin, destination, cardAltitude, trailStep]);

  /** Who is at the far end. Nothing else out there is labelled at all. */
  const destinationName =
    card.direction === "sent" ? `@${card.counterpart_username}` : "you";

  return (
    <div className={`sky relative h-full w-full overflow-hidden ${className}`}>
      <GlobeStage
        trails={trailList}
        points={[]}
        pov={follows ? null : pov}
        povMs={1600}
        // Down at cruising height there has to be something to see: coarse
        // tiles at this range are a blur, and a blur does not look like motion.
        basemap={mapStyle}
        maxTileLevel={10}
        // A short journey is watched from very low down. Leave this at the
        // default and the controls clamp the camera back out every frame,
        // which is what made the journey look frozen.
        minAltitude={0.0015}
        interactive
        onUserAdjust={releaseToViewer}
        autoRotate={false}
        onReady={setApi}
      />

      <div className="pointer-events-none absolute inset-0">
        {/* the person it is going to, waiting at the far end */}
        <div
          ref={nameHolder}
          className="absolute left-0 top-0 opacity-0 will-change-transform"
          aria-hidden
        >
          {/* A pill, not bare text: this has to stay legible over pale
              streets, dark streets and photographed ground alike. */}
          <span className="flex flex-col items-center gap-1">
            <span className="whitespace-nowrap rounded-full bg-black/65 px-2.5 py-1 text-[12.5px] tracking-[0.06em] text-white backdrop-blur-[2px]">
              {destinationName}
            </span>
            <span className="h-2 w-px bg-white/45" />
          </span>
        </div>

        {/* the object in flight — and the way back to it */}
        <button
          type="button"
          ref={cardHolder}
          onClick={followPostcard}
          aria-label={
            locked
              ? "The postcard. The view is following it."
              : "Follow the postcard again"
          }
          className="pointer-events-auto absolute left-0 top-0 w-[150px] cursor-pointer opacity-0 will-change-transform sm:w-[190px]"
          style={{
            perspective: "900px",
            filter: "drop-shadow(0 26px 34px rgb(0 0 0 / 0.55))",
          }}
        >
          <Postcard design={card.template_design_config} face="front" caption={null} />
        </button>
      </div>

      {/* Only offered once the viewer has taken the globe for themselves. */}
      {!locked && !reduced ? (
        <div className="safe-top pointer-events-none absolute inset-x-0 top-0 flex justify-center px-4 pt-4">
          <button
            type="button"
            onClick={followPostcard}
            className="tap pointer-events-auto inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/15 bg-black/55 px-4 text-[13px] text-white backdrop-blur transition-colors hover:bg-black/70"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#ff8256" }}
              aria-hidden
            />
            Follow the postcard
          </button>
        </div>
      ) : null}

      <p className="sr-only" role="status">
        {spoken >= 1
          ? "The postcard has reached its destination."
          : `The postcard is ${Math.round(spoken * 100)} percent of the way there.`}
      </p>
    </div>
  );
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { GlobeStage } from "@/components/globe/GlobeStage";
import { SurfaceTheme } from "@/components/pwa/SurfaceTheme";
import type { GlobeApi } from "@/components/globe/WorldGlobe";
import { Button } from "@/components/ui/Button";
import { useMapStyle } from "@/components/map/MapStyleProvider";
import { MAP_CREDITS, PLACES_CREDIT } from "@/lib/attribution";
import { angularDistance, coarsen } from "@/lib/geo";
import type { GeoPlace } from "@/lib/types";

/**
 * Where a person's postcards find them.
 *
 * The pin is coarsened to roughly a kilometre before it is ever shown or saved,
 * and the label is a town, never an address. Search and reverse lookup both go
 * through our own API routes.
 */

export interface PickedLocation {
  latitude: number;
  longitude: number;
  name: string;
}

export function LocationPicker({
  initial,
  confirmLabel = "This is my place",
  onConfirm,
  busy = false,
  children,
}: {
  initial?: PickedLocation | null;
  confirmLabel?: string;
  onConfirm: (location: PickedLocation) => void;
  busy?: boolean;
  /** Heading area rendered above the search field. */
  children?: React.ReactNode;
}) {
  const mapStyle = useMapStyle();
  const [pin, setPin] = useState<PickedLocation | null>(initial ?? null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [naming, setNaming] = useState(false);
  const [pov, setPov] = useState<{ lat: number; lng: number; altitude: number } | null>(
    initial ? { lat: initial.latitude, lng: initial.longitude, altitude: 0.12 } : null,
  );
  const [api, setApi] = useState<GlobeApi | null>(null);
  const requestId = useRef(0);
  const marker = useRef<HTMLDivElement | null>(null);

  // The pin is a marker over the canvas, not a dot drawn into the globe, so it
  // stays the size of a pin at every zoom instead of swelling into a blob.
  const pinAt = useRef<{ lat: number; lng: number } | null>(null);
  pinAt.current = pin ? { lat: pin.latitude, lng: pin.longitude } : null;

  useEffect(() => {
    if (!api) return;
    let frame = 0;

    const place = () => {
      const el = marker.current;
      const here = pinAt.current;

      if (el && here) {
        const camera = api.currentPov();
        // Hide it when it goes round the back, or it projects through the
        // planet and floats over the wrong ocean.
        const horizon = camera
          ? Math.acos(1 / (1 + Math.max(camera.altitude, 0.001))) + 0.06
          : Math.PI;
        const away = camera
          ? angularDistance(here, { lat: camera.lat, lng: camera.lng })
          : 0;
        const screen = away > horizon ? null : api.screenCoords(here.lat, here.lng, 0);

        if (screen) {
          // -100% so the point of the pin sits on the coordinate, not its middle.
          el.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0) translate(-50%, -100%)`;
          el.style.opacity = "1";
        } else {
          el.style.opacity = "0";
        }
      }

      frame = requestAnimationFrame(place);
    };

    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [api]);

  /* search, debounced */
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    const id = window.setTimeout(async () => {
      const mine = ++requestId.current;
      setSearching(true);
      try {
        const response = await fetch(`/api/places/search?q=${encodeURIComponent(term)}`);
        const payload = (await response.json()) as { places?: GeoPlace[] };
        if (mine === requestId.current) setResults(payload.places ?? []);
      } catch {
        if (mine === requestId.current) setResults([]);
      } finally {
        if (mine === requestId.current) setSearching(false);
      }
    }, 320);

    return () => window.clearTimeout(id);
  }, [query]);

  const dropPin = useCallback(async ({ lat, lng }: { lat: number; lng: number }) => {
    const latitude = coarsen(lat, "city");
    const longitude = coarsen(lng, "city");

    setPin({ latitude, longitude, name: "" });
    setNaming(true);

    try {
      const response = await fetch(`/api/places/reverse?lat=${latitude}&lng=${longitude}`);
      const payload = (await response.json()) as { place?: GeoPlace | null };
      setPin({
        latitude,
        longitude,
        name: payload.place?.name ?? "An unnamed place",
      });
    } catch {
      setPin({ latitude, longitude, name: "An unnamed place" });
    } finally {
      setNaming(false);
    }
  }, []);

  function choosePlace(place: GeoPlace) {
    const latitude = coarsen(place.latitude, "city");
    const longitude = coarsen(place.longitude, "city");
    setPin({ latitude, longitude, name: place.name });
    setPov({ lat: latitude, lng: longitude, altitude: 0.09 });
    setResults([]);
    setQuery("");
  }

  return (
    <div className="sky relative h-dvh w-full overflow-hidden">
      <SurfaceTheme surface="sky" />

      <div className="absolute inset-0">
        <GlobeStage
          interactive
          // Labelled cartography, because this is the one screen where the
          // question is "which of these is mine?" and photography cannot
          // answer it. Deep enough to read street and neighbourhood names.
          basemap={mapStyle}
          maxTileLevel={14}
          // Close enough to put the pin on the right side of a river.
          minAltitude={0.012}
          showAttribution={false}
          autoRotate={!pin}
          onSelect={dropPin}
          pov={pov}
          points={[]}
          onReady={setApi}
        />
      </div>

      {/*
        Same treatment as the home screen: the map is held back at the top and
        bottom so type sits on paper, and left clear through the middle where
        the pin actually goes. Drop shadows behind text over a blue map was
        never going to read cleanly.
      */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[34%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(246,243,236,0.97) 0%, rgba(246,243,236,0.72) 46%, rgba(246,243,236,0) 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%]"
        style={{
          background:
            "linear-gradient(0deg, rgba(246,243,236,0.97) 0%, rgba(246,243,236,0.74) 44%, rgba(246,243,236,0) 100%)",
        }}
        aria-hidden
      />

      {/* the pin itself */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          ref={marker}
          className="absolute left-0 top-0 opacity-0 will-change-transform"
          style={{ display: pin ? undefined : "none" }}
        >
          <MapPin />
        </div>
      </div>

      {/* top: prompt and search */}
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 px-5 pt-5">
        <div className="pointer-events-auto mx-auto w-full max-w-[520px]">
          {children}

          <div className="mt-5">
            <label className="sr-only" htmlFor="place-search">
              Search for a place
            </label>
            <input
              id="place-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a town or city"
              autoComplete="off"
              className="min-h-[48px] w-full rounded-full border border-line/70 bg-paper/92 px-5 text-[15px] text-ink shadow-lift-sm backdrop-blur placeholder:text-ink-faint focus:border-ink-faint focus:outline-none"
            />

            <AnimatePresence>
              {results.length > 0 ? (
                <motion.ul
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 overflow-hidden rounded-2xl border border-line/70 bg-paper/95 shadow-lift backdrop-blur"
                >
                  {results.map((place) => (
                    <li key={`${place.latitude},${place.longitude},${place.name}`}>
                      <button
                        type="button"
                        onClick={() => choosePlace(place)}
                        className="min-h-[48px] w-full px-5 py-3 text-left text-[15px] text-ink transition-colors hover:bg-paper-deep"
                      >
                        {place.name}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>

            {searching && results.length === 0 ? (
              <p className="mt-3 px-2 text-[13px] text-ink-soft">Looking…</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* bottom: the pin and confirmation */}
      <div className="safe-bottom absolute inset-x-0 bottom-0 px-5 pb-5">
        <div className="mx-auto w-full max-w-[520px]">
          <AnimatePresence mode="popLayout">
            {pin ? (
              <motion.div
                key="pinned"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-3xl border border-line/70 bg-paper/96 p-5 shadow-lift-lg backdrop-blur"
              >
                <p className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">
                  Your postcards arrive at
                </p>
                <p className="mt-1.5 font-display text-[24px] leading-tight text-ink">
                  {naming ? "…" : pin.name || "An unnamed place"}
                </p>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
                  Others will only ever see this name. The pin is rounded to about
                  a kilometre and used to work out how far a postcard has to travel.
                </p>

                <div className="mt-5 flex gap-3">
                  <Button
                    variant="primary"
                    className="flex-1"
                    loading={busy}
                    disabled={naming}
                    onClick={() => onConfirm(pin)}
                  >
                    {confirmLabel}
                  </Button>
                  <Button
                    variant="ghost"
                    className="shrink-0 text-ink-soft hover:text-ink"
                    onClick={() => setPin(null)}
                  >
                    Move it
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pb-1 text-center text-[14.5px] leading-relaxed text-ink-soft"
              >
                Turn the globe and tap where you are, or search above.
              </motion.p>
            )}
          </AnimatePresence>

          {/* Rendered here rather than by the globe, where the bottom sheet
              would cover it once a pin is dropped. */}
          <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-faint">
            {MAP_CREDITS[mapStyle]} · {PLACES_CREDIT}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * An ordinary map pin: small, with its point on the spot and a shadow on the
 * ground beneath it. Drawn at a fixed pixel size rather than in globe units,
 * so zooming in does not turn it into a red balloon.
 */
function MapPin() {
  return (
    <span className="block">
      <svg
        viewBox="0 0 24 32"
        className="h-[30px] w-[22px]"
        style={{ filter: "drop-shadow(0 3px 4px rgb(0 0 0 / 0.35))" }}
        aria-hidden
        focusable="false"
      >
        <path
          d="M12 1.6c-5 0-9 3.9-9 8.8 0 6.2 7.7 13.9 8.6 20 .07.5.73.5.8 0C13.3 24.3 21 16.6 21 10.4c0-4.9-4-8.8-9-8.8Z"
          fill="#a8563c"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10.2" r="3.1" fill="#ffffff" opacity="0.92" />
      </svg>
    </span>
  );
}

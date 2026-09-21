"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { GlobeStage } from "@/components/globe/GlobeStage";
import { SurfaceTheme } from "@/components/pwa/SurfaceTheme";
import type { GlobeApi } from "@/components/globe/WorldGlobe";
import { Button } from "@/components/ui/Button";
import { useMapStyle } from "@/components/map/MapStyleProvider";
import { MAP_CREDITS, PLACES_CREDIT } from "@/lib/attribution";
import { coarsen } from "@/lib/geo";
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
  const [, setApi] = useState<GlobeApi | null>(null);
  const requestId = useRef(0);

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
          points={
            pin
              ? [{ lat: pin.latitude, lng: pin.longitude, kind: "destination" as const }]
              : []
          }
          onReady={setApi}
        />
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
                className="rounded-3xl border border-line/70 bg-paper/95 p-5 shadow-lift backdrop-blur"
              >
                <p className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">
                  Your postcards arrive at
                </p>
                <p className="mt-1.5 font-display text-[24px] leading-tight text-ink">
                  {naming ? "…" : pin.name || "An unnamed place"}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
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
                    className="text-ink-soft hover:text-ink"
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
                className="pb-2 text-center text-[14px] text-ink drop-shadow-[0_1px_6px_rgba(255,255,255,0.9)]"
              >
                Turn the globe and tap where you are, or search above.
              </motion.p>
            )}
          </AnimatePresence>

          {/* Rendered here rather than by the globe, where the bottom sheet
              would cover it once a pin is dropped. */}
          <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-soft/80">
            {MAP_CREDITS[mapStyle]} · {PLACES_CREDIT}
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";

import { IMAGERY_CREDIT, STREETS_CREDIT } from "@/lib/attribution";
import type { LatLng } from "@/lib/geo";

/**
 * The world. The real one.
 *
 * Satellite imagery is streamed as slippy-map tiles and reprojected onto the
 * sphere by three-globe's tile engine, so this is actual Earth — coastlines,
 * terrain, cities — rather than a stylised model of it. Country borders are
 * drawn over the top as hairlines, which also keeps the shape of the world
 * legible while tiles are still loading.
 *
 * Detail is capped per use: a journey seen from orbit has no business pulling
 * street-level tiles, while the location picker needs enough to recognise a
 * town. Nothing loads until the globe mounts.
 *
 * This component is never imported directly — see GlobeStage, which loads it
 * on demand with ssr disabled.
 */

/**
 * Two basemaps, because the globe does two different jobs.
 *
 * `imagery` is for watching a postcard cross the world — photographic, dark,
 * wordless, something to fly over. It is useless for telling one suburb from
 * the next.
 *
 * `streets` is for pinning yourself: OpenStreetMap, with the place names,
 * roads and coastlines you need to say "yes, that one" with any confidence.
 *
 * Neither needs an API key. Both require attribution, rendered below.
 *
 * Note on tile.openstreetmap.org: the OSMF tile policy asks that heavy or
 * commercial traffic not point at it. For production, swap the `streets` url
 * for an OSM-data mirror that welcomes app traffic — CARTO is a drop-in:
 *   https://a.basemaps.cartocdn.com/rastertiles/voyager/{level}/{x}/{y}.png
 * (credit then becomes "© OpenStreetMap contributors, © CARTO").
 */
export type Basemap = "imagery" | "streets";

const BASEMAPS: Record<
  Basemap,
  {
    url: (x: number, y: number, level: number) => string;
    credit: string;
    /** OSM already draws borders; over imagery we add our own hairlines. */
    borders: boolean;
    atmosphere: string;
    /** How hard the edges are held back. Imagery can take far more. */
    vignette: number;
    marks: { origin: string; destination: string; ring: string; route: string };
  }
> = {
  imagery: {
    url: (x, y, level) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${level}/${y}/${x}`,
    credit: IMAGERY_CREDIT,
    borders: true,
    atmosphere: "#6f97bd",
    vignette: 0.72,
    marks: {
      origin: "#ff8256",
      destination: "#ffe9c6",
      ring: "255,233,198",
      route: "255,242,222",
    },
  },
  streets: {
    url: (x, y, level) => `https://tile.openstreetmap.org/${level}/${x}/${y}.png`,
    credit: STREETS_CREDIT,
    borders: false,
    atmosphere: "#a8c6e0",
    // Light cartography: a heavy vignette would swallow the labels people are
    // reading to place themselves.
    vignette: 0.3,
    marks: {
      origin: "#a8563c",
      destination: "#a8563c",
      ring: "168,86,60",
      route: "60,44,32",
    },
  },
};


export interface GlobePoint {
  lat: number;
  lng: number;
  kind: "origin" | "destination" | "self";
}

export interface GlobeApi {
  screenCoords: (lat: number, lng: number, altitude?: number) => { x: number; y: number } | null;
  pointOfView: (pov: { lat: number; lng: number; altitude: number }, ms?: number) => void;
}

export interface WorldGlobeProps {
  points?: GlobePoint[];
  /** Faint full route. */
  routes?: { from: LatLng; to: LatLng; maxAltitude: number }[];
  /**
   * Paths along the surface. Solid by default — the stretch already covered.
   * `dashed` draws it as a running dotted line instead, which is what the
   * road still ahead of the postcard looks like.
   */
  trails?: { coords: [number, number, number][]; dashed?: boolean }[];
  pov?: { lat: number; lng: number; altitude: number } | null;
  povMs?: number;
  autoRotate?: boolean;
  interactive?: boolean;
  /**
   * Deepest imagery zoom to request. 4–5 is plenty from orbit; the location
   * picker goes higher so a person can find their own town.
   */
  maxTileLevel?: number;
  /** Which world to draw. See BASEMAPS. */
  basemap?: Basemap;
  /**
   * Closest the camera may get, as a fraction of globe radius. The default
   * keeps cinematic surfaces at arm length; the picker needs to come right
   * down, or the detailed tiles it asks for could never be reached.
   */
  minAltitude?: number;
  /** Set false only when the host surface renders the credit itself. */
  showAttribution?: boolean;
  onSelect?: (coords: LatLng) => void;
  onReady?: (api: GlobeApi) => void;
  className?: string;
}

type CountryFeature = { type: "Feature"; geometry: unknown; properties: Record<string, unknown> };

/** Borders sit over the imagery; the sphere beneath shows only through gaps. */
const BORDER = "rgba(226,214,190,0.22)";
const OCEAN = "#0b1016";

/** three-globe renders the planet at this radius. */
const GLOBE_RADIUS = 100;

export default function WorldGlobe({
  points = [],
  routes = [],
  trails = [],
  pov = null,
  povMs = 1400,
  autoRotate = false,
  interactive = true,
  maxTileLevel = 5,
  basemap = "imagery",
  minAltitude = 0.8,
  showAttribution = true,
  onSelect,
  onReady,
  className = "",
}: WorldGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const holderRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [countries, setCountries] = useState<CountryFeature[]>([]);

  /* --- size to the container, and only to the container ------------------ */
  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* --- land ------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [{ feature }, topo] = await Promise.all([
        import("topojson-client"),
        import("world-atlas/countries-110m.json"),
      ]);
      if (cancelled) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const atlas = (topo as any).default ?? topo;
      const collection = feature(atlas, atlas.objects.countries) as unknown as {
        features: CountryFeature[];
      };
      setCountries(collection.features);
    })().catch(() => {
      // Land is decoration; an ocean-only globe is still a globe.
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /* --- material & controls ---------------------------------------------- */
  // three-globe hides the base sphere while the tile engine is on, so this is
  // only what the globe falls back to if imagery is ever switched off. If the
  // tiles simply fail to arrive, what remains is the country outlines and the
  // atmosphere halo — still recognisably a planet, just an unlit one.
  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: new THREE.Color(OCEAN),
        shininess: 4,
        specular: new THREE.Color("#141a21"),
      }),
    [],
  );

  const handleReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;

    // react-globe.gl's prop typings predate three-globe's tile engine, so the
    // depth cap is set on the instance. Without it the engine will happily
    // fetch street-level tiles for a globe nobody is that close to.
    (globe as unknown as { globeTileEngineMaxLevel?: (level: number) => unknown })
      .globeTileEngineMaxLevel?.(maxTileLevel);

    const controls = globe.controls();
    controls.enableZoom = interactive;
    controls.enablePan = false;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.28;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    // three-globe draws the planet at radius 100, so distance is radius plus
    // altitude in the same units the point-of-view API uses.
    controls.minDistance = GLOBE_RADIUS * (1 + minAltitude);
    controls.maxDistance = 800;

    onReady?.({
      screenCoords: (lat, lng, altitude = 0) => {
        const point = globeRef.current?.getScreenCoords(lat, lng, altitude);
        return point && Number.isFinite(point.x) ? { x: point.x, y: point.y } : null;
      },
      pointOfView: (next, ms = 0) => globeRef.current?.pointOfView(next, ms),
    });
  }, [autoRotate, interactive, maxTileLevel, minAltitude, onReady]);

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (controls) controls.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    if (pov) globeRef.current?.pointOfView(pov, povMs);
  }, [pov, povMs]);

  const world = BASEMAPS[basemap];

  const routeArcs = useMemo(
    () =>
      routes.map((route) => ({
        startLat: route.from.lat,
        startLng: route.from.lng,
        endLat: route.to.lat,
        endLng: route.to.lng,
        altitude: route.maxAltitude,
      })),
    [routes],
  );

  return (
    <div ref={holderRef} className={`relative h-full w-full ${className}`}>
      {size.width > 0 ? (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          onGlobeReady={handleReady}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          showAtmosphere
          atmosphereColor={world.atmosphere}
          atmosphereAltitude={0.17}
          enablePointerInteraction={interactive}
          onGlobeClick={
            onSelect ? ({ lat, lng }) => onSelect({ lat, lng }) : undefined
          }
          /* real Earth — the depth cap is applied on the instance above */
          globeTileEngineUrl={world.url}
          /* borders over the imagery; OSM draws its own */
          polygonsData={world.borders ? countries : []}
          polygonCapColor={() => "rgba(0,0,0,0)"}
          polygonSideColor={() => "rgba(0,0,0,0)"}
          polygonStrokeColor={() => BORDER}
          polygonAltitude={0.006}
          /* route */
          arcsData={routeArcs}
          arcColor={() => [
            `rgba(${world.marks.route},0.06)`,
            `rgba(${world.marks.route},0.38)`,
            `rgba(${world.marks.route},0.06)`,
          ]}
          arcAltitude="altitude"
          arcStroke={0.28}
          arcsTransitionDuration={0}
          /* travelled trail */
          pathsData={trails}
          pathPoints="coords"
          pathPointLat={(p) => (p as number[])[0]}
          pathPointLng={(p) => (p as number[])[1]}
          pathPointAlt={(p) => (p as number[])[2]}
          pathColor={(p: object) =>
            (p as { dashed?: boolean }).dashed
              ? `rgba(${world.marks.route},0.6)`
              : [`rgba(${world.marks.route},0)`, `rgba(${world.marks.route},0.85)`]
          }
          pathStroke={(p: object) => ((p as { dashed?: boolean }).dashed ? 0.7 : 1.1)}
          /* Dashes, and dashes that run — the line ahead reads as a track
             being followed rather than a border that happens to be there. */
          pathDashLength={(p: object) =>
            (p as { dashed?: boolean }).dashed ? 0.022 : 1
          }
          pathDashGap={(p: object) => ((p as { dashed?: boolean }).dashed ? 0.018 : 0)}
          pathDashAnimateTime={(p: object) =>
            (p as { dashed?: boolean }).dashed ? 9000 : 0
          }
          pathTransitionDuration={0}
          /* endpoints */
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.012}
          pointRadius={0.34}
          pointColor={(d: object) =>
            (d as GlobePoint).kind === "destination"
              ? world.marks.destination
              : world.marks.origin
          }
          pointsTransitionDuration={0}
          ringsData={points}
          ringLat="lat"
          ringLng="lng"
          ringColor={() => () => `rgba(${world.marks.ring},0.42)`}
          ringMaxRadius={2.6}
          ringPropagationSpeed={0.9}
          ringRepeatPeriod={2600}
        />
      ) : null}

      {/*
        Satellite imagery is bright and busy. This holds it back at the edges
        so the postcard and its trail stay the brightest things on screen —
        the world is the setting, not the subject.
      */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            `radial-gradient(circle at 50% 46%, rgba(10,11,13,0) 34%, rgba(10,11,13,${(world.vignette * 0.47).toFixed(3)}) 72%, rgba(10,11,13,${world.vignette}) 100%)`,
        }}
        aria-hidden
      />

      {showAttribution ? (
        <p className="pointer-events-none absolute bottom-1.5 right-2.5 text-[10px] leading-none text-white/35">
          {world.credit}
        </p>
      ) : null}
    </div>
  );
}

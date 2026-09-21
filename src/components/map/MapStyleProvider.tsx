"use client";

import { createContext, useContext } from "react";

import type { MapStyle } from "@/lib/types";

/**
 * Which world to draw, read from the signed-in profile.
 *
 * Provided from the server layout rather than looked up per globe: the value
 * is already in hand there, so the first globe renders in the chosen style
 * instead of flashing the default while a preference loads.
 *
 * The fallback is the light OpenStreetMap, which is also what a profile gets
 * by default, so anything rendered outside a provider still looks right.
 */
const MapStyleContext = createContext<MapStyle>("streets");

export function MapStyleProvider({
  value,
  children,
}: {
  value: MapStyle;
  children: React.ReactNode;
}) {
  return <MapStyleContext value={value}>{children}</MapStyleContext>;
}

export function useMapStyle(): MapStyle {
  return useContext(MapStyleContext);
}

/** Copy for the three choices, used by Settings. */
export const MAP_STYLE_CHOICES: {
  value: MapStyle;
  name: string;
  detail: string;
}[] = [
  {
    value: "streets",
    name: "Map",
    detail: "OpenStreetMap. Place names and roads.",
  },
  {
    value: "satellite",
    name: "Satellite",
    detail: "Aerial imagery. No labels.",
  },
];

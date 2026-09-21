import type { MapStyle } from "@/lib/types";

/**
 * Credits for the data this product borrows. Kept in its own tiny module so a
 * surface can render them without importing the WebGL globe (and three.js
 * with it) just to reach a string.
 */

export const MAP_CREDITS: Record<MapStyle, string> = {
  streets: "© OpenStreetMap contributors",
  satellite: "Imagery © Esri, Maxar, Earthstar Geographics",
};

/** Nominatim / OpenStreetMap, used for place search and reverse lookup. */
export const PLACES_CREDIT = "Places from OpenStreetMap";

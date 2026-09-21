/**
 * Credits for the data this product borrows. Kept in its own tiny module so a
 * surface can render them without importing the WebGL globe (and three.js
 * with it) just to reach a string.
 */

/** Esri World Imagery — the cinematic basemap the journey flies over. */
export const IMAGERY_CREDIT = "Imagery © Esri, Maxar, Earthstar Geographics";

/** OpenStreetMap — the labelled basemap people pin their location on. */
export const STREETS_CREDIT = "© OpenStreetMap contributors";

/** Nominatim / OpenStreetMap, used for place search and reverse lookup. */
export const PLACES_CREDIT = "Places from OpenStreetMap";

import "server-only";

import { GEOCODER_USER_AGENT } from "@/lib/env";
import type { GeoPlace } from "@/lib/types";

/**
 * Place lookup, proxied through our own server so the browser never talks to
 * the geocoder directly: it keeps the required User-Agent honest, lets us cache,
 * and means a user's typing never leaves an origin they did not visit.
 *
 * OpenStreetMap / Nominatim. Attribution is shown wherever the map is.
 */

const BASE = "https://nominatim.openstreetmap.org";

interface NominatimPlace {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string | undefined>;
}

/**
 * "Bongabong, Oriental Mindoro" — the granularity we are willing to show
 * another person. Never a street or a house number.
 */
function placeLabel(place: NominatimPlace): string {
  const a = place.address ?? {};
  const locality =
    a.city ??
    a.town ??
    a.village ??
    a.municipality ??
    a.hamlet ??
    a.suburb ??
    a.county ??
    place.name;
  const region = a.state ?? a.region ?? a.province ?? a.county;
  const country = a.country;

  const parts = [locality, region && region !== locality ? region : null]
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return country ?? place.display_name.split(",")[0]!.trim();
  if (parts.length === 1 && country) return `${parts[0]}, ${country}`;
  return parts.join(", ");
}

async function nominatim(path: string, params: Record<string, string>) {
  const url = new URL(`${BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url, {
    headers: {
      "User-Agent": GEOCODER_USER_AGENT(),
      "Accept-Language": "en",
    },
    // Place names do not move. Cache hard.
    next: { revalidate: 60 * 60 * 24 * 7 },
  });

  if (!response.ok) {
    throw new Error(`Geocoder responded ${response.status}`);
  }

  return response.json();
}

export async function searchPlaces(query: string, limit = 6): Promise<GeoPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const results = (await nominatim("/search", {
    q: trimmed,
    limit: String(Math.min(Math.max(limit, 1), 10)),
    // Settlements and regions only: no buildings, no addresses.
    featureType: "settlement",
  })) as NominatimPlace[];

  return results.map((place) => ({
    name: placeLabel(place),
    latitude: Number(place.lat),
    longitude: Number(place.lon),
  }));
}

export async function reversePlace(
  latitude: number,
  longitude: number,
): Promise<GeoPlace | null> {
  const result = (await nominatim("/reverse", {
    lat: String(latitude),
    lon: String(longitude),
    // zoom 10 ≈ city/town, deliberately coarse.
    zoom: "10",
  })) as NominatimPlace & { error?: string };

  if (!result || result.error || !result.lat) return null;

  return {
    name: placeLabel(result),
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  };
}

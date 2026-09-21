/**
 * Geography. Pure functions, no side effects, mirrored by SQL equivalents in
 * supabase/migrations/0002_functions.sql — the database is authoritative for
 * anything persisted; these exist for previews and for drawing the route.
 */

export const EARTH_RADIUS_KM = 6371.0088; // mean radius, IUGG

export interface LatLng {
  lat: number;
  lng: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in kilometres. Matches public.haversine_km(). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Angular separation in radians. */
export function angularDistance(a: LatLng, b: LatLng): number {
  return haversineKm(a, b) / EARTH_RADIUS_KM;
}

/**
 * Point at fraction `t` along the great circle from `a` to `b`.
 * Spherical linear interpolation — never a straight line in lat/lng space.
 */
export function interpolateGreatCircle(a: LatLng, b: LatLng, t: number): LatLng {
  const d = angularDistance(a, b);
  if (d < 1e-9) return { ...a };

  const clamped = Math.min(1, Math.max(0, t));
  const sinD = Math.sin(d);
  const A = Math.sin((1 - clamped) * d) / sinD;
  const B = Math.sin(clamped * d) / sinD;

  const φ1 = toRad(a.lat);
  const λ1 = toRad(a.lng);
  const φ2 = toRad(b.lat);
  const λ2 = toRad(b.lng);

  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);

  return {
    lat: toDeg(Math.atan2(z, Math.hypot(x, y))),
    lng: toDeg(Math.atan2(y, x)),
  };
}

/** Sampled great-circle path, for drawing the route arc. */
export function greatCirclePath(a: LatLng, b: LatLng, segments = 64): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= segments; i += 1) {
    points.push(interpolateGreatCircle(a, b, i / segments));
  }
  return points;
}

/** Initial bearing in degrees, used to orient the card as it flies. */
export function initialBearing(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Altitude for the camera so both endpoints stay in frame. Short hops sit
 * close to the surface; a half-world journey pulls right out.
 */
export function framingAltitude(a: LatLng, b: LatLng): number {
  const ratio = angularDistance(a, b) / Math.PI; // 0 → same place, 1 → antipodal
  return 0.55 + ratio * 2.1;
}

/** Round to the coarseness we actually store, so previews match reality. */
export function coarsen(value: number, precision: "exact" | "city" | "region") {
  if (precision === "exact") return value;
  const digits = precision === "city" ? 2 : 1;
  return Number(value.toFixed(digits));
}

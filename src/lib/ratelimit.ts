import "server-only";

/**
 * Per-instance sliding window. Enough to keep one signed-in user from hammering
 * the geocoder; abuse that matters is bounded in the database instead
 * (see the postcard ceiling in public.send_postcard).
 */

const windows = new Map<string, number[]>();

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    windows.set(key, hits);
    return false;
  }

  hits.push(now);
  windows.set(key, hits);

  // Opportunistic sweep so the map cannot grow without bound.
  if (windows.size > 5000) {
    for (const [k, times] of windows) {
      if (times.every((t) => now - t >= windowMs)) windows.delete(k);
    }
  }

  return true;
}

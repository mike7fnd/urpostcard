/**
 * The origin a browser actually used to reach us.
 *
 * `new URL(request.url).origin` is not reliably that — behind a proxy it can
 * report the internal address the request arrived on. But neither is a
 * build-time constant, which is only as good as whoever last set it.
 *
 * Order of trust:
 *   1. The forwarded headers, which the proxy sets per request and which
 *      therefore cannot be stale.
 *   2. NEXT_PUBLIC_SITE_URL, for hosts that forward nothing.
 *   3. The request URL, for local development where neither exists.
 *
 * Configuration deliberately does *not* win. NEXT_PUBLIC_SITE_URL ships as
 * http://localhost:3000 in .env.example, so it is frequently copied into a
 * deployment unchanged — and trusting it over the live request host is how a
 * signed-in visitor gets redirected off a real site and onto localhost.
 * Rule 4 below refuses that outright, whatever the variable says.
 */

function isLoopback(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
}

function fromHeaders(request: Request): string | null {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return null;

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    (isLoopback(`http://${host}`) ? "http" : "https");

  return `${proto}://${host}`;
}

export function publicOrigin(request: Request): string {
  const live = fromHeaders(request);
  if (live) return live;

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const arrived = new URL(request.url).origin;

  // 4. A loopback origin is only ever right for a request that actually came
  //    from one. Anything else is a stale variable pointing somewhere the
  //    visitor cannot follow.
  if (configured && !(isLoopback(configured) && !isLoopback(arrived))) {
    return configured;
  }

  return arrived;
}

/** An absolute URL on the origin the visitor is actually using. */
export function absoluteUrl(request: Request, path: string): string {
  return `${publicOrigin(request)}${path.startsWith("/") ? path : `/${path}`}`;
}

import "server-only";

import { SITE_URL } from "@/lib/env";

/**
 * The origin a browser actually used to reach us.
 *
 * `new URL(request.url).origin` is not that. Behind a proxy — Vercel, a load
 * balancer, a tunnel — it can report the internal address the request arrived
 * on, which is how an absolute redirect ends up pointing at localhost from a
 * live deployment.
 *
 * Order of trust:
 *   1. NEXT_PUBLIC_SITE_URL, if set. Configuration beats inference.
 *   2. The forwarded headers the proxy adds.
 *   3. The request URL, for local development where none of the above exist.
 */
export function publicOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return SITE_URL();

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (host) {
    const proto =
      request.headers.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}

/** An absolute URL on the origin the visitor is actually using. */
export function absoluteUrl(request: Request, path: string): string {
  return `${publicOrigin(request)}${path.startsWith("/") ? path : `/${path}`}`;
}

import { afterEach, describe, expect, it } from "vitest";

import { absoluteUrl, publicOrigin } from "@/lib/url";

/**
 * These exist because getting this wrong is invisible in development and
 * breaks sign-in in production: every one of these cases sent a real visitor
 * to localhost at some point.
 */

const original = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = original;
});

const req = (url: string, headers: Record<string, string> = {}) =>
  new Request(url, { headers });

describe("publicOrigin", () => {
  it("uses the forwarded host over anything configured", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    const origin = publicOrigin(
      req("http://10.0.0.7/auth/callback", {
        "x-forwarded-host": "urpostcard.vercel.app",
        "x-forwarded-proto": "https",
      }),
    );

    expect(origin).toBe("https://urpostcard.vercel.app");
  });

  it("refuses a stale localhost variable on a real request", () => {
    // The exact shape of the bug: the variable was copied from .env.example
    // and never changed, and the host forwards nothing.
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    expect(publicOrigin(req("https://urpostcard.vercel.app/auth/callback"))).toBe(
      "https://urpostcard.vercel.app",
    );
  });

  it("still honours localhost when the request really is local", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    expect(publicOrigin(req("http://localhost:3000/auth/callback"))).toBe(
      "http://localhost:3000",
    );
  });

  it("uses a correctly configured origin when nothing is forwarded", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://urpostcard.app/";

    expect(publicOrigin(req("https://internal.invalid/auth/callback"))).toBe(
      "https://urpostcard.app",
    );
  });

  it("falls back to the request when there is no configuration", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(publicOrigin(req("https://urpostcard.vercel.app/x"))).toBe(
      "https://urpostcard.vercel.app",
    );
  });

  it("assumes https for a forwarded host that does not say", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(
      publicOrigin(req("http://internal/x", { host: "urpostcard.vercel.app" })),
    ).toBe("https://urpostcard.vercel.app");
  });

  it("assumes http for a local host that does not say", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(publicOrigin(req("http://internal/x", { host: "localhost:3000" }))).toBe(
      "http://localhost:3000",
    );
  });

  it("takes the first value from a chained x-forwarded-proto", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(
      publicOrigin(
        req("http://internal/x", {
          "x-forwarded-host": "urpostcard.vercel.app",
          "x-forwarded-proto": "https,http",
        }),
      ),
    ).toBe("https://urpostcard.vercel.app");
  });
});

describe("absoluteUrl", () => {
  it("joins a path onto the live origin", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const url = absoluteUrl(
      req("http://internal/x", { "x-forwarded-host": "urpostcard.vercel.app" }),
      "/sign-in?error=oauth",
    );

    expect(url).toBe("https://urpostcard.vercel.app/sign-in?error=oauth");
  });

  it("tolerates a path given without a leading slash", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(absoluteUrl(req("https://urpostcard.app/x"), "home")).toBe(
      "https://urpostcard.app/home",
    );
  });
});

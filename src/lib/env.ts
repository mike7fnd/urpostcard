/** Fail loudly at the edge of the app rather than mysteriously inside it. */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const SUPABASE_URL = () =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const SUPABASE_ANON_KEY = () =>
  required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

/** Server only. Never import this from a client component. */
export const SUPABASE_SERVICE_ROLE_KEY = () =>
  required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

export const SITE_URL = () =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

/** Nominatim's usage policy requires an identifying User-Agent. */
export const GEOCODER_USER_AGENT = () =>
  process.env.GEOCODER_USER_AGENT ??
  `urpostcard/1.0 (${process.env.GEOCODER_CONTACT ?? "contact-not-set"})`;

export const CRON_SECRET = () => process.env.CRON_SECRET;

import { readFileSync } from "node:fs";

/**
 * Checks a Supabase project against what this app expects: the tables, the
 * seeded designs, the functions, and — most importantly — that row level
 * security actually refuses the things it is supposed to refuse.
 *
 * Run after applying supabase/migrations:  npm run db:verify
 */

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !ANON || !SECRET) {
  console.error("Missing Supabase variables in .env.local.");
  process.exit(1);
}

const results = [];
const record = (ok, label, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
};

const call = async (path, key, init = {}) => {
  const response = await fetch(`${URL_BASE}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
};

console.log(`\nChecking ${URL_BASE}\n`);

/* ---------------------------------------------------------------- schema */

const tables = ["profiles", "postcard_templates", "postcards", "notifications", "app_settings"];
for (const table of tables) {
  const { status, body } = await call(`/rest/v1/${table}?select=*&limit=1`, SECRET);
  record(status === 200, `table ${table}`, status === 200 ? "" : (body?.message ?? status));
}

/* -------------------------------------------------------------- designs */

{
  const { status, body } = await call("/rest/v1/postcard_templates?select=slug&is_active=eq.true", SECRET);
  const count = Array.isArray(body) ? body.length : 0;
  record(status === 200 && count === 6, "six postcard designs seeded", `found ${count}`);
}

/* ------------------------------------------------------------- settings */

{
  const { body } = await call("/rest/v1/app_settings?select=*", SECRET);
  const row = Array.isArray(body) ? body[0] : null;
  record(
    Boolean(row),
    "delivery settings row",
    row ? `${row.virtual_speed_kmh} km/h, floor ${row.min_travel_seconds}s, ceiling ${row.max_travel_seconds}s` : "missing",
  );
}

/* ------------------------------------------------------------ functions */

const functions = [
  "send_postcard",
  "open_postcard",
  "list_postcards",
  "get_postcard",
  "preview_journey",
  "search_profiles",
  "sync_and_summarize",
  "settle_due_postcards",
  "is_username_available",
  "mark_notifications_read",
];

// Existence is read from the OpenAPI description PostgREST publishes, not by
// calling each one. Calling with no arguments cannot tell "function missing"
// apart from "function exists and wants its arguments" — both are a 404.
{
  const { status, body } = await call("/rest/v1/", SECRET);
  const paths = status === 200 && body && typeof body === "object" ? body.paths ?? {} : {};
  const known = new Set(Object.keys(paths).map((p) => p.replace(/^\/rpc\//, "")));

  for (const fn of functions) {
    record(known.has(fn), `function ${fn}`, known.has(fn) ? "" : "not found");
  }
}

/* ------------------------------------------------------------------ RLS */

{
  const { status, body } = await call("/rest/v1/postcards?select=id&limit=1", ANON);
  const blocked = status === 401 || (Array.isArray(body) && body.length === 0);
  record(blocked, "RLS: signed-out reader sees no postcards", blocked ? "" : `status ${status}`);
}

{
  const { status } = await call("/rest/v1/postcards", ANON, {
    method: "POST",
    body: JSON.stringify({ message: "forged" }),
  });
  record(status >= 400, "RLS: client cannot INSERT a postcard", `status ${status}`);
}

{
  // PostgREST answers 204 to a PATCH that matched nothing, so the status code
  // alone cannot tell a blocked write from a successful one. Read the value,
  // try to change it as an anonymous client, and read it back.
  const before = await call("/rest/v1/app_settings?select=virtual_speed_kmh", SECRET);
  const was = Array.isArray(before.body) ? before.body[0]?.virtual_speed_kmh : null;

  const attempt = await call("/rest/v1/app_settings?id=eq.true", ANON, {
    method: "PATCH",
    body: JSON.stringify({ virtual_speed_kmh: 1 }),
  });

  const after = await call("/rest/v1/app_settings?select=virtual_speed_kmh", SECRET);
  const now = Array.isArray(after.body) ? after.body[0]?.virtual_speed_kmh : null;

  const held = was !== null && was === now;
  record(
    held,
    "RLS: client cannot change delivery settings",
    held
      ? `still ${now} km/h (write returned ${attempt.status}, changed nothing)`
      : `CHANGED from ${was} to ${now}`,
  );
}

{
  const { status, body } = await call("/rest/v1/profiles?select=latitude,longitude&limit=5", ANON);
  const blocked = status === 401 || (Array.isArray(body) && body.length === 0);
  record(blocked, "RLS: signed-out reader sees no coordinates", blocked ? "" : `status ${status}`);
}

/* --------------------------------------------------------------- sweep */

{
  const { status, body } = await call("/rest/v1/rpc/settle_due_postcards", SECRET, {
    method: "POST",
    body: "{}",
  });
  record(status === 200, "delivery sweep runs", status === 200 ? `settled ${body}` : (body?.message ?? status));
}

/* -------------------------------------------------------------- verdict */

const failed = results.filter((r) => !r.ok);
console.log(
  failed.length === 0
    ? `\nAll ${results.length} checks passed.\n`
    : `\n${failed.length} of ${results.length} checks failed.\n`,
);
process.exit(failed.length === 0 ? 0 : 1);

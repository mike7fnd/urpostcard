# urpostcard

Write a postcard, send it into the world, and watch it cross the distance to
someone. It does not arrive instantly — the further away they are, the longer
it takes.

Next.js 16 · TypeScript · Tailwind v4 · Supabase · Framer Motion · three.js

---

## Getting it running

### 1. Environment

```bash
cp .env.example .env.local
```

Fill in from **Supabase → Project Settings → API**:

| Variable | Where it lives |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** — used by the delivery sweep and nothing else |
| `CRON_SECRET` | server only, required in production |
| `GEOCODER_CONTACT` | an address, for the Nominatim User-Agent |

If the service-role key ever ends up in a `NEXT_PUBLIC_` variable, rotate it.

### 2. Database

Run the files in `supabase/migrations/` **in order**. The quickest way is one
paste:

```bash
npm run db:bundle    # writes supabase/bundle.sql — all seven, in order
```

Paste that into the SQL editor and run it. Or `supabase db push` with the CLI.
Afterwards:

```bash
npm run db:verify    # 23 checks: schema, seeded designs, every RPC, and RLS
```

| File | What it does |
| --- | --- |
| `0001_schema.sql` | tables, enums, indexes |
| `0002_functions.sql` | geography, the delivery model, profile triggers |
| `0003_postcards.sql` | send / settle / open / read — the whole postcard service |
| `0004_rls.sql` | row level security and function grants |
| `0005_seed_templates.sql` | the six postcard designs (reference data) |
| `0006_storage.sql` | the avatars bucket and its policies |
| `0007_map_style.sql` | the per-profile map style preference |

They are written to be re-runnable.

### 3. Auth settings

In **Authentication → URL Configuration**, add your site URL and both
`<site>/auth/confirm` and `<site>/auth/callback` as redirect URLs. Emailed
links land on the first; Google lands on the second.

### 4. Deploying

**Set the environment variables on the host.** `.env.local` is git-ignored, so
nothing in it reaches a deployment. On Vercel: Project → Settings →
Environment Variables, add them to Production, then **redeploy** — the
`NEXT_PUBLIC_` ones are inlined at build time, so an existing deployment will
not pick them up.

If they are missing the app does not fall over: the front page names the
absent variables and every guarded route redirects to it.

Also add the deployed origin to **Authentication → URL Configuration** in
Supabase (site URL, plus `/auth/confirm` and `/auth/callback`), or emailed
links and Google sign-in will bounce back to localhost.

### 5. Delivery sweep

`vercel.json` schedules `/api/cron/deliver` every five minutes. On Vercel, set
`CRON_SECRET` and the schedule is picked up automatically; anywhere else, call
that route on a timer with `Authorization: Bearer $CRON_SECRET`.

**Vercel Hobby only runs crons once a day.** If the schedule is rejected,
change it to something daily or drop `vercel.json` entirely — see below for
why that is survivable.

The sweep is a **backstop**, not the mechanism: every read path also settles
overdue postcards, so a missed run delays the arrival *notification*, never the
arrival.

### 6. Installing it as an app

urpostcard is a PWA: manifest, icons and a service worker. On Android Chrome it
offers to install; on iOS it is Share -> Add to Home Screen. Either way it
opens standalone, with no browser chrome, which is what lets the globe fill
the screen properly.

Icons are generated, not committed art:

```bash
npm run icons    # redraws public/icons from the palette
```

The service worker is deliberately narrow. It caches hashed build output and
an offline page, and nothing else. **Pages are never cached** — this app is
almost entirely signed-in personal content, and a page cache is how one
person’s postcards end up on screen for whoever opens the app next on a
shared phone.

### 7. Run

```bash
npm run dev        # http://localhost:3000
npm run test       # the delivery model
npm run typecheck
npm run build
```

---

## How it works

### The postcard is the object

`src/components/postcard/Postcard.tsx` renders a physical card: paper colour,
grain, card-stock thickness, per-design edge treatment (deckle, airmail stripes,
perforation, photo border) and a drawn front. Everything inside is sized in
container-query units, so the same component is a history thumbnail, the card
you write on, and the card flying over the globe.

The six designs are rows in `postcard_templates`. `design_config` is the
contract — new designs are a SQL insert, not a code change.

### Nothing the client says about a postcard is trusted

There are **no INSERT, UPDATE or DELETE policies on `postcards` at all**. The
only ways in are two `SECURITY DEFINER` functions:

- `send_postcard(recipient_username, template_id, message)` — derives the sender
  from `auth.uid()`, reads both pins server-side, computes Haversine distance
  and travel duration, and writes `sent_at` / `estimated_delivery_at`.
- `open_postcard(id)` — recipient only, stamps `opened_at`.

`settle_due_postcards()` is the single place a postcard becomes `arrived`.

### A recipient does not know a postcard is coming

Until it lands, a postcard simply does not exist as far as its recipient is
concerned — not the message, not the sender, not the fact of it. `postcard_views`
only emits a row to its recipient once the status is `arrived` or `opened`, and
`sync_and_summarize` returns no count, time or hint about inbound post either.
Counting them would give the surprise away as surely as listing them.

This is enforced in SQL, not in the interface, so an incoming postcard is never
on the wire to be found in a network tab. The `SELECT` policy on `postcards`
covers the **sender only**, and the message is withheld from the projection as
well — belt and braces.

A sender watches their own postcard the whole way. It is their journey to see.

### Locations are coarse before they are stored

`profiles_before_write` rounds every pin to the configured precision (`city`
≈ 1.1 km) on the way in. Other people are reachable only through
`search_profiles()` / `get_public_profile()`, which return a place *name* and
never a coordinate. Before sending, `preview_journey()` returns a distance —
a scalar, not a pin.

### The animation is never the state

`JourneyGlobe` runs in two registers, and the difference is the whole point:

- **live** (launch, observe) — the movement is fitted to the real delivery. An
  eight-minute journey takes eight minutes to cross, read off `sent_at` and
  `estimated_delivery_at` per frame. When the clock passes the estimate it
  calls `onSettlementDue`, the page re-reads the database, and the *server's*
  answer decides what is rendered.
- **replay** — the same route compressed into ~13 seconds, offered only for a
  journey that already finished, and labelled as a replay.

Close the browser mid-journey and reopen it a day later: the postcard is where
the database says it is, not where an animation left off.

The camera sits directly over the card, so the postcard holds the centre of
frame and the world turns underneath it, with a running dashed line ahead of it
to the recipient. Take hold of the globe and the camera lets go — wired to
OrbitControls' `start` event, which fires before it moves anything. Tap the
postcard, or the chip that appears, and the camera flies back and resumes.

### The globe

`react-globe.gl` over three.js, behind `GlobeStage`, which loads it with
`ssr: false` — WebGL, three.js, the country atlas and the first map tile are
fetched only when a globe actually mounts.

**Three basemaps, chosen by the person**, in Settings. The choice lives on the
profile (`profiles.map_style`), not in browser storage, so it follows them
between devices and the server can render the first globe in the right style
rather than flashing the default while a preference loads.

| Style | Source | |
| --- | --- | --- |
| `streets` | OpenStreetMap | the default — place names and roads |
| `dark` | CARTO dark, OSM data | the same map for a darker room |
| `satellite` | Esri World Imagery | aerial imagery, no labels |

None needs an API key. All require attribution, rendered on every globe, and
each carries its own marker palette, atmosphere tint and vignette strength —
pale cream markers that read against satellite are invisible on a light map.

The style applies everywhere, including the location picker. Worth knowing
that satellite has no labels, which makes pinning yourself harder; that is the
viewer's call to make.

Tiles are reprojected onto the sphere by three-globe's tile engine. Detail and
how close the camera may come are capped per surface, and the two have to
agree — otherwise a surface requests tiles it can never get near enough to see:

| Surface | `maxTileLevel` | `minAltitude` |
| --- | --- | --- |
| Home | 4 | 0.8 |
| Journey | 10 | 0.0015 |
| Location picker | 14 | 0.012 |

`minAltitude` is not cosmetic. It becomes `controls.minDistance`, which clamps
the camera **every frame** — so a surface that animates the camera below its
own floor silently gets a flat, frozen-looking shot instead.

Country borders are drawn as hairlines over imagery only; OSM draws its own.
Note that three-globe hides the base sphere while the tile engine is on, so if
tiles fail to load what remains is those outlines plus the atmosphere halo.

**Before production**, change the `streets` url in `WorldGlobe.tsx`. The OSMF
tile policy asks that app traffic not be pointed at `tile.openstreetmap.org`.
CARTO is a drop-in carrying the same OSM data:

```
https://a.basemaps.cartocdn.com/rastertiles/voyager/{level}/{x}/{y}.png
```

The credit in `lib/attribution.ts` then becomes
"© OpenStreetMap contributors, © CARTO". Any `{z}/{x}/{y}` raster source works.

The flying postcard is a **DOM element** tracked to the scene's screen
coordinates rather than a texture inside it, so it keeps real type and real
shadows while the globe stays a globe.

---

## Layout

```
src/
  app/
    (app)/            home, send, postcards, profile — behind the session guard
    api/places/       geocoding, proxied and rate-limited
    api/cron/deliver  the delivery sweep
    auth/             confirm, callback (Google), sign-out
  components/
    postcard/         the object, the swipe, the scenes
    globe/            WorldGlobe (heavy), GlobeStage (lazy), JourneyGlobe
    send/             the five steps of sending
    postcards/        history, detail, the arrival
    location/         the pin picker
  lib/
    delivery.ts       preview + description of the model (pure)
    geo.ts            haversine, great-circle interpolation (pure)
    supabase/         browser, server, admin clients
  proxy.ts            session refresh and route protection
supabase/migrations/  the schema, the service, the policies
```

## Tuning the journey

Speed and bounds live in `app_settings`, not in code:

```sql
update app_settings set virtual_speed_kmh = 600;   -- slower post
```

Defaults: 1200 km/h, floor 5 minutes, ceiling 48 hours, ±7 % variation seeded
from the postcard's own id so a given postcard's arrival time never changes.

## Not built

- Avatars upload and display on your own profile; they are not shown elsewhere
  in the interface yet.
- Push notifications. Arrivals surface through Supabase Realtime while the app
  is open, and through history when it is not.

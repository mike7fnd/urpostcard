import Link from "next/link";

import { Greeting } from "@/components/home/Greeting";
import { HomeGlobe } from "@/components/home/HomeGlobe";
import { requireOnboardedSession } from "@/lib/account";
import { listPostcards } from "@/lib/postcards";

export const metadata = { title: "urpostcard" };

export default async function HomePage() {
  const { profile } = await requireOnboardedSession("/home");

  // One read. list_postcards settles anything overdue on the way through, so
  // the counts below are derived from already-correct rows rather than a
  // second round trip for a summary.
  //
  // Note what cannot appear here: a postcard on its way *to* this person. The
  // projection withholds it until it lands, so the globe below shows only the
  // journeys they set in motion themselves.
  const cards = await listPostcards(undefined, 100);

  const inFlight = cards.filter((card) => card.status === "in_transit");
  const waiting = cards.filter(
    (card) => card.direction === "received" && card.status === "arrived",
  );

  const summary = {
    traveling: inFlight.length,
    unopened: waiting.length,
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-night text-night-ink">
      <div className="absolute inset-0">
        <HomeGlobe
          home={{ lat: profile.latitude!, lng: profile.longitude! }}
          inFlight={inFlight}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,11,13,0.88) 0%, rgba(10,11,13,0) 38%, rgba(10,11,13,0) 52%, rgba(10,11,13,0.92) 100%)",
        }}
        aria-hidden
      />

      <div className="safe-top safe-bottom relative flex h-full flex-col justify-between px-6 pb-28 pt-8 lg:px-12">
        <header className="drift-in">
          <Greeting name={profile.display_name || profile.username || ""} />

          <div className="mt-5 space-y-1.5">
            {summary.traveling > 0 ? (
              <Line>
                {summary.traveling} postcard{summary.traveling === 1 ? "" : "s"} of yours
                {summary.traveling === 1 ? " is" : " are"} travelling
              </Line>
            ) : null}

            {summary.unopened > 0 ? (
              <Line accent>
                {summary.unopened} postcard{summary.unopened === 1 ? "" : "s"} waiting to
                be opened
              </Line>
            ) : null}

            {summary.traveling === 0 && summary.unopened === 0 ? (
              <Line>Nothing is moving. The world is quiet.</Line>
            ) : null}
          </div>

          <p className="mt-6 text-[12.5px] text-night-ink-soft/70">
            {profile.location_name}
          </p>
        </header>

        <div className="flex flex-col items-start gap-4">
          {waiting.length > 0 ? (
            <Link
              href={`/postcards/${waiting[0]!.id}`}
              className="tap group flex items-center gap-3 rounded-full border border-night-line bg-night-soft/80 py-2 pl-2 pr-5 backdrop-blur transition-colors hover:bg-night-soft"
            >
              <span
                className="h-9 w-[54px] rounded-[3px] border border-night-line"
                style={{ background: waiting[0]!.template_design_config.paper }}
                aria-hidden
              />
              <span className="text-[14px] text-night-ink">
                A postcard from @{waiting[0]!.counterpart_username} is here
              </span>
            </Link>
          ) : null}

          <Link
            href="/send"
            className="tap inline-flex min-h-[52px] items-center justify-center rounded-full bg-night-ink px-8 text-[15px] font-medium text-night transition-colors hover:bg-white"
          >
            Send a postcard
          </Link>
        </div>
      </div>
    </main>
  );
}

function Line({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <p
      className={`text-[15px] leading-relaxed ${
        accent ? "text-accent-soft" : "text-night-ink-soft"
      }`}
    >
      {children}
    </p>
  );
}

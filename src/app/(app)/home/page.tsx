import Link from "next/link";

import { Greeting } from "@/components/home/Greeting";
import { HomeGlobe } from "@/components/home/HomeGlobe";
import { TravellingStrip } from "@/components/home/TravellingStrip";
import { requireOnboardedSession } from "@/lib/account";
import { listPostcards } from "@/lib/postcards";

export const metadata = { title: "urpostcard" };

export default async function HomePage() {
  const { profile } = await requireOnboardedSession("/home");

  // One read. list_postcards settles anything overdue on the way through, so
  // everything below is derived from already-correct rows rather than a
  // second round trip for a summary.
  //
  // Note what cannot appear here: a postcard on its way *to* this person. The
  // projection withholds it until it lands, so the globe shows only journeys
  // they set in motion themselves.
  const cards = await listPostcards(undefined, 100);

  const inFlight = cards.filter((card) => card.status === "in_transit");
  const waiting = cards.filter(
    (card) => card.direction === "received" && card.status === "arrived",
  );

  // Everything of theirs that is out in the world: still crossing first,
  // soonest to land at the front, then the ones that already arrived.
  const outbound = cards
    .filter((card) => card.direction === "sent")
    .sort((a, b) => {
      const flying =
        Number(b.status === "in_transit") - Number(a.status === "in_transit");
      if (flying !== 0) return flying;

      if (a.status === "in_transit" && b.status === "in_transit") {
        return (
          Date.parse(a.estimated_delivery_at ?? "") -
          Date.parse(b.estimated_delivery_at ?? "")
        );
      }

      return (
        Date.parse(b.sent_at ?? b.created_at) - Date.parse(a.sent_at ?? a.created_at)
      );
    });

  return (
    <main className="sky relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <HomeGlobe
          home={{ lat: profile.latitude!, lng: profile.longitude! }}
          inFlight={inFlight}
        />
      </div>

      {/* Light scrims, not dark ones — the world below is in daylight now. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(246,243,236,0.94) 0%, rgba(246,243,236,0) 32%, rgba(246,243,236,0) 40%, rgba(246,243,236,0.97) 100%)",
        }}
        aria-hidden
      />

      <div className="safe-top safe-bottom relative flex h-full flex-col justify-between px-6 pb-28 pt-8 lg:px-12">
        <header className="drift-in">
          <Greeting name={profile.display_name || profile.username || ""} />

          <div className="mt-4 space-y-1.5">
            {inFlight.length > 0 ? (
              <Line>
                {inFlight.length} postcard{inFlight.length === 1 ? "" : "s"} of yours
                {inFlight.length === 1 ? " is" : " are"} travelling
              </Line>
            ) : null}

            {waiting.length > 0 ? (
              <Line accent>
                {waiting.length} postcard{waiting.length === 1 ? "" : "s"} waiting to be
                opened
              </Line>
            ) : null}

            {inFlight.length === 0 && waiting.length === 0 ? (
              <Line>Nothing is moving. The world is quiet.</Line>
            ) : null}
          </div>

          <p className="mt-5 text-[12.5px] text-ink-faint">{profile.location_name}</p>
        </header>

        <div className="flex flex-col gap-5">
          {waiting.length > 0 ? (
            <Link
              href={`/postcards/${waiting[0]!.id}`}
              className="tap flex w-fit items-center gap-3 rounded-full border border-line/70 bg-paper/92 py-2 pl-2 pr-5 shadow-lift-sm backdrop-blur transition-colors hover:bg-paper"
            >
              <span
                className="h-9 w-[54px] rounded-[3px] border border-line"
                style={{ background: waiting[0]!.template_design_config.paper }}
                aria-hidden
              />
              <span className="text-[14px] text-ink">
                A postcard from @{waiting[0]!.counterpart_username} is here
              </span>
            </Link>
          ) : null}

          <TravellingStrip cards={outbound} />

          <Link
            href="/send"
            className="tap inline-flex min-h-[52px] w-fit items-center justify-center rounded-full bg-ink px-8 text-[15px] font-medium text-paper shadow-lift transition-colors hover:bg-ink/90"
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
        accent ? "text-accent" : "text-ink-soft"
      }`}
    >
      {children}
    </p>
  );
}

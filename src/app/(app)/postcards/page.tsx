import Link from "next/link";

import { PostcardRow } from "@/components/postcards/PostcardRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { listPostcards } from "@/lib/postcards";

export const metadata = { title: "Postcards · urpostcard" };

type Box = "received" | "sent";

export default async function PostcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ box?: string }>;
}) {
  const { box } = await searchParams;
  const active: Box = box === "sent" ? "sent" : "received";
  const cards = await listPostcards(active, 100);

  return (
    <main className="safe-top safe-bottom mx-auto w-full max-w-[640px] px-6 pb-32 pt-6 lg:max-w-[760px] lg:pt-20">
      <h1 className="sr-only">Your postcards</h1>

      <div
        className="flex gap-1 border-b border-line"
        role="tablist"
        aria-label="Postcards"
      >
        <Tab href="/postcards?box=received" active={active === "received"}>
          Received
        </Tab>
        <Tab href="/postcards?box=sent" active={active === "sent"}>
          Sent
        </Tab>
      </div>

      {cards.length === 0 ? (
        active === "sent" ? (
          <EmptyState
            art="outbound"
            title="Your postcards are waiting to travel."
            body="Nothing has left yet."
            action={
              <Link
                href="/send"
                className="tap inline-flex min-h-[46px] items-center justify-center rounded-full bg-ink px-7 text-[15px] font-medium text-paper"
              >
                Send the first one
              </Link>
            }
          />
        ) : (
          <EmptyState
            art="inbound"
            title="No postcards have reached you yet."
            body="When one arrives, it will be here."
          />
        )
      ) : (
        <ul className="divide-y divide-line/70">
          {cards.map((card) => (
            <li key={card.id}>
              <PostcardRow card={card} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={`tap -mb-px border-b px-4 py-3 text-[14px] transition-colors ${
        active
          ? "border-ink text-ink"
          : "border-transparent text-ink-faint hover:text-ink-soft"
      }`}
    >
      {children}
    </Link>
  );
}

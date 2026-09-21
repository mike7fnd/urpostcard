import Link from "next/link";
import { redirect } from "next/navigation";

import { LandingCard } from "@/components/landing/LandingCard";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/home");

  return (
    <main className="safe-top safe-bottom relative mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-between px-6 py-10 lg:max-w-[1100px] lg:px-16">
      <header className="flex items-center justify-between">
        <span className="text-[13px] uppercase tracking-[0.22em] text-ink-soft">
          urpostcard
        </span>
        <Link
          href="/sign-in"
          className="tap text-[14px] text-ink-soft transition-colors hover:text-ink"
        >
          Sign in
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-center gap-12 py-12 lg:flex-row-reverse lg:items-center lg:gap-20">
        <LandingCard />

        <div className="lg:max-w-[440px]">
          <h1 className="font-display text-[38px] leading-[1.08] tracking-tight text-ink sm:text-[46px] lg:text-[54px]">
            Write something.
            <br />
            Send it into the world.
          </h1>

          <p className="mt-6 max-w-[38ch] text-[16px] leading-relaxed text-ink-soft">
            A postcard here does not appear instantly. It leaves your hands,
            crosses the distance between you and someone else, and arrives when
            it gets there.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="tap inline-flex min-h-[46px] items-center justify-center rounded-full bg-ink px-7 text-[15px] font-medium text-paper transition-colors hover:bg-ink/90"
            >
              Create an account
            </Link>
            <Link
              href="/sign-in"
              className="tap inline-flex min-h-[46px] items-center justify-center rounded-full px-5 text-[15px] text-ink-soft transition-colors hover:text-ink"
            >
              I already have one
            </Link>
          </div>
        </div>
      </div>

      <footer className="text-[12px] text-ink-faint">
        Distances are real. Places are approximate, on purpose.
      </footer>
    </main>
  );
}

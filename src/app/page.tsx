import Link from "next/link";
import { redirect } from "next/navigation";

import { LandingCard } from "@/components/landing/LandingCard";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  // A deployment missing its Supabase variables should say so, not fail with
  // a blank 500 on the one page someone lands on first.
  if (!supabaseConfigured()) return <NotConfigured />;

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

/**
 * Shown when NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY are absent — which on a
 * fresh deployment means nobody copied .env.local into the host, since that
 * file is deliberately git-ignored.
 */
function NotConfigured() {
  const missing = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean) as string[];

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-[520px] flex-col justify-center px-6 py-10">
      <p className="text-[13px] uppercase tracking-[0.22em] text-ink-soft">
        urpostcard
      </p>

      <h1 className="mt-8 font-display text-[30px] leading-tight tracking-tight text-ink">
        Not connected yet.
      </h1>

      <p className="mt-3 max-w-[42ch] text-[15px] leading-relaxed text-ink-soft">
        This deployment has no Supabase credentials. They live in{" "}
        <code className="font-mono text-[13.5px] text-ink">.env.local</code>,
        which is git-ignored on purpose, so they have to be set on the host as
        well.
      </p>

      <ul className="mt-7 space-y-2 border-y border-line/70 py-5">
        {missing.map((name) => (
          <li key={name} className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            <code className="font-mono text-[13px] text-ink">{name}</code>
          </li>
        ))}
      </ul>

      <p className="mt-6 max-w-[42ch] text-[13.5px] leading-relaxed text-ink-faint">
        On Vercel: Project → Settings → Environment Variables. Add them to
        Production, then redeploy — variables are read at build time, so
        existing deployments will not pick them up.
      </p>
    </main>
  );
}

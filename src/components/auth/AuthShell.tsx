import Link from "next/link";

export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-6 py-10">
      <Link
        href="/"
        className="tap self-start text-[13px] uppercase tracking-[0.22em] text-ink-soft transition-colors hover:text-ink"
      >
        urpostcard
      </Link>

      <div className="flex flex-1 flex-col justify-center py-14">
        <h1 className="font-display text-[32px] leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {intro ? (
          <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-ink-soft">
            {intro}
          </p>
        ) : null}

        <div className="mt-10">{children}</div>
      </div>

      {footer ? <div className="text-[14px] text-ink-soft">{footer}</div> : null}
    </main>
  );
}

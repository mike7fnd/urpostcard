"use client";

import Link from "next/link";

/** The paper part of sending: a title, room to work, and one way forward. */
export function StepShell({
  title,
  onBack,
  backHref,
  children,
  footer,
}: {
  title: string;
  onBack?: () => void;
  backHref?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-6 pb-28 pt-5 lg:max-w-[680px] lg:pb-16 lg:pt-16">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="tap -ml-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-ink"
            aria-label="Go back"
          >
            <Chevron />
          </button>
        ) : backHref ? (
          <Link
            href={backHref}
            className="tap -ml-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-ink"
            aria-label="Leave"
          >
            <Chevron />
          </Link>
        ) : (
          <span className="h-11 w-11" />
        )}

        <span className="text-[12px] uppercase tracking-[0.18em] text-ink-faint">
          {title}
        </span>

        <span className="h-11 w-11" />
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">{children}</div>

      {footer ? <div className="pt-4">{footer}</div> : null}
    </div>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden focusable="false">
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

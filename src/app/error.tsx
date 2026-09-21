"use client";

import { useEffect } from "react";

/**
 * Anything that throws while rendering a page lands here rather than as a
 * bare 500. In production React withholds the message from the client, so the
 * digest is surfaced — that string is what matches the entry in the server
 * logs, and without it a deployment failure is unsearchable.
 */
export default function ErrorScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("urpostcard:", error);
  }, [error]);

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-[460px] flex-col justify-center px-6 py-10">
      <p className="text-[13px] uppercase tracking-[0.22em] text-ink-soft">
        urpostcard
      </p>

      <h1 className="mt-8 font-display text-[30px] leading-tight tracking-tight text-ink">
        That did not go through.
      </h1>

      <p className="mt-3 max-w-[36ch] text-[15px] leading-relaxed text-ink-soft">
        Something failed on our side. Nothing you wrote has been lost.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="tap inline-flex min-h-[46px] items-center justify-center rounded-full bg-ink px-7 text-[15px] font-medium text-paper"
        >
          Try again
        </button>
        <a
          href="/"
          className="tap inline-flex min-h-[46px] items-center justify-center rounded-full px-5 text-[15px] text-ink-soft transition-colors hover:text-ink"
        >
          Back to the start
        </a>
      </div>

      {error.digest ? (
        <p className="mt-10 font-mono text-[11.5px] text-ink-faint">
          {error.digest}
        </p>
      ) : null}
    </main>
  );
}

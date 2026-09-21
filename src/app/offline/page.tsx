export const metadata = { title: "Offline · urpostcard" };

/**
 * Shown by the service worker when a page is asked for and there is no
 * network. Must be completely self-contained: no session, no Supabase, no
 * fetches — by definition none of them can be reached from here.
 */
export default function OfflinePage() {
  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-[460px] flex-col justify-center px-6 py-10">
      <p className="text-[13px] uppercase tracking-[0.22em] text-ink-soft">
        urpostcard
      </p>

      <div className="mt-10 w-[150px]">
        <svg viewBox="0 0 190 130" fill="none" aria-hidden focusable="false">
          <ellipse cx="95" cy="116" rx="60" ry="7" fill="#16150f" opacity="0.06" />
          <g transform="rotate(-7 95 62)">
            <rect x="30" y="28" width="130" height="70" rx="4" fill="#efeade" />
            <rect x="30" y="28" width="130" height="70" rx="4" stroke="#ddd6c7" />
            <line x1="95" y1="36" x2="95" y2="90" stroke="#ddd6c7" />
          </g>
          <path
            d="M14 104 C 44 96, 66 112, 96 100"
            stroke="#c9c0ac"
            strokeWidth="1.4"
            strokeDasharray="3 5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h1 className="mt-8 font-display text-[30px] leading-tight tracking-tight text-ink">
        No connection.
      </h1>

      <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-ink-soft">
        Your postcards are still travelling — the world just cannot be reached
        from here. Everything carries on without you watching.
      </p>

      <div className="mt-9">
        <a
          href="/"
          className="tap inline-flex min-h-[46px] items-center justify-center rounded-full bg-ink px-7 text-[15px] font-medium text-paper"
        >
          Try again
        </a>
      </div>
    </main>
  );
}

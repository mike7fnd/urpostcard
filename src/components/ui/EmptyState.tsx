"use client";

/**
 * Empty states are paper, like everything else here — a blank card waiting on
 * a desk, or an empty slot. No mascots, no dashed upload boxes.
 */
export function EmptyState({
  art,
  title,
  body,
  action,
}: {
  art: "outbound" | "inbound";
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="w-[190px]">{art === "outbound" ? <WaitingCard /> : <EmptySlot />}</div>

      <h2 className="mt-8 font-display text-[22px] leading-snug text-ink">{title}</h2>
      {body ? <p className="mt-2 max-w-[34ch] text-[14px] text-ink-soft">{body}</p> : null}
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}

function WaitingCard() {
  return (
    <svg viewBox="0 0 190 130" fill="none" aria-hidden focusable="false">
      <ellipse cx="95" cy="116" rx="66" ry="7" fill="#16150f" opacity="0.06" />
      <g transform="rotate(-6 95 62)">
        <rect x="26" y="26" width="138" height="74" rx="4" fill="#efeade" />
        <rect x="26" y="26" width="138" height="74" rx="4" stroke="#ddd6c7" />
        <line x1="95" y1="34" x2="95" y2="92" stroke="#ddd6c7" strokeWidth="1" />
        <g stroke="#ddd6c7" strokeWidth="1">
          <line x1="38" y1="46" x2="84" y2="46" />
          <line x1="38" y1="58" x2="84" y2="58" />
          <line x1="38" y1="70" x2="72" y2="70" />
          <line x1="106" y1="78" x2="152" y2="78" />
          <line x1="106" y1="88" x2="152" y2="88" />
        </g>
        <rect x="130" y="34" width="22" height="26" rx="2" fill="#e5dcc7" />
      </g>
      <path
        d="M12 104 C 46 96, 70 112, 104 100 S 158 82, 180 92"
        stroke="#c9c0ac"
        strokeWidth="1.4"
        strokeDasharray="3 5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmptySlot() {
  return (
    <svg viewBox="0 0 190 130" fill="none" aria-hidden focusable="false">
      <ellipse cx="95" cy="116" rx="60" ry="7" fill="#16150f" opacity="0.06" />
      <rect x="34" y="40" width="122" height="70" rx="5" fill="#efeade" stroke="#ddd6c7" />
      <rect x="34" y="40" width="122" height="20" rx="5" fill="#e6dfd0" />
      <rect x="66" y="47" width="58" height="6" rx="3" fill="#cfc6b2" />
      <path
        d="M95 32 L95 16 M86 24 L95 15 L104 24"
        stroke="#c9c0ac"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Four places, and no more. On a phone it sits under the thumb; on a wide
 * screen it floats at the top so the world keeps the rest of the viewport.
 */

const ITEMS = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/send", label: "Send", icon: SendIcon },
  { href: "/postcards", label: "Postcards", icon: StackIcon },
  { href: "/profile", label: "You", icon: PersonIcon },
] as const;

export function Nav({ unopened = 0 }: { unopened?: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-3 lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-5 lg:-translate-x-1/2 lg:pb-0"
    >
      <ul className="pointer-events-auto mx-auto flex max-w-[420px] items-stretch justify-between rounded-full border border-line/70 bg-paper/85 px-2 py-1.5 shadow-lift-sm backdrop-blur-md lg:max-w-none lg:gap-1 lg:px-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/home" && pathname.startsWith(href));

          return (
            <li key={href} className="flex-1 lg:flex-none">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`tap flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-full px-3 transition-colors lg:flex-row lg:gap-2 lg:px-4 ${
                  active ? "text-ink" : "text-ink-faint hover:text-ink-soft"
                }`}
              >
                <span className="relative">
                  <Icon active={active} />
                  {href === "/postcards" && unopened > 0 ? (
                    <span
                      className="absolute -right-1.5 -top-0.5 h-[7px] w-[7px] rounded-full bg-accent"
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span className="text-[10.5px] tracking-wide lg:text-[13px]">
                  {label}
                  {href === "/postcards" && unopened > 0 ? (
                    <span className="sr-only"> — {unopened} waiting</span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = { active?: boolean };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function HomeIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 22 22" className="h-[19px] w-[19px]" aria-hidden focusable="false">
      <circle cx="11" cy="11" r="8" {...stroke} />
      <path d="M3.4 8.6h15.2M3.4 13.4h15.2" {...stroke} />
      <path d="M11 3c-2.4 2.3-2.4 13.7 0 16 2.4-2.3 2.4-13.7 0-16Z" {...stroke} />
      {active ? <circle cx="11" cy="11" r="8" fill="currentColor" opacity="0.07" /> : null}
    </svg>
  );
}

function SendIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 22 22" className="h-[19px] w-[19px]" aria-hidden focusable="false">
      <rect x="2.5" y="5.5" width="17" height="11" rx="1.6" {...stroke} />
      <path d="M11 5.5v11" {...stroke} />
      <path d="M13.4 9h3.6M13.4 12h3.6" {...stroke} />
      {active ? <rect x="2.5" y="5.5" width="17" height="11" rx="1.6" fill="currentColor" opacity="0.07" /> : null}
    </svg>
  );
}

function StackIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 22 22" className="h-[19px] w-[19px]" aria-hidden focusable="false">
      <rect x="3" y="7.5" width="16" height="10.5" rx="1.6" {...stroke} />
      <path d="M5.4 5h11.2M7 2.6h8" {...stroke} opacity="0.6" />
      {active ? <rect x="3" y="7.5" width="16" height="10.5" rx="1.6" fill="currentColor" opacity="0.07" /> : null}
    </svg>
  );
}

function PersonIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 22 22" className="h-[19px] w-[19px]" aria-hidden focusable="false">
      <circle cx="11" cy="8" r="3.4" {...stroke} />
      <path d="M4.4 18.4c1.3-3.3 3.8-5 6.6-5s5.3 1.7 6.6 5" {...stroke} />
      {active ? <circle cx="11" cy="8" r="3.4" fill="currentColor" opacity="0.1" /> : null}
    </svg>
  );
}

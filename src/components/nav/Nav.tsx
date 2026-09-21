"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Four places, and no more.
 *
 * On a phone it collapses to a single button under the thumb, because the
 * globe is the screen and a permanent bar across the bottom of it is four
 * things competing with the one thing. Tapping it opens the four.
 *
 * On a wide screen there is room, so the four simply sit there.
 */

const ITEMS = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/send", label: "Send a postcard", icon: SendIcon },
  { href: "/postcards", label: "Postcards", icon: StackIcon },
  { href: "/profile", label: "You", icon: PersonIcon },
] as const;

export function Nav({ unopened = 0 }: { unopened?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDivElement | null>(null);

  // The route changing means they went somewhere; the menu has done its job.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    // Move into the menu so a keyboard or screen reader lands where the eye does.
    sheet.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/home" && pathname.startsWith(href));

  return (
    <>
      {/* ------------------------------------------------ wide screens */}
      <nav
        aria-label="Primary"
        className="pointer-events-none fixed inset-x-0 top-5 z-40 hidden justify-center px-4 lg:flex"
      >
        <ul className="pointer-events-auto flex items-stretch gap-1 rounded-full border border-line/70 bg-paper/88 px-2 py-1.5 shadow-lift-sm backdrop-blur-md">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`tap flex min-h-[44px] items-center gap-2 rounded-full px-4 transition-colors ${
                    active ? "text-ink" : "text-ink-faint hover:text-ink-soft"
                  }`}
                >
                  <span className="relative">
                    <Icon />
                    {href === "/postcards" && unopened > 0 ? (
                      <span
                        className="absolute -right-1.5 -top-0.5 h-[7px] w-[7px] rounded-full bg-accent"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  <span className="text-[13px]">
                    {href === "/send" ? "Send" : label}
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

      {/* ----------------------------------------------------- phones */}
      <div className="lg:hidden">
        <AnimatePresence>
          {open ? (
            <motion.button
              key="scrim"
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 cursor-default bg-ink/20 backdrop-blur-[2px]"
            />
          ) : null}
        </AnimatePresence>

        <nav
          aria-label="Primary"
          className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-end gap-3 px-5 pb-4"
        >
          <AnimatePresence>
            {open ? (
              <motion.div
                key="menu"
                ref={sheet}
                id="primary-menu"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: "bottom right" }}
                className="pointer-events-auto w-[236px] overflow-hidden rounded-3xl border border-line/70 bg-paper/97 shadow-lift-lg backdrop-blur-md"
              >
                <ul className="p-1.5">
                  {ITEMS.map(({ href, label, icon: Icon }) => {
                    const active = isActive(href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-[52px] items-center gap-3 rounded-2xl px-3.5 transition-colors ${
                            active
                              ? "bg-paper-deep text-ink"
                              : "text-ink-soft hover:bg-paper-deep/60"
                          }`}
                        >
                          <span className="relative shrink-0">
                            <Icon />
                            {href === "/postcards" && unopened > 0 ? (
                              <span
                                className="absolute -right-1.5 -top-0.5 h-[7px] w-[7px] rounded-full bg-accent"
                                aria-hidden
                              />
                            ) : null}
                          </span>
                          <span className="text-[15px]">
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
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="primary-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            whileTap={{ scale: 0.94 }}
            className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-lift-lg"
          >
            <motion.span
              animate={{ rotate: open ? 45 : 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden focusable="false">
                <path
                  d="M12 5v14M5 12h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </motion.span>

            {unopened > 0 && !open ? (
              <span
                className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-paper"
                aria-hidden
              />
            ) : null}
          </motion.button>
        </nav>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- icons */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function HomeIcon() {
  return (
    <svg viewBox="0 0 22 22" className="h-[19px] w-[19px]" aria-hidden focusable="false">
      <circle cx="11" cy="11" r="8" {...stroke} />
      <path d="M3.4 8.6h15.2M3.4 13.4h15.2" {...stroke} />
      <path d="M11 3c-2.4 2.3-2.4 13.7 0 16 2.4-2.3 2.4-13.7 0-16Z" {...stroke} />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 22 22" className="h-[19px] w-[19px]" aria-hidden focusable="false">
      <rect x="2.5" y="5.5" width="17" height="11" rx="1.6" {...stroke} />
      <path d="M11 5.5v11" {...stroke} />
      <path d="M13.4 9h3.6M13.4 12h3.6" {...stroke} />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg viewBox="0 0 22 22" className="h-[19px] w-[19px]" aria-hidden focusable="false">
      <rect x="3" y="7.5" width="16" height="10.5" rx="1.6" {...stroke} />
      <path d="M5.4 5h11.2M7 2.6h8" {...stroke} opacity="0.6" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 22 22" className="h-[19px] w-[19px]" aria-hidden focusable="false">
      <circle cx="11" cy="8" r="3.4" {...stroke} />
      <path d="M4.4 18.4c1.3-3.3 3.8-5 6.6-5s5.3 1.7 6.6 5" {...stroke} />
    </svg>
  );
}

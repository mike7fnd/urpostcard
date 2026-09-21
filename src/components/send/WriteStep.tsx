"use client";

import { useEffect, useRef } from "react";

import { Postcard } from "@/components/postcard/Postcard";
import { StepShell } from "@/components/send/StepShell";
import { Button } from "@/components/ui/Button";
import type { DesignConfig } from "@/lib/types";

const LIMIT = 500;

/**
 * Writing happens on the card. The textarea sits exactly where the printed
 * message would be, in the same face, at the same size — there is no separate
 * form and no toolbar.
 */
export function WriteStep({
  design,
  to,
  from,
  message,
  onChange,
  onBack,
  onNext,
}: {
  design: DesignConfig;
  to: string;
  from: string;
  message: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const field = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // Land in the message, not at the top of the page.
    const id = window.setTimeout(() => field.current?.focus(), 420);
    return () => window.clearTimeout(id);
  }, []);

  const remaining = LIMIT - message.length;

  return (
    <StepShell title="Step three" onBack={onBack}>
      <div className="shadow-lift rounded-[var(--radius-card)]">
        <Postcard
          design={design}
          face="back"
          to={to}
          from={from}
          messageSlot={
            <>
              <label htmlFor="postcard-message" className="sr-only">
                Your message, up to {LIMIT} characters
              </label>
              <textarea
                ref={field}
                id="postcard-message"
                value={message}
                maxLength={LIMIT}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Write something."
                spellCheck
                className="h-full w-full resize-none bg-transparent outline-none"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "4.1cqw",
                  lineHeight: 1.52,
                  color: `color-mix(in srgb, ${design.ink} 92%, transparent)`,
                  caretColor: design.accent,
                }}
              />
            </>
          }
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p
          className={`text-[13px] tabular-nums ${
            remaining < 40 ? "text-accent" : "text-ink-faint"
          }`}
          aria-live="polite"
        >
          {remaining} left
        </p>

        <Button onClick={onNext} disabled={message.trim().length === 0}>
          Done writing
        </Button>
      </div>
    </StepShell>
  );
}

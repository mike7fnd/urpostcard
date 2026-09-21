"use client";

import { forwardRef, useId } from "react";

/**
 * A ruled line to write on, not a boxed input. Errors are announced, not
 * decorated — no red boxes, no icons.
 */
export interface FieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: string;
  error?: string | null;
  prefix?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, prefix, className = "", ...rest },
  ref,
) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`w-full ${className}`}>
      <label
        htmlFor={id}
        className="block text-[12px] uppercase tracking-[0.16em] text-ink-faint"
      >
        {label}
      </label>

      <div className="mt-2 flex items-baseline gap-1 border-b border-line focus-within:border-ink">
        {prefix ? (
          <span className="text-[17px] text-ink-faint" aria-hidden>
            {prefix}
          </span>
        ) : null}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className="min-h-[44px] w-full bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-faint/70"
          {...rest}
        />
      </div>

      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-2 text-[13px] text-ink-faint">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[13px] text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
});

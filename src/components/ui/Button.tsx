"use client";

import { forwardRef } from "react";

type Variant = "primary" | "quiet" | "ghost";

const BASE =
  "relative inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full px-6 " +
  "text-[15px] font-medium transition-[transform,opacity,background-color,color] duration-200 " +
  "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/90",
  quiet: "bg-paper-deep text-ink hover:bg-paper-edge",
  ghost: "px-3 text-ink-soft hover:text-ink",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", loading = false, className = "", children, disabled, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`${BASE} ${VARIANTS[variant]} ${className}`}
        {...rest}
      >
        <span className={loading ? "opacity-0" : undefined}>{children}</span>
        {loading ? (
          <span
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <Dots />
          </span>
        ) : null}
      </button>
    );
  },
);

function Dots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current"
          style={{
            animation: "pulse-soft .9s ease-in-out infinite alternate",
            animationDelay: `${i * 0.12}s`,
            opacity: 0.55,
          }}
        />
      ))}
    </span>
  );
}

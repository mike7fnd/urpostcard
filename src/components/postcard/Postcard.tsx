"use client";

import { useId } from "react";

import { PostcardScene } from "@/components/postcard/PostcardScene";
import type { DesignConfig } from "@/lib/types";

/**
 * A postcard. Not a UI card — an object with a surface, an edge and a weight.
 *
 * Everything inside is sized in container-query units, so one component covers
 * a thumbnail in history and a full-bleed card being written on, at identical
 * proportions.
 */

export interface PostcardProps {
  design: DesignConfig;
  face?: "front" | "back";
  to?: string | null;
  from?: string | null;
  message?: string | null;
  /** Shown on the picture side, e.g. "Bongabong". */
  caption?: string | null;
  postmark?: { place?: string | null; date?: string | null } | null;
  /** Message withheld by the server because the postcard is still travelling. */
  sealed?: boolean;
  /**
   * Replaces the printed message with something editable, so the writing
   * happens on the card itself rather than in a form beside it.
   */
  messageSlot?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const FONT_STACK = {
  sans: "var(--font-sans)",
  serif: "var(--font-display)",
  mono: "var(--font-mono)",
} as const;

export function Postcard({
  design,
  face = "front",
  to,
  from,
  message,
  caption,
  postmark,
  sealed = false,
  messageSlot,
  className = "",
  style,
}: PostcardProps) {
  const uid = useId().replace(/:/g, "");
  const ink = design.ink;

  return (
    <div
      className={`relative isolate aspect-[3/2] w-full select-none ${className}`}
      style={{ containerType: "inline-size", ...style }}
    >
      <DeckleFilter id={`deckle-${uid}`} />

      <div
        className="preserve-3d relative h-full w-full transition-transform duration-700"
        style={{
          transform: face === "back" ? "rotateY(180deg)" : "rotateY(0deg)",
          transitionTimingFunction: "var(--ease-paper)",
        }}
      >
        <Face hidden={face === "back"} rotated={false} design={design} uid={uid}>
          <FrontContent design={design} caption={caption} />
        </Face>

        <Face hidden={face === "front"} rotated design={design} uid={uid}>
          <BackContent
            design={design}
            ink={ink}
            to={to}
            from={from}
            message={message}
            sealed={sealed}
            messageSlot={messageSlot}
            postmark={postmark}
          />
        </Face>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ faces */

function Face({
  children,
  design,
  uid,
  rotated,
  hidden,
}: {
  children: React.ReactNode;
  design: DesignConfig;
  uid: string;
  rotated: boolean;
  hidden: boolean;
}) {
  const edge = design.edge;

  const surface: React.CSSProperties = {
    background: design.paper,
    borderRadius: edge === "scallop" ? 2 : "var(--radius-card)",
  };

  if (edge === "hairline" || edge === "photo-border") {
    surface.boxShadow = `inset 0 0 0 1px color-mix(in srgb, ${design.ink} 9%, transparent)`;
  }
  if (edge === "deckle") {
    surface.filter = `url(#deckle-${uid})`;
  }
  if (edge === "scallop") {
    // Repeating notches punched out of all four edges.
    const mask =
      "radial-gradient(circle 4.5px, #0000 97%, #000) -4.5px -4.5px / 18px 18px, conic-gradient(#000 0 0) padding-box";
    surface.mask = mask;
    surface.WebkitMask = mask;
    surface.maskComposite = "intersect";
    surface.WebkitMaskComposite = "source-in";
  }

  return (
    <div
      className="backface-hidden absolute inset-0"
      style={{ transform: rotated ? "rotateY(180deg)" : undefined }}
      // Which face you see is decided by backface-visibility during the
      // rotation; hiding it any harder than this leaves the card blank
      // halfway through the flip. Keyboard and screen readers get inert.
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
    >
      {/* thickness: a sliver of card stock showing beneath the printed face */}
      <div
        className="absolute inset-x-[1.5%] -bottom-[0.9%] top-[1%] rounded-[var(--radius-card)]"
        style={{
          background: `color-mix(in srgb, ${design.ink} 16%, ${design.paper})`,
        }}
      />

      <div className="paper-grain relative h-full w-full overflow-hidden"
        style={{ ...surface, ["--grain-opacity" as string]: design.grain }}
      >
        {design.edge === "airmail" ? (
          <AirmailFrame accent={design.accent} paper={design.paper}>
            {children}
          </AirmailFrame>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function AirmailFrame({
  accent,
  paper,
  children,
}: {
  accent: string;
  paper: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-full w-full">
      <div
        className="absolute inset-0"
        style={{
          padding: "2.6cqw",
          background: `repeating-linear-gradient(45deg, ${accent} 0 2.2cqw, transparent 2.2cqw 4.4cqw, #24486f 4.4cqw 6.6cqw, transparent 6.6cqw 8.8cqw)`,
        }}
      >
        <div
          className="relative h-full w-full overflow-hidden"
          style={{ background: paper }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ front */

function FrontContent({
  design,
  caption,
}: {
  design: DesignConfig;
  caption?: string | null;
}) {
  const photoFramed = design.edge === "photo-border";

  return (
    <div className="relative h-full w-full" style={{ background: design.paper }}>
      <div
        className="absolute overflow-hidden"
        style={
          photoFramed
            ? { inset: "4cqw 4cqw 12cqw 4cqw", background: design.paper }
            : { inset: 0 }
        }
      >
        <PostcardScene
          type={design.scene.type}
          palette={design.scene.palette}
          className="h-full w-full"
        />
      </div>

      {caption ? (
        <p
          className="absolute uppercase"
          style={
            photoFramed
              ? {
                  left: "4.6cqw",
                  bottom: "4cqw",
                  fontFamily: FONT_STACK[design.typography.family],
                  fontSize: "2.9cqw",
                  letterSpacing: "0.14em",
                  color: `color-mix(in srgb, ${design.ink} 62%, transparent)`,
                }
              : {
                  left: "5cqw",
                  bottom: "4.4cqw",
                  fontFamily: FONT_STACK[design.typography.family],
                  fontSize: "2.9cqw",
                  letterSpacing: "0.14em",
                  color: "#ffffff",
                  textShadow: "0 1px 6px rgb(0 0 0 / 0.45)",
                }
          }
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------- back */

function BackContent({
  design,
  ink,
  to,
  from,
  message,
  sealed,
  messageSlot,
  postmark,
}: {
  design: DesignConfig;
  ink: string;
  to?: string | null;
  from?: string | null;
  message?: string | null;
  sealed: boolean;
  messageSlot?: React.ReactNode;
  postmark?: { place?: string | null; date?: string | null } | null;
}) {
  const font = FONT_STACK[design.typography.family];

  return (
    <div
      className="relative grid h-full w-full grid-cols-[1.05fr_1fr]"
      style={{ background: design.paper, color: ink, padding: "5cqw" }}
    >
      {/* left: the message */}
      <div className="flex min-w-0 flex-col pr-[4cqw]">
        {to ? (
          <p
            style={{
              fontFamily: font,
              fontSize: "3.1cqw",
              letterSpacing: design.typography.tracking,
              color: `color-mix(in srgb, ${ink} 55%, transparent)`,
            }}
          >
            To @{to}
          </p>
        ) : null}

        <div className="mt-[3cqw] min-h-0 flex-1 overflow-hidden">
          {messageSlot ? (
            messageSlot
          ) : sealed ? (
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "3.6cqw",
                lineHeight: 1.5,
                color: `color-mix(in srgb, ${ink} 34%, transparent)`,
              }}
            >
              Still travelling.
            </p>
          ) : (
            <p
              className="whitespace-pre-wrap break-words"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "4.1cqw",
                lineHeight: 1.52,
                color: `color-mix(in srgb, ${ink} 92%, transparent)`,
              }}
            >
              {message}
            </p>
          )}
        </div>

        {from ? (
          <p
            className="mt-[3cqw]"
            style={{
              fontFamily: font,
              fontSize: "3.1cqw",
              letterSpacing: design.typography.tracking,
              color: `color-mix(in srgb, ${ink} 55%, transparent)`,
            }}
          >
            From @{from}
          </p>
        ) : null}
      </div>

      {/* divider */}
      <div
        className="absolute top-[5cqw] bottom-[5cqw] left-[51%] w-px"
        style={{ background: design.rule }}
      />

      {/* right: stamp, postmark, address lines */}
      <div className="relative flex min-w-0 flex-col pl-[5cqw]">
        <div className="flex items-start justify-between">
          <Postmark accent={design.accent} mark={postmark} />
          <Stamp design={design} />
        </div>

        <div className="mt-auto space-y-[3.4cqw] pb-[1cqw]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-px w-full" style={{ background: design.rule }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stamp({ design }: { design: DesignConfig }) {
  const { stamp } = design;
  return (
    <div
      className="relative"
      style={{
        width: "17cqw",
        height: "21cqw",
        background: stamp.bg,
        // perforated stamp edge
        mask: "radial-gradient(circle 1.1cqw, #0000 97%, #000) -1.1cqw -1.1cqw / 3.1cqw 3.1cqw, conic-gradient(#000 0 0) padding-box",
        WebkitMask:
          "radial-gradient(circle 1.1cqw, #0000 97%, #000) -1.1cqw -1.1cqw / 3.1cqw 3.1cqw, conic-gradient(#000 0 0) padding-box",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      <div
        className="absolute inset-[1.6cqw] flex flex-col items-center justify-center gap-[1cqw]"
        style={{ boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${stamp.ink} 25%, transparent)` }}
      >
        <svg viewBox="0 0 40 26" className="w-[9cqw]" aria-hidden focusable="false">
          <path d="M0 26 L13 8 L22 19 L28 12 L40 26 Z" fill={stamp.ink} opacity="0.7" />
          <circle cx="31" cy="7" r="4" fill={stamp.ink} opacity="0.45" />
        </svg>
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "1.9cqw",
            letterSpacing: "0.1em",
            color: stamp.ink,
          }}
        >
          {stamp.label}
        </span>
      </div>
    </div>
  );
}

function Postmark({
  accent,
  mark,
}: {
  accent: string;
  mark?: { place?: string | null; date?: string | null } | null;
}) {
  if (!mark?.place && !mark?.date) return null;

  const color = `color-mix(in srgb, ${accent} 58%, transparent)`;

  return (
    <div
      className="relative"
      style={{ width: "22cqw", height: "22cqw", transform: "rotate(-9deg)" }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" focusable="false">
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeDasharray="4 3"
        />
        <circle cx="50" cy="50" r="34" fill="none" stroke={color} strokeWidth="1.2" />
        <text
          x="50"
          y="44"
          textAnchor="middle"
          fontSize="11"
          fill={color}
          style={{ fontFamily: "var(--font-sans)", letterSpacing: "0.06em" }}
        >
          {(mark.place ?? "").slice(0, 12).toUpperCase()}
        </text>
        <line x1="22" y1="52" x2="78" y2="52" stroke={color} strokeWidth="1.2" />
        <text
          x="50"
          y="66"
          textAnchor="middle"
          fontSize="10"
          fill={color}
          style={{ fontFamily: "var(--font-sans)", letterSpacing: "0.08em" }}
        >
          {mark.date ?? ""}
        </text>
      </svg>
    </div>
  );
}

/* --------------------------------------------------------------- deckle fx */

function DeckleFilter({ id }: { id: string }) {
  return (
    <svg className="pointer-events-none absolute h-0 w-0" aria-hidden focusable="false">
      <filter id={id}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.018 0.04"
          numOctaves="3"
          seed="7"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="5"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

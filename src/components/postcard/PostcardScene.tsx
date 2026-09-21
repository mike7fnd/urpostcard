"use client";

import { useId } from "react";

import type { SceneType } from "@/lib/types";

/**
 * The picture side of a postcard, drawn rather than photographed.
 *
 * Six abstract landscapes built from the template's own palette. Vector, so a
 * postcard weighs nothing, stays sharp on any screen, and needs no storage
 * bucket or image pipeline behind it.
 */
export function PostcardScene({
  type,
  palette,
  className,
}: {
  type: SceneType;
  palette: string[];
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const c = (index: number, fallback = "#cccccc") => palette[index] ?? fallback;

  const common = {
    viewBox: "0 0 300 200",
    preserveAspectRatio: "xMidYMid slice",
    className,
    "aria-hidden": true,
    focusable: false,
  } as const;

  switch (type) {
    case "horizon":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c(0)} />
              <stop offset="100%" stopColor={c(1)} />
            </linearGradient>
          </defs>
          <rect width="300" height="200" fill={`url(#${uid}-sky)`} />
          <circle cx="205" cy="74" r="26" fill={c(0)} opacity="0.75" />
          <rect y="132" width="300" height="68" fill={c(2)} opacity="0.9" />
          <rect y="131" width="300" height="1" fill={c(2)} />
        </svg>
      );

    case "dunes":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c(0)} />
              <stop offset="100%" stopColor={c(1)} />
            </linearGradient>
          </defs>
          <rect width="300" height="200" fill={`url(#${uid}-sky)`} />
          <circle cx="86" cy="58" r="19" fill={c(0)} opacity="0.85" />
          <path d="M0 128 C 62 96, 118 138, 178 118 S 262 92, 300 112 L300 200 L0 200 Z" fill={c(1)} />
          <path d="M0 152 C 70 126, 132 164, 196 146 S 268 128, 300 142 L300 200 L0 200 Z" fill={c(2)} />
          <path d="M0 178 C 84 158, 150 186, 214 172 S 276 162, 300 170 L300 200 L0 200 Z" fill={c(3, c(2))} />
        </svg>
      );

    case "clouds":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c(2)} />
              <stop offset="55%" stopColor={c(1)} />
              <stop offset="100%" stopColor={c(0)} />
            </linearGradient>
            <filter id={`${uid}-soft`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
          <rect width="300" height="200" fill={`url(#${uid}-sky)`} />
          <g filter={`url(#${uid}-soft)`} fill={c(3, "#ffffff")} opacity="0.85">
            <ellipse cx="74" cy="132" rx="62" ry="22" />
            <ellipse cx="128" cy="120" rx="44" ry="18" />
            <ellipse cx="232" cy="150" rx="70" ry="24" />
            <ellipse cx="196" cy="86" rx="34" ry="13" opacity="0.6" />
          </g>
        </svg>
      );

    case "gradient-sky":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${uid}-sky`} x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0%" stopColor={c(0)} />
              <stop offset="38%" stopColor={c(1)} />
              <stop offset="74%" stopColor={c(2)} />
              <stop offset="100%" stopColor={c(3, c(2))} />
            </linearGradient>
            <filter id={`${uid}-soft`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="16" />
            </filter>
          </defs>
          <rect width="300" height="200" fill={`url(#${uid}-sky)`} />
          <circle
            cx="112"
            cy="104"
            r="52"
            fill={c(3, "#ffffff")}
            opacity="0.5"
            filter={`url(#${uid}-soft)`}
          />
          <circle cx="214" cy="66" r="15" fill={c(0)} opacity="0.7" />
        </svg>
      );

    case "coast":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c(3, c(0))} />
              <stop offset="100%" stopColor={c(0)} />
            </linearGradient>
          </defs>
          <rect width="300" height="200" fill={`url(#${uid}-sky)`} />
          <rect y="118" width="300" height="82" fill={c(1)} />
          <path d="M0 118 L92 118 L128 96 L168 118 L300 118 L300 128 L0 128 Z" fill={c(2)} />
          <g fill={c(3, "#ffffff")} opacity="0.4">
            <rect x="18" y="146" width="66" height="1.5" rx="0.75" />
            <rect x="122" y="160" width="92" height="1.5" rx="0.75" />
            <rect x="52" y="176" width="54" height="1.5" rx="0.75" />
            <rect x="196" y="186" width="74" height="1.5" rx="0.75" />
          </g>
        </svg>
      );

    case "mountains":
    default:
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c(0)} />
              <stop offset="100%" stopColor={c(1)} />
            </linearGradient>
          </defs>
          <rect width="300" height="200" fill={`url(#${uid}-sky)`} />
          <circle cx="232" cy="52" r="17" fill={c(0)} opacity="0.9" />
          <path d="M0 200 L72 92 L128 154 L166 118 L230 200 Z" fill={c(2)} />
          <path d="M108 200 L184 84 L268 200 Z" fill={c(3, c(2))} />
          <path d="M168 110 L184 84 L200 110 L186 104 L176 112 Z" fill={c(0)} opacity="0.85" />
        </svg>
      );
  }
}

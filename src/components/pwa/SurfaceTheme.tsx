"use client";

import { useEffect } from "react";

/**
 * Makes the phone's status bar belong to the screen underneath it.
 *
 * Two things have to agree, one per platform:
 *
 *   Android — Chrome paints the status bar with `<meta name="theme-color">`.
 *   iOS     — in standalone the strip above the content takes the colour of
 *             the document body, so the body has to change with the screen,
 *             not just the element filling it.
 *
 * Without both, a full-bleed globe gets a band of cream across the top of it,
 * which is the seam that makes an installed app feel like a web page.
 *
 * Declared by the screen rather than guessed from the route, because one route
 * can be both: /send is paper while you are writing and sky the moment the
 * postcard leaves.
 */

export type Surface = "paper" | "sky";

/** Must match --color-paper and the top stop of the .sky gradient. */
const COLOURS: Record<Surface, string> = {
  paper: "#f6f3ec",
  sky: "#4d7fa8",
};

function apply(surface: Surface) {
  document.body.dataset.surface = surface;

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = COLOURS[surface];
}

export function SurfaceTheme({ surface }: { surface: Surface }) {
  useEffect(() => {
    apply(surface);
    // Whatever mounts next declares its own; falling back to paper means a
    // screen that forgets to is merely plain, never wrong.
    return () => apply("paper");
  }, [surface]);

  return null;
}

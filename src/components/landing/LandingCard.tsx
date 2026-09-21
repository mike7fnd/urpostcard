"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { Postcard } from "@/components/postcard/Postcard";
import { HERO_DESIGN } from "@/lib/design";

/** The object, before anything has been written on it. */
export function LandingCard() {
  const reduced = useReducedMotion();
  const [face, setFace] = useState<"front" | "back">("front");

  return (
    <div className="flex justify-center lg:flex-1">
      <motion.button
        type="button"
        onClick={() => setFace((f) => (f === "front" ? "back" : "front"))}
        aria-label={face === "front" ? "Turn the postcard over" : "Turn the postcard back"}
        className="w-full max-w-[420px] cursor-pointer rounded-[var(--radius-card)] lg:max-w-[460px]"
        style={{ perspective: "1400px" }}
        initial={reduced ? undefined : { opacity: 0, y: 26, rotateZ: -5 }}
        animate={
          reduced
            ? undefined
            : { opacity: 1, y: [0, -7, 0], rotateZ: -2.4 }
        }
        transition={
          reduced
            ? undefined
            : {
                opacity: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
                rotateZ: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
                y: { duration: 7.5, repeat: Infinity, ease: "easeInOut" },
              }
        }
        whileHover={reduced ? undefined : { rotateZ: -0.8, scale: 1.012 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="shadow-lift-lg rounded-[var(--radius-card)]">
          <Postcard design={HERO_DESIGN} face={face} caption="Somewhere" />
        </div>
      </motion.button>
    </div>
  );
}

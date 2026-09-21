"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useState } from "react";

/**
 * Swipe to send.
 *
 * The card follows the finger exactly, tips with the drag, lifts off the
 * surface as it rises, and carries its shadow with it. Released past the
 * threshold — or thrown hard enough — it leaves the screen upward and keeps
 * going; released short, it drops back with weight.
 *
 * A button underneath does the same thing for keyboards, switch access and
 * anyone who would rather not.
 */

const THRESHOLD = -128;
const FLING_VELOCITY = -680;

export function SwipeToSend({
  children,
  onSend,
  disabled = false,
  hint = "Swipe the postcard up to send it",
  buttonLabel = "Send it",
}: {
  children: React.ReactNode;
  onSend: () => void | Promise<void>;
  disabled?: boolean;
  hint?: string;
  buttonLabel?: string;
}) {
  const reduced = useReducedMotion();
  const [launched, setLaunched] = useState(false);

  const y = useMotionValue(0);
  const x = useMotionValue(0);

  // Lift: the further up it goes, the further it is from the surface.
  const lift = useTransform(y, [-260, 0], [1, 0], { clamp: true });
  const rotate = useTransform(x, [-160, 160], [-9, 9], { clamp: true });
  const scale = useTransform(lift, [0, 1], [1, 1.07]);
  const shadowBlur = useTransform(lift, [0, 1], [26, 82]);
  const shadowY = useTransform(lift, [0, 1], [14, 54]);
  const shadowAlpha = useTransform(lift, [0, 1], [0.18, 0.34]);
  const boxShadow = useTransform(
    [shadowY, shadowBlur, shadowAlpha],
    ([sy, blur, alpha]) => `0 ${sy}px ${blur}px rgba(22,21,15,${alpha})`,
  );

  async function launch() {
    if (launched || disabled) return;
    setLaunched(true);

    if (!reduced) {
      // Keep the momentum: it exits the way it was already moving.
      void animate(x, x.get() * 2.4, { duration: 0.72, ease: [0.2, 0.7, 0.3, 1] });
      await animate(y, -1400, { duration: 0.78, ease: [0.28, 0.72, 0.24, 1] });
    }

    await onSend();
  }

  async function handleDragEnd(
    _: unknown,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } },
  ) {
    if (info.offset.y < THRESHOLD || info.velocity.y < FLING_VELOCITY) {
      await launch();
      return;
    }

    // Falls back onto the desk rather than gliding.
    void animate(x, 0, { type: "spring", stiffness: 240, damping: 26 });
    void animate(y, 0, { type: "spring", stiffness: 260, damping: 22, mass: 0.9 });
  }

  return (
    <div className="flex w-full flex-col items-center">
      <motion.div
        drag={disabled || launched || reduced ? false : true}
        dragDirectionLock={false}
        dragElastic={{ top: 0.9, bottom: 0.14, left: 0.35, right: 0.35 }}
        dragConstraints={{ top: -420, bottom: 0, left: -110, right: 110 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{
          x,
          y,
          rotate,
          scale,
          boxShadow,
          touchAction: "none",
          borderRadius: "var(--radius-card)",
        }}
        className={`w-full ${
          disabled || launched || reduced ? "" : "cursor-grab active:cursor-grabbing"
        }`}
        aria-hidden={reduced ? undefined : false}
      >
        {children}
      </motion.div>

      <div className="mt-8 flex flex-col items-center gap-4">
        {!reduced ? (
          <motion.p
            className="text-[13.5px] tracking-wide text-ink-faint"
            animate={launched ? { opacity: 0 } : { opacity: [0.55, 1, 0.55] }}
            transition={
              launched
                ? { duration: 0.3 }
                : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
            }
          >
            {hint}
          </motion.p>
        ) : null}

        <button
          type="button"
          onClick={launch}
          disabled={disabled || launched}
          className="tap min-h-[46px] rounded-full bg-ink px-7 text-[15px] font-medium text-paper transition-opacity disabled:opacity-40"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

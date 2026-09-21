"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";

import type { WorldGlobeProps } from "@/components/globe/WorldGlobe";

/**
 * Entry point for anything that needs the world. WebGL, three.js and the
 * country atlas are fetched only when this mounts — nothing globe-shaped is in
 * the initial bundle of any page.
 */
const WorldGlobe = dynamic(() => import("@/components/globe/WorldGlobe"), {
  ssr: false,
  loading: () => <GlobeVeil />,
});

function GlobeVeil({ message }: { message?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-night">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-16 w-16 rounded-full border border-night-line"
          style={{
            background:
              "radial-gradient(circle at 34% 30%, #1b222a, #0b0f14 68%)",
          }}
        />
        <p className="text-[13px] tracking-wide text-night-ink-soft">
          {message ?? "Finding the world…"}
        </p>
      </div>
    </div>
  );
}

class GlobeBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function GlobeStage(props: WorldGlobeProps) {
  return (
    <GlobeBoundary
      fallback={
        <GlobeVeil message="The world could not be drawn on this device." />
      }
    >
      <WorldGlobe {...props} />
    </GlobeBoundary>
  );
}

export { GlobeVeil };

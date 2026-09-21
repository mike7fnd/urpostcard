"use client";

import { useState } from "react";

import { Postcard } from "@/components/postcard/Postcard";
import { SwipeToSend } from "@/components/postcard/SwipeToSend";
import { StepShell } from "@/components/send/StepShell";
import { Notice } from "@/components/ui/Notice";
import { formatDistance, formatDuration } from "@/lib/delivery";
import type { DesignConfig, JourneyPreview } from "@/lib/types";

export function ReviewStep({
  design,
  to,
  from,
  message,
  preview,
  error,
  onBack,
  onSend,
}: {
  design: DesignConfig;
  to: string;
  from: string;
  message: string;
  preview: JourneyPreview | null;
  error: string | null;
  onBack: () => void;
  onSend: () => Promise<void>;
}) {
  const [face, setFace] = useState<"front" | "back">("back");

  return (
    <StepShell title="Ready" onBack={onBack}>
      <SwipeToSend onSend={onSend}>
        <button
          type="button"
          onClick={() => setFace((f) => (f === "back" ? "front" : "back"))}
          className="w-full rounded-[var(--radius-card)]"
          style={{ perspective: "1400px" }}
          aria-label="Turn the postcard over"
        >
          <Postcard
            design={design}
            face={face}
            to={to}
            from={from}
            message={message}
          />
        </button>
      </SwipeToSend>

      {preview ? (
        <p className="mt-8 text-center text-[13.5px] leading-relaxed text-ink-faint">
          {formatDistance(preview.distance_km)} to{" "}
          {preview.destination_location_name ?? "them"} · about{" "}
          {formatDuration(preview.travel_duration_seconds)} on the way
        </p>
      ) : null}

      <Notice className="mt-4 text-center">{error}</Notice>
    </StepShell>
  );
}

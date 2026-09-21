"use client";

import { useEffect, useState } from "react";

/**
 * Time of day comes from the reader's clock, not the server's — a greeting
 * that says "good evening" at breakfast breaks the spell immediately.
 */
function phraseFor(hour: number): string {
  if (hour < 5) return "Still awake";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Greeting({ name }: { name: string }) {
  const [phrase, setPhrase] = useState<string | null>(null);

  useEffect(() => {
    setPhrase(phraseFor(new Date().getHours()));
  }, []);

  const firstName = name.trim().split(/\s+/)[0] ?? "";

  return (
    <h1 className="font-display text-[30px] leading-tight tracking-tight text-night-ink sm:text-[36px]">
      {phrase ? `${phrase}, ${firstName}.` : `${firstName}.`}
    </h1>
  );
}

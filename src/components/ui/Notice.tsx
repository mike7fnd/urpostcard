"use client";

export function Notice({
  children,
  tone = "error",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "error" | "quiet";
  className?: string;
}) {
  if (!children) return null;

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        `text-[14px] leading-relaxed ${
          tone === "error" ? "text-accent" : "text-ink-soft"
        } ${className}`
      }
    >
      {children}
    </p>
  );
}

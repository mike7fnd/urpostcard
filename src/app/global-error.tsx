"use client";

/**
 * The backstop for a failure in the root layout itself, where the normal
 * error boundary has no layout left to render into — so this one ships its
 * own <html> and its own styles, and depends on nothing.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f3ec",
          color: "#16150f",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "34ch" }}>
          <p
            style={{
              fontSize: "13px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#57544a",
              margin: 0,
            }}
          >
            urpostcard
          </p>
          <h1 style={{ fontSize: "28px", lineHeight: 1.2, margin: "28px 0 0" }}>
            The whole thing fell over.
          </h1>
          <p style={{ fontSize: "15px", lineHeight: 1.6, color: "#57544a" }}>
            This one is on us, not on you.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "28px",
              minHeight: "46px",
              padding: "0 28px",
              borderRadius: "999px",
              border: "none",
              background: "#16150f",
              color: "#f6f3ec",
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: "40px", fontFamily: "ui-monospace, monospace", fontSize: "11.5px", color: "#918c7f" }}>
              {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}

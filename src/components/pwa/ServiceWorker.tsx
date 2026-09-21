"use client";

import { useEffect } from "react";

/**
 * Registers the service worker, which is what makes the app installable on
 * Android and gives it an offline page everywhere.
 *
 * Production only: in development a cached worker is mostly a way to serve
 * yesterday's build to yourself and lose an afternoon to it.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // An unavailable worker costs an offline page, nothing more.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

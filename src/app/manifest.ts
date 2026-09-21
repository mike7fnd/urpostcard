import type { MetadataRoute } from "next";

/**
 * Served at /manifest.webmanifest.
 *
 * `standalone` is the point of the exercise: installed from a phone's home
 * screen this opens without browser chrome, which is what lets a full-bleed
 * globe actually fill the screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "urpostcard",
    short_name: "urpostcard",
    description:
      "Write a postcard, send it into the world, and watch it travel to someone.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Paper, so the splash and any letterboxing match the app rather than
    // flashing white on the way in.
    background_color: "#f6f3ec",
    theme_color: "#f6f3ec",
    categories: ["social", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Send a postcard",
        url: "/send",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Postcards",
        url: "/postcards",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}

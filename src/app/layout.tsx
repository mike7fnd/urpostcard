import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";

import { ServiceWorker } from "@/components/pwa/ServiceWorker";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "urpostcard",
  description:
    "Write a postcard, send it into the world, and watch it travel to someone.",
  applicationName: "urpostcard",
  // iOS reads these to open from the home screen without Safari chrome.
  appleWebApp: { capable: true, title: "urpostcard", statusBarStyle: "default" },
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom left alone on purpose: locking it is an accessibility cost
  // that an app-like feel does not justify.
  maximumScale: 5,
  viewportFit: "cover",
  // Paper, unconditionally. There is no dark theme any more, and declaring a
  // dark variant left phones in dark mode with a black status bar above a
  // cream app. Screens that are not paper override this at runtime via
  // <SurfaceTheme>.
  themeColor: "#f6f3ec",
};

// Typed explicitly rather than with Next's generated `LayoutProps`, which only
// exists once .next/types has been written — `npm run typecheck` has to work
// on a clean checkout, before anything has been built.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}

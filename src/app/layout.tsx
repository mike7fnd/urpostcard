import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";

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
  appleWebApp: { capable: true, title: "urpostcard", statusBarStyle: "default" },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0d" },
  ],
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}

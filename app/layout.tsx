import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { SwRegister } from "./sw-register";
import { InstallButton } from "./install-button";

// GoatCounter site code — must match the account's subdomain: climatize.goatcounter.com.
// (Was "climatize-now", which was never registered, so the tracker sent data nowhere.)
const GC_SITE = "climatize";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://climatize.now";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "climatize.now — your daily heat-adaptation plan",
    template: "%s — climatize.now",
  },
  description:
    "A personalized, weather-driven plan to adapt to heat safely. No accounts, no tracking. Wellness guidance, not medical advice.",
  keywords: [
    "heat acclimatization",
    "heat adaptation",
    "heat safety",
    "daily heat plan",
    "weather-based fitness",
    "heat exhaustion prevention",
    "outdoor heat training",
    "climate adaptation",
    "personalized heat plan",
  ],
  authors: [{ name: "Taner", url: "https://tunas.me/taner/" }],
  creator: "Taner",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "climatize.now", statusBarStyle: "default" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    title: "climatize.now — your daily heat-adaptation plan",
    description:
      "A personalized, weather-driven plan to adapt to heat safely. No accounts, no tracking.",
    type: "website",
    url: SITE_URL,
    siteName: "climatize.now",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "climatize.now — your daily heat-adaptation plan",
    description:
      "A personalized, weather-driven plan to adapt to heat safely. No accounts, no tracking.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SwRegister />
        <InstallButton />
        {process.env.NODE_ENV === "production" && (
          <Script
            data-goatcounter={`https://${GC_SITE}.goatcounter.com/count`}
            src="https://gc.zgo.at/count.js"
            strategy="afterInteractive"
          />
        )}
        {children}
        <footer className="mt-auto border-t border-slate-100 px-5 py-5 text-center text-xs text-slate-400">
          <div className="flex items-center justify-center gap-3">
            <Link href="/how-it-works" className="hover:text-slate-600">
              How it works
            </Link>
            <span aria-hidden>·</span>
            <Link href="/about" className="hover:text-slate-600">
              About
            </Link>
            <span aria-hidden>·</span>
            <Link href="/privacy" className="hover:text-slate-600">
              Privacy &amp; terms
            </Link>
          </div>
          <p className="mt-1.5">No accounts. No tracking. Everything you enter stays on your device.</p>
        </footer>
      </body>
    </html>
  );
}

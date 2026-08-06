import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Formerly Yours — Sell the past. Fund what's next.",
    template: "%s · Formerly Yours",
  },
  description:
    "Every object has a story. Sell the things a chapter of your life left behind — and fund whatever comes next.",
  applicationName: "Formerly Yours",
  manifest: "/manifest.webmanifest",
  keywords: [
    "resale",
    "marketplace",
    "storytelling",
    "second hand",
    "breakup",
    "next chapter",
  ],
  openGraph: {
    type: "website",
    siteName: "Formerly Yours",
    title: "Formerly Yours — Sell the past. Fund what's next.",
    description:
      "Every object has a story. Sell the past, fund what's next. Join the waitlist.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Formerly Yours — Sell the past. Fund what's next.",
    description: "Every object has a story. Sell the past, fund what's next.",
  },
};

export const viewport: Viewport = {
  themeColor: "#100b1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}

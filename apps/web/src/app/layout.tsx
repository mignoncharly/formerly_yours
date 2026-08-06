import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

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
    default: "Once Was Yours — Sell the past. Fund what's next.",
    template: "%s · Once Was Yours",
  },
  description:
    "Every object has a story. Sell the things a chapter of your life left behind — and fund whatever comes next.",
  applicationName: "Once Was Yours",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Once Was Yours",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
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
    siteName: "Once Was Yours",
    title: "Once Was Yours — Sell the past. Fund what's next.",
    description:
      "Every object has a story. Sell the past, fund what's next. Join the waitlist.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Once Was Yours — Sell the past. Fund what's next.",
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
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

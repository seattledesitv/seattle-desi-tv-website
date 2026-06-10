import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Seattle Desi TV | South Asian Community Media in Seattle",
  description:
    "Seattle Desi TV shares South Asian community stories, events, businesses, radio, interviews, and cultural media across Seattle and the Pacific Northwest.",
  manifest: "/manifest.webmanifest",
  applicationName: "Seattle Desi TV",
  appleWebApp: {
    capable: true,
    title: "Seattle Desi TV",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/sdtv-logo.png",
    shortcut: "/sdtv-logo.png",
    apple: "/sdtv-logo.png",
  },
  openGraph: {
    title: "Seattle Desi TV",
    description:
      "South Asian community media, events, businesses, radio, and stories in Seattle.",
    url: "https://seattledesitv.com",
    siteName: "Seattle Desi TV",
    type: "website",
    images: [
      {
        url: "/sdtv-logo.png",
        width: 500,
        height: 500,
        alt: "Seattle Desi TV",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#db2777",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Seattle Desi TV" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/sdtv-logo.png" />
      </head>
      <body>
        {children}
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          async
          defer
        />
      </body>
    </html>
  );
}

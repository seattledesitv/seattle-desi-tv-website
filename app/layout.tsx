import "./globals.css";
import "./mobile-hero-polish.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import AccessibilityFixes from "./components/AccessibilityFixes";
import EventOpsInfluencerNotice from "./components/EventOpsInfluencerNotice";
import HomeCommunityCallouts from "./components/HomeCommunityCallouts";
import { FloatingWhatsAppButton } from "./components/SdtvContactLinks";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://seattledesitv.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Seattle Desi TV | South Asian Community, Events & Media",
    template: "%s | Seattle Desi TV",
  },
  description:
    "Seattle Desi TV connects the South Asian community through Seattle events, interviews, radio, business spotlights, cultural stories, and community media across the Pacific Northwest.",
  manifest: "/manifest.webmanifest",
  applicationName: "Seattle Desi TV",
  keywords: [
    "Seattle Desi TV",
    "Seattle Indian events",
    "Seattle South Asian community",
    "Seattle Desi Radio",
    "Indian community Seattle",
    "South Asian businesses Seattle",
    "Pacific Northwest Desi events",
  ],
  authors: [{ name: "Seattle Desi TV" }],
  creator: "Seattle Desi TV",
  publisher: "Seattle Desi TV",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "Seattle Desi TV",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-512.png",
    shortcut: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Seattle Desi TV | South Asian Community, Events & Media",
    description:
      "Discover South Asian community events, interviews, local businesses, radio, and cultural stories from Seattle Desi TV.",
    url: siteUrl,
    siteName: "Seattle Desi TV",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/sdtv-logo.png",
        width: 500,
        height: 500,
        alt: "Seattle Desi TV logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Seattle Desi TV | South Asian Community, Events & Media",
    description:
      "Seattle Desi TV shares South Asian community events, interviews, radio, businesses, and stories across Seattle and the Pacific Northwest.",
    images: ["/sdtv-logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#050b18",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Script id="ld-org" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Seattle Desi TV",
            url: siteUrl,
            logo: `${siteUrl}/sdtv-logo.png`,
            sameAs: [
              "https://www.youtube.com/@SeattleDesiTV",
              "https://instagram.com/seattledesitv",
              "https://facebook.com/seattledesitv",
            ],
          })}
        </Script>
        <AccessibilityFixes />
        <EventOpsInfluencerNotice />
        {children}
        <HomeCommunityCallouts />
        <FloatingWhatsAppButton />
      </body>
    </html>
  );
}

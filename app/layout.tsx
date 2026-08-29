import "./globals.css";
import "./mobile-hero-polish.css";
import type { Metadata, Viewport } from "next";
import AccessibilityFixes from "./components/AccessibilityFixes";
import BusinessDirectoryOfferClamp from "./components/BusinessDirectoryOfferClamp";
import BusinessOwnershipActions from "./components/BusinessOwnershipActions";
import BusinessReviewSummaryEnhancer from "./components/BusinessReviewSummaryEnhancer";
import DirectoryMediaEnhancer from "./components/DirectoryMediaEnhancer";
import EngagementTracker from "./components/EngagementTracker";
import EventOpsInfluencerNotice from "./components/EventOpsInfluencerNotice";
import HomeCommunityCallouts from "./components/HomeCommunityCallouts";
import HomeSponsorCardPolish from "./components/HomeSponsorCardPolish";
import HomepageHeroBridgeV2 from "./components/home/HomepageHeroBridgeV2";
import PremiumBusinessCardPolish from "./components/PremiumBusinessCardPolish";
import PremiumOrganizationCardPolish from "./components/PremiumOrganizationCardPolish";
import { FloatingWhatsAppButton } from "./components/SdtvContactLinks";
import { safeJsonLd, SITE_URL } from "./lib/seo/service";
import { SiteProvider } from "./lib/sites/SiteContext";
import { resolveCurrentSite } from "./lib/sites/siteResolver";

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Seattle Desi TV | South Asian Community, Events & Media", template: "%s | Seattle Desi TV" },
  description: "Seattle Desi TV connects the South Asian community through Seattle events, interviews, radio, business spotlights, cultural stories, and community media across the Pacific Northwest.",
  manifest: "/manifest.webmanifest",
  applicationName: "Seattle Desi TV",
  keywords: ["Seattle Desi TV", "Seattle Indian events", "Seattle South Asian community", "Seattle Desi Radio", "Indian community Seattle", "South Asian businesses Seattle", "Pacific Northwest Desi events"],
  authors: [{ name: "Seattle Desi TV" }], creator: "Seattle Desi TV", publisher: "Seattle Desi TV",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  appleWebApp: { capable: true, title: "Seattle Desi TV", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-512.png", shortcut: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  openGraph: { title: "Seattle Desi TV | South Asian Community, Events & Media", description: "Discover South Asian community events, interviews, local businesses, radio, and cultural stories from Seattle Desi TV.", url: siteUrl, siteName: "Seattle Desi TV", type: "website", locale: "en_US", images: [{ url: "/sdtv-logo.png", width: 500, height: 500, alt: "Seattle Desi TV logo" }] },
  twitter: { card: "summary_large_image", title: "Seattle Desi TV | South Asian Community, Events & Media", description: "Seattle Desi TV shares South Asian community events, interviews, radio, businesses, and stories across Seattle and the Pacific Northwest.", images: ["/sdtv-logo.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 5, themeColor: "#050b18" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await resolveCurrentSite();
  return <html lang="en"><body>
    <SiteProvider site={site}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd({ "@context": "https://schema.org", "@graph": [{ "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "Seattle Desi TV", alternateName: "SDTV", url: siteUrl, logo: { "@type": "ImageObject", url: `${siteUrl}/sdtv-logo.png` }, description: "A 501(c)(3) nonprofit community media organization serving the South Asian and Desi community in Seattle and the Pacific Northwest.", nonprofitStatus: "Nonprofit501c3", areaServed: ["Seattle", "Washington", "Pacific Northwest"], sameAs: ["https://www.youtube.com/@SeattleDesiTV", "https://instagram.com/seattledesitv", "https://facebook.com/seattledesitv"] }, { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: "Seattle Desi TV", publisher: { "@id": `${siteUrl}/#organization` }, inLanguage: "en-US" }] }) }} />
    <EngagementTracker />
    <AccessibilityFixes />
    <BusinessDirectoryOfferClamp />
    <BusinessOwnershipActions />
    <BusinessReviewSummaryEnhancer />
    <DirectoryMediaEnhancer />
    <PremiumBusinessCardPolish />
    <PremiumOrganizationCardPolish />
    <EventOpsInfluencerNotice />
    <HomepageHeroBridgeV2 />
    <HomeSponsorCardPolish />
    {children}
    <HomeCommunityCallouts />
    <FloatingWhatsAppButton />
    </SiteProvider>
  </body></html>;
}

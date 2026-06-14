import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seattle Desi Business Directory",
  description:
    "Discover South Asian and Indian-owned local businesses, offers, services, restaurants, professional services, and community partners in the Seattle area.",
  alternates: {
    canonical: "/businesses",
  },
  openGraph: {
    title: "Seattle Desi Business Directory | Seattle Desi TV",
    description:
      "Browse Seattle-area South Asian businesses, community partners, services, offers, and local business spotlights from Seattle Desi TV.",
    url: "/businesses",
    type: "website",
    images: [
      {
        url: "/hero-sdtv.png",
        width: 1200,
        height: 630,
        alt: "Seattle Desi TV local business directory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Seattle Desi Business Directory | Seattle Desi TV",
    description:
      "Find South Asian local businesses, services, restaurants, offers, and partners across Seattle.",
    images: ["/hero-sdtv.png"],
  },
};

export default function BusinessesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

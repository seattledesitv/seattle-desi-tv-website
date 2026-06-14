import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seattle Indian Events Calendar",
  description:
    "Explore upcoming South Asian, Indian, Telugu, Tamil, cultural, music, nonprofit, and community events in the Seattle area with Seattle Desi TV.",
  alternates: {
    canonical: "/events",
  },
  openGraph: {
    title: "Seattle Indian Events Calendar | Seattle Desi TV",
    description:
      "Find Seattle-area South Asian community events, cultural programs, music shows, nonprofit gatherings, and SDTV coverage opportunities.",
    url: "/events",
    type: "website",
    images: [
      {
        url: "/hero-sdtv.png",
        width: 1200,
        height: 630,
        alt: "Seattle Desi TV events",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Seattle Indian Events Calendar | Seattle Desi TV",
    description:
      "Discover South Asian and Indian community events across Seattle and the Pacific Northwest.",
    images: ["/hero-sdtv.png"],
  },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

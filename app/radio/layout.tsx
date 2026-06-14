import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seattle Desi Radio",
  description:
    "Listen to Seattle Desi Radio for South Asian music, community voices, cultural programming, local hosts, and Seattle Desi TV radio shows.",
  alternates: {
    canonical: "/radio",
  },
  openGraph: {
    title: "Seattle Desi Radio | Seattle Desi TV",
    description:
      "Stream Seattle Desi Radio and explore South Asian music, community voices, local hosts, and SDTV radio programming.",
    url: "/radio",
    type: "website",
    images: [
      {
        url: "/sdtv-logo.png",
        width: 500,
        height: 500,
        alt: "Seattle Desi Radio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Seattle Desi Radio | Seattle Desi TV",
    description:
      "Listen to South Asian music, local voices, and community radio programming from Seattle Desi TV.",
    images: ["/sdtv-logo.png"],
  },
};

export default function RadioLayout({ children }: { children: React.ReactNode }) {
  return children;
}

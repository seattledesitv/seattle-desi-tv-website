import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seattle Desi TV Community Recognition",
  description:
    "Celebrate Seattle Desi TV volunteers, community contributors, coverage teams, and recognition highlights across the South Asian community.",
  alternates: {
    canonical: "/recognition",
  },
  openGraph: {
    title: "Community Recognition | Seattle Desi TV",
    description:
      "Celebrate SDTV volunteers, contributors, coverage teams, and community recognition highlights.",
    url: "/recognition",
    type: "website",
    images: [
      {
        url: "/sdtv-logo.png",
        width: 500,
        height: 500,
        alt: "Seattle Desi TV community recognition",
      },
    ],
  },
};

export default function RecognitionLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seattle Desi TV Team",
  description:
    "Meet the Seattle Desi TV team, volunteers, hosts, contributors, and community media members supporting South Asian stories in Seattle.",
  alternates: {
    canonical: "/team",
  },
  openGraph: {
    title: "Seattle Desi TV Team",
    description:
      "Meet the SDTV team, volunteers, hosts, and contributors supporting South Asian community media in Seattle.",
    url: "/team",
    type: "website",
    images: [
      {
        url: "/sdtv-logo.png",
        width: 500,
        height: 500,
        alt: "Seattle Desi TV team",
      },
    ],
  },
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return children;
}

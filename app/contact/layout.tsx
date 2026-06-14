import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Seattle Desi TV",
  description:
    "Contact Seattle Desi TV for event coverage, volunteer opportunities, sponsorships, business spotlights, interviews, and South Asian community media partnerships.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Seattle Desi TV",
    description:
      "Reach Seattle Desi TV for event coverage, volunteering, sponsorships, business spotlights, interviews, and community media partnerships.",
    url: "/contact",
    type: "website",
    images: [
      {
        url: "/sdtv-logo.png",
        width: 500,
        height: 500,
        alt: "Contact Seattle Desi TV",
      },
    ],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

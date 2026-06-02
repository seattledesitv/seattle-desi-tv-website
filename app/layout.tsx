import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Seattle Desi TV | South Asian Community Media in Seattle",
  description:
    "Seattle Desi TV shares South Asian community stories, events, businesses, radio, interviews, and cultural media across Seattle and the Pacific Northwest.",
  openGraph: {
    title: "Seattle Desi TV",
    description:
      "South Asian community media, events, businesses, radio, and stories in Seattle.",
    url: "https://seattledesitv.com",
    siteName: "Seattle Desi TV",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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

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
          id="sdtv-hash-tab-fix"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function notifyAppAboutHash() {
                  if (!window.location.hash) return;
                  try {
                    window.dispatchEvent(new PopStateEvent('popstate', { state: { tab: window.location.hash.replace('#', '') } }));
                  } catch (e) {
                    window.dispatchEvent(new Event('popstate'));
                  }
                }
                window.addEventListener('hashchange', notifyAppAboutHash);
                setTimeout(notifyAppAboutHash, 250);
                setTimeout(notifyAppAboutHash, 1000);
                setTimeout(notifyAppAboutHash, 2000);
              })();
            `
          }}
        />
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          async
          defer
        />
      </body>
    </html>
  );
}

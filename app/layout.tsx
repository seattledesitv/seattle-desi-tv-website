import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seattle Desi TV",
  description: "Seattle Desi TV media platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

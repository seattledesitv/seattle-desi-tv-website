import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Form",
  robots: { index: false, follow: false },
};

export default function QuickFormLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Hub",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function MyHubLayout({ children }: { children: React.ReactNode }) {
  return children;
}

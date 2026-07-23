import type { Metadata } from "next";
import StudioEnhancements from "../components/StudioEnhancements";

export const metadata: Metadata = {
  title: "Studio",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <><StudioEnhancements />{children}</>;
}

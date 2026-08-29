import type { Metadata } from "next";
import StudioEnhancements from "../components/StudioEnhancements";
import SiteResolutionDiagnostic from "../components/studio/SiteResolutionDiagnostic";

export const metadata: Metadata = {
  title: "Studio",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <><StudioEnhancements /><SiteResolutionDiagnostic />{children}</>;
}

import { staticMetadata } from "../lib/seo/service";
export const metadata = staticMetadata(
  "Seattle Community Press Releases",
  "Read approved press releases and announcements from Seattle-area South Asian organizations, businesses, and community leaders.",
  "/press-releases",
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

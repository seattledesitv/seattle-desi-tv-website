import MyHubHeader from "./MyHubHeader";
import SiteFooter from "./SiteFooter";

export default function MyHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      {children}
      <SiteFooter />
    </main>
  );
}

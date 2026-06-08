import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import ContactSection from "../components/ContactSection";

export default function ContactPage({
  searchParams,
}: {
  searchParams: { interest?: string };
}) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 text-slate-950">
      <SiteHeader />
      <ContactSection initialInterest={searchParams?.interest || ""} />
      <SiteFooter />
    </main>
  );
}

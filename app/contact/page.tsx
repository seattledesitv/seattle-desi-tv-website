"use client";

import { useSearchParams } from "next/navigation";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import ContactSection from "../components/ContactSection";

export default function ContactPage() {
  const searchParams = useSearchParams();
  const interest = searchParams.get("interest") || "";

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 text-slate-950">
      <SiteHeader />
      <ContactSection initialInterest={interest} />
      <SiteFooter />
    </main>
  );
}

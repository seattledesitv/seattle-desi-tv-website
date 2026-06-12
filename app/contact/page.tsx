"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import ContactSection from "../components/ContactSection";

function ContactPageContent() {
  const searchParams = useSearchParams();
  const interest = searchParams.get("interest") || "";

  return <ContactSection initialInterest={interest} />;
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 text-slate-950">
      <SiteHeader />
      <Suspense fallback={<ContactSection initialInterest="" />}>
        <ContactPageContent />
      </Suspense>
      <SiteFooter />
    </main>
  );
}

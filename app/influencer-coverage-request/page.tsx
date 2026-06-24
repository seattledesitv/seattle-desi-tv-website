"use client";

import { useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export default function InfluencerCoverageRequestPage() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    goal: "",
    preferredDate: "",
    budget: "",
    notes: "",
  });

  function updateField(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitRequest() {
    setMessage("");
    setSaving(true);
    const response = await fetch("/api/influencer-coverage-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      setMessage(result.error || "Could not submit the request. Please try again.");
    } else {
      setMessage("Thank you. SDTV received your influencer coverage request and our team will respond with next steps.");
      setForm({ businessName: "", contactName: "", email: "", phone: "", website: "", goal: "", preferredDate: "", budget: "", notes: "" });
    }
    setSaving(false);
  }

  return <main className="min-h-screen bg-slate-50 text-slate-950">
    <SiteHeader />
    <section className="bg-[#050b18] px-6 py-14 text-white md:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-black uppercase tracking-wide text-pink-300">SDTV Influencer Coverage</p>
        <h1 className="mt-3 text-4xl font-black md:text-6xl">Request Influencer Coverage</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">Businesses can request SDTV influencer coverage for launches, promotions, food, fashion, services, local campaigns, and community stories.</p>
      </div>
    </section>

    <section className="mx-auto max-w-4xl px-6 py-10 md:px-10">
      <div className="rounded-3xl bg-white p-6 shadow-xl md:p-8">
        <h2 className="text-3xl font-black">Business Coverage Request</h2>
        <p className="mt-2 text-slate-600">This goes into SDTV Studio Contact Requests so the team can review, respond, and coordinate the right influencer coverage.</p>
        {message && <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 font-bold text-yellow-900">{message}</div>}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="font-bold">Business Name *<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.businessName} onChange={(event) => updateField("businessName", event.target.value)} /></label>
          <label className="font-bold">Contact Name *<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.contactName} onChange={(event) => updateField("contactName", event.target.value)} /></label>
          <label className="font-bold">Email *<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.email} onChange={(event) => updateField("email", event.target.value)} /></label>
          <label className="font-bold">Phone<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /></label>
          <label className="font-bold md:col-span-2">Website / Social Link<input className="mt-1 w-full rounded-xl border p-3 font-normal" placeholder="Website, Instagram, Facebook, Google Business, etc." value={form.website} onChange={(event) => updateField("website", event.target.value)} /></label>
          <label className="font-bold">Preferred Timing<input className="mt-1 w-full rounded-xl border p-3 font-normal" placeholder="Example: next week, opening weekend, before Diwali" value={form.preferredDate} onChange={(event) => updateField("preferredDate", event.target.value)} /></label>
          <label className="font-bold">Budget / Package Interest<select className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.budget} onChange={(event) => updateField("budget", event.target.value)}><option value="">Not sure yet</option><option>Basic influencer mention</option><option>Short reel / story coverage</option><option>On-location visit</option><option>Campaign package</option><option>Need SDTV recommendation</option></select></label>
        </div>

        <label className="mt-4 block font-bold">What do you want influencer coverage for? *<textarea className="mt-1 min-h-32 w-full rounded-xl border p-3 font-normal" placeholder="Example: restaurant launch, new collection, special offer, grand opening, community campaign..." value={form.goal} onChange={(event) => updateField("goal", event.target.value)} /></label>
        <label className="mt-4 block font-bold">Additional Notes<textarea className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal" placeholder="Share audience, location, key message, offer, requirements, or any creator preferences." value={form.notes} onChange={(event) => updateField("notes", event.target.value)} /></label>

        <button onClick={submitRequest} disabled={saving} className="mt-6 rounded-xl bg-pink-600 px-6 py-4 font-black text-white disabled:opacity-60">{saving ? "Submitting..." : "Submit Influencer Coverage Request"}</button>
      </div>
    </section>
    <SiteFooter />
  </main>;
}

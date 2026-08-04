"use client";

import { useState } from "react";
import MyHubHeader from "../../components/MyHubHeader";
import SiteFooter from "../../components/SiteFooter";
import { useBusinessOffers } from "../../hooks/useBusinessOffers";
import { uploadFileToCloudinary } from "../../lib/cloudinaryUpload";
import type { OfferPlacement } from "../../lib/businessOffers/types";
import { validateOptionalImageFile } from "../../lib/validation";

const today = () => new Date().toISOString().slice(0, 10);
const placementOptions: Array<{ value: OfferPlacement; title: string; detail: string }> = [
  { value: "standard", title: "Standard", detail: "Listed with all approved offers." },
  { value: "premium", title: "Premium", detail: "Enhanced priority card in the offers list." },
  { value: "featured", title: "Featured", detail: "Pinned in the featured section at the top of Offers." },
  { value: "hero", title: "Homepage Hero", detail: "Promoted in the homepage hero carousel." },
];

export default function MyBusinessOffersPage() {
  const { offers, businesses, loading, saving, error, create, remove } = useBusinessOffers("owner");
  const [form, setForm] = useState({ business_id: "", title: "", description: "", terms: "", offer_code: "", destination_url: "", image_url: "", starts_at: today(), ends_at: "", requested_placement: "standard" as OfferPlacement, status: "pending" as const });
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file?: File) {
    if (!file) return;
    const validation = validateOptionalImageFile(file, "Offer image", 5);
    if (!validation.ok) return setMessage(validation.message);
    setUploading(true); setMessage("");
    try { const imageUrl = await uploadFileToCloudinary(file); setForm((current) => ({ ...current, image_url: imageUrl })); setMessage("Offer image uploaded."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not upload the offer image."); }
    finally { setUploading(false); }
  }

  async function submit() {
    setMessage("");
    try { await create(form); setForm({ ...form, title: "", description: "", terms: "", offer_code: "", destination_url: "", image_url: "", starts_at: today(), ends_at: "" }); setMessage("Offer submitted for SDTV approval and placement pricing."); }
    catch { /* The hook displays the service error. */ }
  }

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader /><section className="mx-auto max-w-7xl px-6 py-10">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-black uppercase tracking-wide text-pink-300">My Businesses</p><h1 className="mt-2 text-4xl font-black">Business Offers</h1><p className="mt-2 text-slate-300">Create an offer, request its placement, and submit it for SDTV approval.</p></div><a href="/my-businesses" className="rounded-xl border border-white/20 px-5 py-3 text-center font-black">Back to My Businesses</a></div>
    {(error || message) && <div className="mt-6 rounded-2xl bg-white p-4 font-bold text-slate-950">{error || message}</div>}
    <div className="mt-8 grid gap-6 xl:grid-cols-[.95fr_1.05fr]"><section className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Add an Offer</h2>
      {businesses.length === 0 ? <p className="mt-4 text-slate-500">No managed businesses are available. Submit or claim a business first.</p> : <div className="mt-5 grid gap-4">
        <label className="grid gap-1 font-bold">Business<select value={form.business_id} onChange={(e) => setForm({ ...form, business_id: e.target.value })} className="rounded-xl border p-3 font-normal"><option value="">Choose business...</option>{businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label>
        <label className="grid gap-1 font-bold">Offer title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl border p-3 font-normal"/></label>
        <label className="grid gap-1 font-bold">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-28 rounded-xl border p-3 font-normal"/></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 font-bold">Starts<input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="rounded-xl border p-3 font-normal"/></label><label className="grid gap-1 font-bold">Ends<input type="date" value={form.ends_at} min={form.starts_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="rounded-xl border p-3 font-normal"/></label></div>
        <fieldset><legend className="font-black">Requested placement</legend><p className="mt-1 text-sm text-slate-500">Select a tier. SDTV will confirm the price before activation.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{placementOptions.map((option) => <label key={option.value} className={`cursor-pointer rounded-2xl border p-4 ${form.requested_placement === option.value ? "border-pink-500 bg-pink-50 ring-2 ring-pink-100" : "border-slate-200"}`}><input type="radio" name="placement" value={option.value} checked={form.requested_placement === option.value} onChange={() => setForm({ ...form, requested_placement: option.value })} className="mr-2"/><b>{option.title}</b><span className="mt-1 block text-sm text-slate-600">{option.detail}</span><span className="mt-2 block text-xs font-black uppercase text-pink-600">Price confirmed by SDTV</span></label>)}</div></fieldset>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="font-black">Offer image</p><p className="mt-1 text-sm text-slate-500">Recommended: landscape image, up to 5 MB. Hero requests should use a wide, high-quality image.</p>{form.image_url && <img src={form.image_url} alt="Offer preview" className="mt-3 aspect-video w-full rounded-xl border bg-white object-cover"/>}<input type="file" accept="image/*" disabled={uploading} onChange={(e) => void uploadImage(e.target.files?.[0])} className="mt-3 w-full rounded-xl border bg-white p-3"/><input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="Or paste a public image URL" className="mt-3 w-full rounded-xl border bg-white p-3"/></div>
        <label className="grid gap-1 font-bold">Offer code<input value={form.offer_code} onChange={(e) => setForm({ ...form, offer_code: e.target.value })} className="rounded-xl border p-3 font-normal"/></label><label className="grid gap-1 font-bold">Offer link<input value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} placeholder="https://..." className="rounded-xl border p-3 font-normal"/></label><label className="grid gap-1 font-bold">Terms<textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} className="min-h-20 rounded-xl border p-3 font-normal"/></label>
        <button onClick={submit} disabled={saving || uploading} className="rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-60">{uploading ? "Uploading image..." : saving ? "Submitting..." : "Submit Offer for Approval"}</button>
      </div>}
    </section><section className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Your Offers</h2>{loading ? <p className="mt-4">Loading...</p> : offers.length ? <div className="mt-5 grid gap-4">{offers.map((offer) => <article key={offer.id} className="rounded-2xl border p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-pink-600">{offer.local_businesses?.name}</p><h3 className="mt-1 text-xl font-black">{offer.title}</h3><p className="mt-2 text-sm text-slate-500">{offer.starts_at} – {offer.ends_at || "Ongoing"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize">{offer.status}</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs font-black"><span className="rounded-full bg-pink-50 px-3 py-1 capitalize">Requested: {offer.requested_placement}</span><span className="rounded-full bg-amber-50 px-3 py-1">Payment: {offer.payment_status}</span>{offer.quoted_price_cents != null && <span className="rounded-full bg-emerald-50 px-3 py-1">Quote: ${(offer.quoted_price_cents / 100).toFixed(2)}</span>}</div>{offer.image_url && <img src={offer.image_url} alt="" className="mt-4 h-36 w-full rounded-xl object-cover"/>}{["draft","pending","rejected"].includes(offer.status) && <button onClick={() => remove(offer.id)} className="mt-4 text-sm font-black text-red-600">Delete offer</button>}</article>)}</div> : <p className="mt-4 text-slate-500">No offers created yet.</p>}</section></div>
  </section><SiteFooter /></main>;
}

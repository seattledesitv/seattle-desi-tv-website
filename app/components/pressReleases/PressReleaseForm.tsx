"use client";
/* eslint-disable @next/next/no-img-element -- local upload previews use generated public URLs */
import { useState } from "react";
import type { PressReleaseInput, PressReleaseStatus } from "../../lib/pressReleases/types";

const blank = (): PressReleaseInput => ({
  title: "", summary: "", body: "", organization_name: "", location: "Seattle Area",
  release_date: new Date().toISOString().slice(0, 10), image_urls: [],
  contact_name: "", contact_email: "", source_url: "",
});

export default function PressReleaseForm({ saving, error, admin = false, onCreate, onUpload }: {
  saving: boolean; error: string; admin?: boolean;
  onCreate: (input: PressReleaseInput, status?: PressReleaseStatus) => Promise<unknown>;
  onUpload: (file: File) => Promise<string>;
}) {
  const [form, setForm] = useState(blank);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [publishNow, setPublishNow] = useState(admin);
  const set = (field: keyof PressReleaseInput, value: unknown) => setForm((current) => ({ ...current, [field]: value }));
  async function files(selected: FileList | null) {
    if (!selected) return;
    setUploading(true); setMessage("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(selected).slice(0, 12 - form.image_urls.length)) urls.push(await onUpload(file));
      set("image_urls", [...form.image_urls, ...urls]);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Images could not be uploaded."); }
    finally { setUploading(false); }
  }
  async function submit() {
    setMessage("");
    try {
      await onCreate(form, admin && publishNow ? "approved" : "pending");
      setForm(blank()); setMessage(admin && publishNow ? "Press release published." : "Press release submitted for SDTV review.");
    } catch {}
  }
  return <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
    <div className="grid gap-5 md:grid-cols-2">
      <label className="grid gap-1 font-bold md:col-span-2">Title *<input value={form.title} onChange={(e) => set("title", e.target.value)} className="rounded-xl border p-3 font-normal" /></label>
      <label className="grid gap-1 font-bold md:col-span-2">Short summary *<textarea value={form.summary} maxLength={600} onChange={(e) => set("summary", e.target.value)} className="min-h-24 rounded-xl border p-3 font-normal" /><span className="text-xs font-normal text-slate-500">{form.summary.length}/600 characters</span></label>
      <label className="grid gap-1 font-bold md:col-span-2">Full press release *<textarea value={form.body} onChange={(e) => set("body", e.target.value)} className="min-h-80 rounded-xl border p-4 font-normal leading-7" placeholder="Paste or write the complete press release here..." /></label>
      <label className="grid gap-1 font-bold">Organization<input value={form.organization_name || ""} onChange={(e) => set("organization_name", e.target.value)} className="rounded-xl border p-3 font-normal" /></label>
      <label className="grid gap-1 font-bold">Release date<input type="date" value={form.release_date} onChange={(e) => set("release_date", e.target.value)} className="rounded-xl border p-3 font-normal" /></label>
      <label className="grid gap-1 font-bold">Location<input value={form.location || ""} onChange={(e) => set("location", e.target.value)} className="rounded-xl border p-3 font-normal" /></label>
      <label className="grid gap-1 font-bold">Source URL<input type="url" value={form.source_url || ""} onChange={(e) => set("source_url", e.target.value)} placeholder="https://..." className="rounded-xl border p-3 font-normal" /></label>
      <label className="grid gap-1 font-bold">Media contact<input value={form.contact_name || ""} onChange={(e) => set("contact_name", e.target.value)} className="rounded-xl border p-3 font-normal" /></label>
      <label className="grid gap-1 font-bold">Contact email<input type="email" value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} className="rounded-xl border p-3 font-normal" /></label>
      <label className="grid gap-2 font-bold md:col-span-2">Images (up to 12)<input type="file" multiple accept="image/*" onChange={(e) => void files(e.target.files)} className="rounded-xl border p-3 font-normal" /></label>
      {form.image_urls.length > 0 && <div className="flex flex-wrap gap-3 md:col-span-2">{form.image_urls.map((url, index) => <div key={url} className="relative"><img src={url} alt={`Upload ${index + 1}`} className="h-24 w-32 rounded-xl object-cover"/><button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => set("image_urls", form.image_urls.filter((item) => item !== url))} className="absolute right-1 top-1 rounded-full bg-slate-950 px-2 py-1 text-xs font-black text-white">×</button></div>)}</div>}
      {admin && <label className="flex items-center gap-3 rounded-xl bg-pink-50 p-4 font-bold md:col-span-2"><input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />Publish immediately (otherwise send to moderation queue)</label>}
    </div>
    <button type="button" disabled={saving || uploading} onClick={() => void submit()} className="mt-6 w-full rounded-xl bg-pink-600 px-6 py-4 font-black text-white disabled:opacity-60">{uploading ? "Uploading images..." : saving ? "Saving..." : admin && publishNow ? "Publish Press Release" : "Submit for Review"}</button>
    {(error || message) && <p className={`mt-4 rounded-xl p-4 font-bold ${error ? "bg-red-50 text-red-900" : "bg-green-50 text-green-900"}`}>{error || message}</p>}
  </section>;
}

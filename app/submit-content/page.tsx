"use client";

import { useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function SubmitContentPage() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", title: "", content: "", imageUrl: "", videoUrl: "", sourceUrl: "" });

  function updateField(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitRequest() {
    setMessage("");
    if (!form.name.trim() || !form.email.trim() || !form.title.trim()) {
      setMessage("Please provide your name, email, and title.");
      return;
    }
    if (!form.content.trim() && !form.imageUrl.trim() && !form.videoUrl.trim() && !form.sourceUrl.trim()) {
      setMessage("Please provide text, an image URL, a video URL, or a source URL.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("public_content_requests").insert({
      submitter_name: form.name.trim(),
      submitter_email: form.email.trim().toLowerCase(),
      submitter_phone: form.phone.trim(),
      title: form.title.trim(),
      content_text: form.content.trim(),
      image_url: form.imageUrl.trim(),
      video_url: form.videoUrl.trim(),
      source_url: form.sourceUrl.trim(),
      requested_channels: ["Website", "Instagram", "YouTube"],
      status: "new",
    });
    if (error) setMessage(`Could not submit request: ${error.message}. Ask SDTV to confirm supabase/public-content-requests.sql was run.`);
    else {
      setMessage("Thank you. SDTV received your content request and our team will review it for publishing.");
      setForm({ name: "", email: "", phone: "", title: "", content: "", imageUrl: "", videoUrl: "", sourceUrl: "" });
    }
    setSaving(false);
  }

  return <main className="min-h-screen bg-slate-50 text-slate-950">
    <SiteHeader />
    <section className="bg-slate-950 px-6 py-14 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="font-black uppercase tracking-wide text-pink-300">Seattle Desi TV</p>
        <h1 className="mt-3 text-4xl font-black md:text-6xl">Submit Content to SDTV</h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">Share community updates, event highlights, images, or video links for SDTV to review for possible publishing.</p>
      </div>
    </section>
    <section className="mx-auto max-w-4xl px-6 py-10">
      <div className="rounded-3xl bg-white p-6 shadow-xl md:p-8">
        <h2 className="text-3xl font-black">Content Request</h2>
        <p className="mt-2 text-slate-600">Submission does not guarantee publication. SDTV may edit, decline, or request more information.</p>
        {message && <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 font-bold text-yellow-900">{message}</div>}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="font-bold">Your Name *<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.name} onChange={(e) => updateField("name", e.target.value)} /></label>
          <label className="font-bold">Email *<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.email} onChange={(e) => updateField("email", e.target.value)} /></label>
          <label className="font-bold">Phone<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} /></label>
          <label className="font-bold">Title *<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.title} onChange={(e) => updateField("title", e.target.value)} /></label>
        </div>
        <label className="mt-4 block font-bold">Text / Caption<textarea className="mt-1 min-h-36 w-full rounded-xl border p-3 font-normal" value={form.content} onChange={(e) => updateField("content", e.target.value)} /></label>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="font-bold">Image URL<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.imageUrl} onChange={(e) => updateField("imageUrl", e.target.value)} /></label>
          <label className="font-bold">Video URL<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.videoUrl} onChange={(e) => updateField("videoUrl", e.target.value)} /></label>
          <label className="font-bold">More Info URL<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.sourceUrl} onChange={(e) => updateField("sourceUrl", e.target.value)} /></label>
        </div>
        <button onClick={submitRequest} disabled={saving} className="mt-6 rounded-xl bg-pink-600 px-6 py-4 font-black text-white disabled:opacity-60">{saving ? "Submitting..." : "Submit to SDTV"}</button>
      </div>
    </section>
    <SiteFooter />
  </main>;
}

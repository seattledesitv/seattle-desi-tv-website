"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function EventMediaRequestPage({ params }: { params: { eventId: string } }) {
  const eventId = params.eventId;
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading event...");
  const [form, setForm] = useState({
    source_url: "",
    platform: "Google Drive",
    contact_name: "",
    contact_email: "",
    notes: "",
  });

  function updateField(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function loadEvent() {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,location,poc_email")
      .eq("id", eventId)
      .maybeSingle();
    if (error || !data) {
      setEvent(null);
      setMessage(error?.message || "We could not find this event.");
    } else {
      setEvent(data);
      setForm((current) => ({ ...current, contact_email: data.poc_email || "" }));
      setMessage("");
    }
    setLoading(false);
  }

  async function submitMedia() {
    setMessage("");
    if (!form.source_url.trim()) {
      setMessage("Please provide a Google Drive, Dropbox, OneDrive, WeTransfer, or other folder link.");
      return;
    }
    setSaving(true);
    const payload = {
      event_id: eventId,
      source_type: "organizer_media",
      status: "available",
      source_url: form.source_url.trim(),
      platform: form.platform.trim(),
      contact_name: form.contact_name.trim(),
      contact_email: form.contact_email.trim(),
      notes: form.notes.trim(),
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("event_coverage_sources").insert(payload);
    if (error) {
      setMessage(`Could not submit media link: ${error.message}. Please contact SDTV if this continues.`);
    } else {
      setMessage("Thank you. SDTV has received the media folder link and can now review it for editing/publishing.");
      setForm((current) => ({ ...current, source_url: "", notes: "" }));
    }
    setSaving(false);
  }

  useEffect(() => { loadEvent(); }, [eventId]);

  return <main className="min-h-screen bg-slate-950 text-white">
    <SiteHeader />
    <section className="px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 text-slate-950 shadow-2xl md:p-8">
        <p className="font-black uppercase tracking-wide text-pink-600">Seattle Desi TV</p>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">Provide Event Media</h1>
        <p className="mt-2 text-slate-600">Share your event photos/videos folder so SDTV can review the content and assign it to editing if coverage crew was not available.</p>

        {loading && <div className="mt-6 rounded-2xl bg-slate-100 p-5 font-bold">{message}</div>}
        {!loading && message && <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 font-bold text-yellow-900">{message}</div>}

        {!loading && event && <div className="mt-6 grid gap-5">
          <div className="rounded-2xl bg-slate-50 p-5">
            <h2 className="text-2xl font-black">{event.title}</h2>
            <p className="mt-1 text-slate-600">{event.date || "Date TBD"}{event.location ? ` · ${event.location}` : ""}</p>
          </div>

          <label className="font-bold">Folder Link *
            <input className="mt-1 w-full rounded-xl border p-3 font-normal" placeholder="https://drive.google.com/..." value={form.source_url} onChange={(e) => updateField("source_url", e.target.value)} />
          </label>

          <label className="font-bold">Platform
            <select className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.platform} onChange={(e) => updateField("platform", e.target.value)}>
              <option>Google Drive</option>
              <option>Dropbox</option>
              <option>OneDrive</option>
              <option>WeTransfer</option>
              <option>Box</option>
              <option>Other</option>
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="font-bold">Contact Name
              <input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.contact_name} onChange={(e) => updateField("contact_name", e.target.value)} />
            </label>
            <label className="font-bold">Contact Email
              <input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.contact_email} onChange={(e) => updateField("contact_email", e.target.value)} />
            </label>
          </div>

          <label className="font-bold">Notes for SDTV Editor
            <textarea className="mt-1 min-h-28 w-full rounded-xl border p-3 font-normal" placeholder="Example: Highlight videos are in /videos, photos are in /photos, please credit photographer..." value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
          </label>

          <button onClick={submitMedia} disabled={saving} className="rounded-xl bg-pink-600 px-6 py-4 font-black text-white disabled:opacity-60">{saving ? "Submitting..." : "Submit Media Folder"}</button>
        </div>}
      </div>
    </section>
    <SiteFooter />
  </main>;
}

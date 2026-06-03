"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().trim().includes("admin");
}

function emptyForm() {
  return {
    title: "",
    date: "",
    location: "",
    description: "",
    image: "",
    ticket_url: "",
    poc_email: "",
    poc_phone: "",
    status: "pending",
    approved: false,
  };
}

export default function EventEditPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [form, setForm] = useState(emptyForm());

  const canAccess = Boolean(user && roleContainsAdmin(role));
  const cloudinaryReady = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);

  async function loadEvent() {
    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,location,description,image,ticket_url,poc_email,poc_phone,status,approved")
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      setActionMessage(`Could not load event: ${error.message}`);
      return;
    }

    if (!data) {
      setActionMessage("Event not found.");
      return;
    }

    setForm({
      title: data.title || "",
      date: data.date || "",
      location: data.location || "",
      description: data.description || "",
      image: data.image || "",
      ticket_url: data.ticket_url || "",
      poc_email: data.poc_email || "",
      poc_phone: data.poc_phone || "",
      status: data.status || "pending",
      approved: Boolean(data.approved),
    });
  }

  async function init() {
    setLoading(true);
    setMessage("Checking access...");

    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);

    if (!currentUser) {
      setRole("");
      setMessage("Please login to edit events.");
      setLoading(false);
      return;
    }

    const adminResult = await supabase
      .from("admins")
      .select("role")
      .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
      .maybeSingle();

    const nextRole = adminResult.data?.role || "";
    setRole(nextRole);

    if (!roleContainsAdmin(nextRole)) {
      setMessage("You are logged in, but this account does not have admin access.");
      setLoading(false);
      return;
    }

    await loadEvent();
    setMessage("");
    setLoading(false);
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!cloudinaryReady) {
      setActionMessage("Cloudinary is not configured. Image URL still works.");
      return;
    }

    setUploadingImage(true);
    setActionMessage("Uploading image...");

    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      uploadForm.append("folder", "seattle-desi-tv/events");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: uploadForm });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Upload failed.");

      setForm((current) => ({ ...current, image: result.secure_url }));
      setActionMessage("Image uploaded. Save changes to keep it.");
    } catch (error: any) {
      setActionMessage(`Image upload failed: ${error?.message || String(error)}`);
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function saveEvent() {
    if (!form.title.trim()) {
      setActionMessage("Event title is required.");
      return;
    }

    setSaving(true);
    setActionMessage("Saving event...");

    const approved = form.status === "approved" || form.approved;
    const payload: any = {
      title: form.title.trim(),
      date: form.date || null,
      location: form.location.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
      ticket_url: form.ticket_url.trim(),
      poc_email: form.poc_email.trim(),
      poc_phone: form.poc_phone.trim(),
      status: form.status || "pending",
      approved,
    };

    if (approved) {
      payload.approved_by = user?.email || user?.id || null;
      payload.approved_at = new Date().toISOString();
    }

    const { error } = await supabase.from("events").update(payload).eq("id", params.id);
    if (error) {
      setActionMessage(`Save failed: ${error.message}`);
      setSaving(false);
      return;
    }

    setActionMessage("Event saved.");
    setSaving(false);
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <a href="/studio/events" className="text-pink-300 font-bold">← Back to Events</a>
        <h1 className="text-4xl md:text-5xl font-black mt-3 mb-2">Edit Event</h1>
        <p className="text-slate-300 mb-8">{user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Event editor"}</p>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}

        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Access Required</h2><p className="text-gray-600 mt-3">{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}

        {!loading && canAccess && (
          <section className="bg-white text-slate-950 rounded-2xl p-6 space-y-5">
            {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-xl p-4 font-bold">{actionMessage}</div>}

            <div className="grid md:grid-cols-2 gap-4">
              <label className="grid gap-2 text-sm font-bold">Event Title<input className="border rounded-lg p-3 font-normal" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label className="grid gap-2 text-sm font-bold">Date<input type="date" className="border rounded-lg p-3 font-normal" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              <label className="grid gap-2 text-sm font-bold md:col-span-2">Location<input className="border rounded-lg p-3 font-normal" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
              <label className="grid gap-2 text-sm font-bold md:col-span-2">Description<textarea className="border rounded-lg p-3 font-normal min-h-32" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label className="grid gap-2 text-sm font-bold">Ticket URL<input className="border rounded-lg p-3 font-normal" value={form.ticket_url} onChange={(e) => setForm({ ...form, ticket_url: e.target.value })} /></label>
              <label className="grid gap-2 text-sm font-bold">Status<select className="border rounded-lg p-3 font-normal" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value, approved: e.target.value === "approved" })}><option value="pending">pending</option><option value="approved">approved</option><option value="on_hold">on_hold</option><option value="rejected">rejected</option></select></label>
              <label className="grid gap-2 text-sm font-bold">POC Email<input className="border rounded-lg p-3 font-normal" value={form.poc_email} onChange={(e) => setForm({ ...form, poc_email: e.target.value })} /></label>
              <label className="grid gap-2 text-sm font-bold">POC Phone<input className="border rounded-lg p-3 font-normal" value={form.poc_phone} onChange={(e) => setForm({ ...form, poc_phone: e.target.value })} /></label>
            </div>

            <div className="grid gap-2 text-sm font-bold">
              Image
              <input type="file" accept="image/*" onChange={uploadImage} disabled={uploadingImage} className="border rounded-lg p-3 font-normal" />
              <input className="border rounded-lg p-3 font-normal" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Or paste image URL" />
              {form.image && <img src={form.image} alt="Event preview" className="w-48 h-48 object-cover rounded-xl border" />}
              {!cloudinaryReady && <p className="text-xs text-orange-600">Cloudinary upload is not configured; image URL still works.</p>}
            </div>

            <button onClick={saveEvent} disabled={saving || uploadingImage} className="bg-pink-600 text-white px-6 py-3 rounded-xl font-black disabled:opacity-60">{saving ? "Saving..." : "Save Event"}</button>
          </section>
        )}
      </div>
    </main>
  );
}

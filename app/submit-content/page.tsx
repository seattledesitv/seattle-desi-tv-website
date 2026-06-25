"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function SubmitContentPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("Checking account...");
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "", profileNotes: "", title: "", content: "", imageUrl: "", videoUrl: "", sourceUrl: "" });

  function updateField(field: string, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user || null;
      setUser(currentUser);
      if (!currentUser?.email) { setMessage("Please sign in before submitting content."); setLoading(false); return; }
      let nextName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email.split("@")[0] || "";
      let nextPhone = "";
      let nextCity = "";
      const { data: profile } = await supabase.from("user_profiles").select("full_name,email").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).limit(1).maybeSingle();
      if (profile?.full_name) nextName = profile.full_name;
      const { data: onboarding } = await supabase.from("volunteer_onboarding_submissions").select("full_name,phone,city").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (onboarding?.full_name) nextName = onboarding.full_name;
      if (onboarding?.phone) nextPhone = onboarding.phone;
      if (onboarding?.city) nextCity = onboarding.city;
      setForm((current) => ({ ...current, name: current.name || nextName, email: currentUser.email, phone: current.phone || nextPhone, city: current.city || nextCity }));
      setMessage("");
      setLoading(false);
    }
    init();
  }, []);

  async function uploadImage(file?: File) {
    setMessage("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Please choose an image file."); return; }
    if (!cloudName || !uploadPreset) { setMessage("Image upload is not configured yet. Paste an image URL instead."); return; }
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", uploadPreset);
    body.append("folder", "sdtv/public-submissions");
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Upload failed.");
      updateField("imageUrl", result.secure_url);
      setMessage("Image uploaded. Submit when ready.");
    } catch (error: any) { setMessage(error?.message || "Image upload failed. Paste an image URL instead."); }
    finally { setUploading(false); }
  }

  async function submitRequest() {
    setMessage("");
    if (!user?.id || !user?.email) { setMessage("Please sign in before submitting content."); return; }
    if (!form.name.trim() || !form.title.trim()) { setMessage("Please provide your name and title."); return; }
    if (!form.content.trim() && !form.imageUrl.trim() && !form.videoUrl.trim() && !form.sourceUrl.trim()) { setMessage("Please provide text, an image, a video URL, or a source URL."); return; }
    setSaving(true);
    const { error } = await supabase.from("public_content_requests").insert({
      submitter_user_id: user.id,
      submitter_name: form.name.trim(),
      submitter_email: user.email.toLowerCase(),
      submitter_phone: form.phone.trim(),
      submitter_city: form.city.trim(),
      submitter_profile_notes: form.profileNotes.trim(),
      title: form.title.trim(),
      content_text: form.content.trim(),
      image_url: form.imageUrl.trim(),
      video_url: form.videoUrl.trim(),
      source_url: form.sourceUrl.trim(),
      requested_channels: ["Website", "Instagram", "YouTube"],
      status: "new",
    });
    if (error) setMessage(`Could not submit request: ${error.message}.`);
    else { setMessage("Thank you. SDTV received your news/content request."); setForm((current) => ({ ...current, title: "", content: "", imageUrl: "", videoUrl: "", sourceUrl: "" })); }
    setSaving(false);
  }

  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader /><section className="bg-slate-950 px-6 py-14 text-white"><div className="mx-auto max-w-5xl"><p className="font-black uppercase tracking-wide text-pink-300">Seattle Desi TV</p><h1 className="mt-3 text-4xl font-black md:text-6xl">Submit News or Announcements to SDTV</h1><p className="mt-4 max-w-3xl text-lg text-slate-300">Share community news, announcements, photos, videos, event highlights, or public-interest updates for possible publication across SDTV media channels and community reach.</p></div></section><section className="mx-auto max-w-4xl px-6 py-10">{loading && <div className="rounded-3xl bg-white p-8 shadow-xl font-bold">{message}</div>}{!loading && !user?.id && <div className="rounded-3xl bg-white p-8 shadow-xl"><h2 className="text-3xl font-black">Sign in required</h2><p className="mt-2 text-slate-600">Please sign in before submitting news or content so SDTV can safely track your request and contact you if needed.</p><a href="/login?next=/submit-content" className="mt-6 inline-flex rounded-xl bg-pink-600 px-6 py-4 font-black text-white">Sign in to Submit Content</a></div>}{!loading && user?.id && <div className="rounded-3xl bg-white p-6 shadow-xl md:p-8"><h2 className="text-3xl font-black">News / Content Request</h2><p className="mt-2 text-slate-600">Use this form for community news, announcements, photos, video links, event highlights, or content you would like SDTV to review for publishing. Submission does not guarantee publication.</p><p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">Signed in as {user.email}. Your email is captured automatically.</p>{message && <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 font-bold text-yellow-900">{message}</div>}<div className="mt-6 grid gap-4 md:grid-cols-2"><label className="font-bold">Your Name *<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.name} onChange={(e) => updateField("name", e.target.value)} /></label><label className="font-bold">Email<input disabled className="mt-1 w-full rounded-xl border bg-slate-100 p-3 font-normal" value={form.email} /></label><label className="font-bold">Phone<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} /></label><label className="font-bold">City / Area<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.city} onChange={(e) => updateField("city", e.target.value)} /></label><label className="font-bold md:col-span-2">Optional Profile Details<input className="mt-1 w-full rounded-xl border p-3 font-normal" placeholder="Organization, role, community group, or connection to this submission" value={form.profileNotes} onChange={(e) => updateField("profileNotes", e.target.value)} /></label><label className="font-bold md:col-span-2">Title / Headline *<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.title} onChange={(e) => updateField("title", e.target.value)} /></label></div><label className="mt-4 block font-bold">News / Announcement / Caption<textarea className="mt-1 min-h-36 w-full rounded-xl border p-3 font-normal" value={form.content} onChange={(e) => updateField("content", e.target.value)} /></label><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="font-bold">Upload Image<input type="file" accept="image/*" className="mt-1 w-full rounded-xl border p-3 font-normal" onChange={(e) => uploadImage(e.target.files?.[0])} /></label><label className="font-bold">Image URL<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.imageUrl} onChange={(e) => updateField("imageUrl", e.target.value)} /></label><label className="font-bold">Video URL<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.videoUrl} onChange={(e) => updateField("videoUrl", e.target.value)} /></label><label className="font-bold">More Info URL<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.sourceUrl} onChange={(e) => updateField("sourceUrl", e.target.value)} /></label></div><button onClick={submitRequest} disabled={saving || uploading} className="mt-6 rounded-xl bg-pink-600 px-6 py-4 font-black text-white disabled:opacity-60">{uploading ? "Uploading..." : saving ? "Submitting..." : "Submit to SDTV"}</button></div>}</section><SiteFooter /></main>;
}

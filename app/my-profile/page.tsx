"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const interestOptions = ["Events", "Culture", "Business", "Community News", "Photography", "Videography", "Writing", "Volunteering", "Influencer", "Sponsor", "Advertiser"];

export default function MyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("Loading profile...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [form, setForm] = useState<any>({ full_name: "", preferred_name: "", phone: "", email: "", city: "", state: "", country: "", short_bio: "", profile_photo_url: "", instagram_url: "", facebook_url: "", linkedin_url: "", website_url: "", youtube_url: "", interests: [], show_name_publicly: false, allow_social_credit: true, allow_sdtv_contact: true, keep_profile_private: true });

  function updateField(field: string, value: any) { setForm((current: any) => ({ ...current, [field]: value })); }
  function toggleInterest(value: string) { setForm((current: any) => ({ ...current, interests: current.interests?.includes(value) ? current.interests.filter((item: string) => item !== value) : [...(current.interests || []), value] })); }

  async function loadProfile() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser?.email) { setMessage("Please login to edit your SDTV profile."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    const fallbackName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email.split("@")[0] || "";
    const { data: profile, error } = await supabase.from("user_profiles").select("*").eq("user_id", currentUser.id).maybeSingle();
    if (error) { setMessage(`Could not load profile: ${error.message}. Run supabase/public-user-profile.sql.`); setLoading(false); return; }
    setForm((current: any) => ({ ...current, ...(profile || {}), full_name: profile?.full_name || fallbackName, email: currentUser.email, role: nextRole, interests: profile?.interests || [] }));
    setMessage(profile ? "" : "Set up your SDTV profile. These details are optional, but help SDTV contact and credit you correctly.");
    setLoading(false);
  }

  async function uploadPhoto(file?: File) {
    setMessage("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Please upload an image file."); return; }
    if (!cloudName || !uploadPreset) { setMessage("Image upload is not configured. Paste a public image URL instead."); return; }
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", uploadPreset);
    body.append("folder", "sdtv/user-profiles");
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Upload failed.");
      updateField("profile_photo_url", result.secure_url);
      setMessage("Photo uploaded. Click Save Profile to keep it.");
    } catch (error: any) { setMessage(error?.message || "Photo upload failed. Paste an image URL instead."); }
    finally { setUploading(false); }
  }

  async function saveProfile() {
    if (!user?.id || !user?.email) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("user_profiles").upsert({ user_id: user.id, email: user.email, role, full_name: form.full_name || null, preferred_name: form.preferred_name || null, phone: form.phone || null, city: form.city || null, state: form.state || null, country: form.country || null, short_bio: form.short_bio || null, profile_photo_url: form.profile_photo_url || null, instagram_url: form.instagram_url || null, facebook_url: form.facebook_url || null, linkedin_url: form.linkedin_url || null, website_url: form.website_url || null, youtube_url: form.youtube_url || null, interests: form.interests || [], show_name_publicly: Boolean(form.show_name_publicly), allow_social_credit: Boolean(form.allow_social_credit), allow_sdtv_contact: Boolean(form.allow_sdtv_contact), keep_profile_private: Boolean(form.keep_profile_private), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setMessage(error ? `Could not save profile: ${error.message}. Run supabase/public-user-profile.sql.` : "Profile saved.");
    setSaving(false);
  }

  useEffect(() => { loadProfile(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader /><section className="mx-auto max-w-5xl px-6 py-10"><div className="mb-8"><p className="font-black uppercase tracking-wide text-pink-300">My SDTV</p><h1 className="mt-2 text-4xl font-black md:text-5xl">My Profile</h1><p className="mt-2 text-slate-300">Your base SDTV profile. This is available to every logged-in user.</p></div>{loading && <div className="rounded-3xl bg-white/10 p-6">{message}</div>}{!loading && !user?.id && <div className="rounded-3xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Login required</h2><p className="mt-2 text-slate-600">Please login to create or edit your SDTV profile.</p><a href="/login?next=/my-profile" className="mt-5 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Login</a></div>}{!loading && user?.id && <div className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl md:p-8">{message && <div className="mb-5 rounded-2xl bg-yellow-50 p-4 font-bold text-yellow-900">{message}</div>}<div className="grid gap-5 md:grid-cols-[180px_1fr]"><div><div className="grid h-36 w-36 place-items-center overflow-hidden rounded-full bg-slate-100 text-4xl font-black text-pink-600">{form.profile_photo_url ? <img src={form.profile_photo_url} alt="Profile" className="h-full w-full object-cover" /> : (form.full_name || user.email || "S").slice(0,1).toUpperCase()}</div><label className="mt-4 block text-sm font-bold">Upload Photo<input type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files?.[0])} className="mt-2 w-full rounded-xl border p-2 text-xs" /></label><input value={form.profile_photo_url || ""} onChange={(e) => updateField("profile_photo_url", e.target.value)} placeholder="Photo URL" className="mt-3 w-full rounded-xl border p-2 text-xs" /></div><div className="grid gap-4 md:grid-cols-2"><label className="font-bold">Full Name<input value={form.full_name || ""} onChange={(e) => updateField("full_name", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Preferred Display Name<input value={form.preferred_name || ""} onChange={(e) => updateField("preferred_name", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Email<input disabled value={form.email || ""} className="mt-1 w-full rounded-xl border bg-slate-100 p-3 font-normal text-slate-600" /></label><label className="font-bold">Phone<input value={form.phone || ""} onChange={(e) => updateField("phone", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">City<input value={form.city || ""} onChange={(e) => updateField("city", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">State<input value={form.state || ""} onChange={(e) => updateField("state", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold md:col-span-2">Short Bio<textarea value={form.short_bio || ""} onChange={(e) => updateField("short_bio", e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal" /></label></div></div><div className="mt-6 grid gap-4 md:grid-cols-2"><input value={form.instagram_url || ""} onChange={(e) => updateField("instagram_url", e.target.value)} placeholder="Instagram URL" className="rounded-xl border p-3" /><input value={form.linkedin_url || ""} onChange={(e) => updateField("linkedin_url", e.target.value)} placeholder="LinkedIn URL" className="rounded-xl border p-3" /><input value={form.facebook_url || ""} onChange={(e) => updateField("facebook_url", e.target.value)} placeholder="Facebook URL" className="rounded-xl border p-3" /><input value={form.website_url || ""} onChange={(e) => updateField("website_url", e.target.value)} placeholder="Website URL" className="rounded-xl border p-3" /></div><div className="mt-6"><p className="font-black">Interests</p><div className="mt-3 flex flex-wrap gap-2">{interestOptions.map((item) => <button key={item} type="button" onClick={() => toggleInterest(item)} className={`rounded-xl px-3 py-2 text-sm font-black ${form.interests?.includes(item) ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-700"}`}>{item}</button>)}</div></div><div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm"><label><input type="checkbox" checked={Boolean(form.show_name_publicly)} onChange={(e) => updateField("show_name_publicly", e.target.checked)} /> Show my name publicly when SDTV publishes my content</label><label><input type="checkbox" checked={Boolean(form.allow_social_credit)} onChange={(e) => updateField("allow_social_credit", e.target.checked)} /> Credit me on SDTV social posts when appropriate</label><label><input type="checkbox" checked={Boolean(form.allow_sdtv_contact)} onChange={(e) => updateField("allow_sdtv_contact", e.target.checked)} /> Allow SDTV to contact me about submissions or opportunities</label><label><input type="checkbox" checked={Boolean(form.keep_profile_private)} onChange={(e) => updateField("keep_profile_private", e.target.checked)} /> Keep my profile private unless I explicitly agree to public credit</label></div><button onClick={saveProfile} disabled={saving || uploading} className="mt-6 rounded-xl bg-pink-600 px-6 py-4 font-black text-white disabled:opacity-60">{uploading ? "Uploading..." : saving ? "Saving..." : "Save Profile"}</button></div>}</section><SiteFooter /></main>;
}

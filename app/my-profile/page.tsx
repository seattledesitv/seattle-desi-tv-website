"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const interestOptions = ["Events", "Culture", "Business", "Community News", "Photography", "Videography", "Writing", "Volunteering", "Influencer", "Sponsor", "Advertiser"];
type VisibilityMode = "private" | "credit" | "public";
type Tab = "profile" | "connected" | "social" | "interests" | "privacy";

function label(value?: string | null) { return String(value || "").replaceAll("_", " ") || "—"; }
function visibilityModeFromProfile(profile: any): VisibilityMode { if (profile?.keep_profile_private === false && (profile?.show_name_publicly || profile?.allow_social_credit)) return "public"; if (profile?.show_name_publicly || profile?.allow_social_credit) return "credit"; return "private"; }
function applyVisibilityMode(mode: VisibilityMode) { if (mode === "public") return { keep_profile_private: false, show_name_publicly: true, allow_social_credit: true }; if (mode === "credit") return { keep_profile_private: true, show_name_publicly: true, allow_social_credit: true }; return { keep_profile_private: true, show_name_publicly: false, allow_social_credit: false }; }
function visibilityLabel(mode: VisibilityMode) { if (mode === "public") return "Public Profile"; if (mode === "credit") return "Credit OK"; return "Private Profile"; }
function visibilityDescription(mode: VisibilityMode) { if (mode === "public") return "SDTV may show your profile publicly where appropriate."; if (mode === "credit") return "Your profile remains private, but SDTV may credit your name for your content."; return "Used internally only. Do not show my name/profile publicly by default."; }

function connectedSummary(item: any) {
  const r = item.row || {};
  if (item.kind === "influencer") return [r.status && `Status: ${label(r.status)}`, r.niche && `Niche: ${r.niche}`, r.city && `City: ${r.city}`].filter(Boolean);
  if (item.kind === "team") return [r.title && `Title: ${r.title}`, r.show_on_public_team !== undefined && `Public team page: ${r.show_on_public_team ? "Yes" : "No"}`].filter(Boolean);
  if (item.kind === "radio") return [r.title && `Title: ${r.title}`, r.segment_name && `Segment: ${r.segment_name}`].filter(Boolean);
  if (item.kind === "volunteer") return [r.status && `Status: ${label(r.status)}`, r.phone && `Phone: ${r.phone}`, r.city && `City: ${r.city}`].filter(Boolean);
  if (item.kind === "content") return [r.status && `Latest status: ${label(r.status)}`, r.title && `Latest: ${r.title}`].filter(Boolean);
  return [r.role && `Role: ${label(r.role)}`].filter(Boolean);
}

export default function MyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("Loading profile...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("private");
  const [connectedProfiles, setConnectedProfiles] = useState<any[]>([]);
  const [selectedConnected, setSelectedConnected] = useState<any>(null);
  const [connectedEdit, setConnectedEdit] = useState<any>({});
  const [form, setForm] = useState<any>({ full_name: "", preferred_name: "", phone: "", email: "", city: "", state: "", country: "", short_bio: "", profile_photo_url: "", instagram_url: "", facebook_url: "", linkedin_url: "", website_url: "", youtube_url: "", interests: [], show_name_publicly: false, allow_social_credit: false, allow_sdtv_contact: true, keep_profile_private: true });

  function updateField(field: string, value: any) { setForm((current: any) => ({ ...current, [field]: value })); }
  function updateConnected(field: string, value: any) { setConnectedEdit((current: any) => ({ ...current, [field]: value })); }
  function toggleInterest(value: string) { setForm((current: any) => ({ ...current, interests: current.interests?.includes(value) ? current.interests.filter((item: string) => item !== value) : [...(current.interests || []), value] })); }
  function setMode(mode: VisibilityMode) { setVisibilityMode(mode); setForm((current: any) => ({ ...current, ...applyVisibilityMode(mode) })); }
  function selectConnected(item: any) { setSelectedConnected(item); setConnectedEdit(item?.row || {}); }

  async function safeSingle(kind: string, title: string, query: any, statusField = "status") {
    const result = await query;
    if (result.error || !result.data) return null;
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row) return null;
    return { kind, title, row, status: row[statusField] || row.role || row.title || "active" };
  }

  async function loadConnectedProfiles(currentUser: any) {
    const email = currentUser.email;
    const id = currentUser.id;
    const items = await Promise.all([
      safeSingle("base", "Base SDTV Profile", supabase.from("user_profiles").select("*").or(`user_id.eq.${id},email.eq.${email}`).limit(1).maybeSingle(), "role"),
      safeSingle("team", "Team Profile", supabase.from("team_members").select("*").or(`user_id.eq.${id},email.eq.${email}`).limit(1).maybeSingle(), "title"),
      safeSingle("radio", "Radio Profile", supabase.from("radio_team_members").select("*").or(`user_id.eq.${id},email.eq.${email}`).limit(1).maybeSingle(), "segment_name"),
      safeSingle("volunteer", "Volunteer Onboarding", supabase.from("volunteer_onboarding_submissions").select("*").or(`user_id.eq.${id},email.eq.${email}`).order("created_at", { ascending: false }).limit(1).maybeSingle(), "status"),
      safeSingle("influencer", "Influencer Profile", supabase.from("influencer_profiles").select("*").or(`user_id.eq.${id},email.eq.${email}`).limit(1).maybeSingle(), "status"),
      safeSingle("content", "Public Content Submissions", supabase.from("public_content_requests").select("*").or(`submitter_user_id.eq.${id},submitter_email.eq.${email}`).order("created_at", { ascending: false }).limit(1).maybeSingle(), "status"),
    ]);
    const clean = items.filter(Boolean);
    setConnectedProfiles(clean);
    if (selectedConnected) {
      const updated = clean.find((item: any) => item.kind === selectedConnected.kind);
      if (updated) selectConnected(updated);
    }
  }

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
    const mode = visibilityModeFromProfile(profile);
    setVisibilityMode(mode);
    setForm((current: any) => ({ ...current, ...(profile || {}), ...applyVisibilityMode(mode), full_name: profile?.full_name || fallbackName, email: currentUser.email, role: nextRole, interests: profile?.interests || [] }));
    await loadConnectedProfiles(currentUser);
    setMessage(profile ? "" : "Set up your SDTV profile. These details are optional, but help SDTV contact and credit you correctly.");
    setLoading(false);
  }

  async function uploadPhoto(file?: File) {
    setMessage(""); if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Please upload an image file."); return; }
    if (!cloudName || !uploadPreset) { setMessage("Image upload is not configured. Paste a public image URL instead."); return; }
    setUploading(true);
    const body = new FormData(); body.append("file", file); body.append("upload_preset", uploadPreset); body.append("folder", "sdtv/user-profiles");
    try { const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body }); const result = await response.json(); if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Upload failed."); updateField("profile_photo_url", result.secure_url); setMessage("Photo uploaded. Click Save Profile to keep it."); }
    catch (error: any) { setMessage(error?.message || "Photo upload failed. Paste an image URL instead."); } finally { setUploading(false); }
  }

  async function saveProfile() {
    if (!user?.id || !user?.email) return;
    setSaving(true); setMessage(""); const visibility = applyVisibilityMode(visibilityMode);
    const { error } = await supabase.from("user_profiles").upsert({ user_id: user.id, email: user.email, role, full_name: form.full_name || null, preferred_name: form.preferred_name || null, phone: form.phone || null, city: form.city || null, state: form.state || null, country: form.country || null, short_bio: form.short_bio || null, profile_photo_url: form.profile_photo_url || null, instagram_url: form.instagram_url || null, facebook_url: form.facebook_url || null, linkedin_url: form.linkedin_url || null, website_url: form.website_url || null, youtube_url: form.youtube_url || null, interests: form.interests || [], ...visibility, allow_sdtv_contact: Boolean(form.allow_sdtv_contact), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setMessage(error ? `Could not save profile: ${error.message}. Run supabase/public-user-profile.sql.` : "Profile saved."); await loadConnectedProfiles(user); setSaving(false);
  }

  async function saveConnectedProfile() {
    if (!selectedConnected) return;
    setSaving(true); setMessage("");
    const tableMap: any = { team: "team_members", radio: "radio_team_members", volunteer: "volunteer_onboarding_submissions", influencer: "influencer_profiles" };
    const table = tableMap[selectedConnected.kind];
    if (!table) { setMessage("This connected record is read-only here. Update it through the main profile fields above."); setSaving(false); return; }
    const allowedByKind: any = {
      team: ["name", "title", "image"],
      radio: ["name", "title", "segment_name", "image"],
      volunteer: ["full_name", "phone", "city", "photo_url"],
      influencer: ["full_name", "city", "bio", "photo_url", "instagram_url", "tiktok_url", "youtube_url", "website_url", "niche", "follower_count"],
    };
    const payload: any = { updated_at: new Date().toISOString() };
    allowedByKind[selectedConnected.kind].forEach((key: string) => { if (connectedEdit[key] !== undefined) payload[key] = connectedEdit[key] || null; });
    const id = selectedConnected.row.id;
    const { error } = await supabase.from(table).update(payload).eq("id", id);
    setMessage(error ? `Could not update ${selectedConnected.title}: ${error.message}` : `${selectedConnected.title} updated.`);
    await loadConnectedProfiles(user);
    setSaving(false);
  }

  useEffect(() => { loadProfile(); }, []);
  const completeness = useMemo(() => { const fields = [form.full_name, form.phone, form.city, form.short_bio, form.profile_photo_url, form.interests?.length ? "interests" : ""]; return Math.round((fields.filter(Boolean).length / fields.length) * 100); }, [form]);
  const tabs: Tab[] = ["profile", "connected", "social", "interests", "privacy"];

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader /><section className="mx-auto max-w-6xl px-6 py-10"><div className="mb-8"><p className="font-black uppercase tracking-wide text-pink-300">My SDTV</p><h1 className="mt-2 text-4xl font-black md:text-5xl">My Profile</h1><p className="mt-2 text-slate-300">Centrally manage your SDTV identity, connected role profiles, contact details, interests, social links, and public visibility.</p></div>{loading && <div className="rounded-3xl bg-white/10 p-6">{message}</div>}{!loading && !user?.id && <div className="rounded-3xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Login required</h2><p className="mt-2 text-slate-600">Please login to create or edit your SDTV profile.</p><a href="/login?next=/my-profile" className="mt-5 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Login</a></div>}{!loading && user?.id && <div className="grid gap-5 lg:grid-cols-[340px_1fr]"><aside className="rounded-[2rem] bg-white p-6 text-slate-950 shadow-xl"><div className="grid place-items-center text-center"><div className="grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-slate-100 text-4xl font-black text-pink-600">{form.profile_photo_url ? <img src={form.profile_photo_url} alt="Profile" className="h-full w-full object-cover" /> : (form.full_name || user.email || "S").slice(0,1).toUpperCase()}</div><h2 className="mt-4 text-2xl font-black">{form.full_name || "Your Profile"}</h2><p className="text-sm font-bold text-slate-500">{form.email}</p><span className="mt-3 rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-700">{visibilityLabel(visibilityMode)}</span></div><div className="mt-6 grid gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-black">{completeness}%</p><p className="text-xs font-bold text-slate-500">Profile completeness</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-black">Current role</p><p className="mt-1 text-sm text-slate-600">{String(role).replaceAll("_", " ")}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-black">{connectedProfiles.length}</p><p className="text-xs font-bold text-slate-500">Connected profiles</p></div><label className="block text-sm font-bold">Upload Photo<input type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files?.[0])} className="mt-2 w-full rounded-xl border p-2 text-xs" /></label></div></aside><section className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-xl md:p-8">{message && <div className="mb-5 rounded-2xl bg-yellow-50 p-4 font-bold text-yellow-900">{message}</div>}<div className="flex flex-wrap gap-2">{tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-sm font-black ${activeTab === tab ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-700"}`}>{tab === "profile" ? "Profile" : tab === "connected" ? "Connected Profiles" : tab === "social" ? "Social" : tab === "interests" ? "Interests" : "Privacy"}</button>)}</div>{activeTab === "profile" && <div className="mt-6 grid gap-4 md:grid-cols-2"><label className="font-bold">Full Name<input value={form.full_name || ""} onChange={(e) => updateField("full_name", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Preferred Display Name<input value={form.preferred_name || ""} onChange={(e) => updateField("preferred_name", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Email<input disabled value={form.email || ""} className="mt-1 w-full rounded-xl border bg-slate-100 p-3 font-normal text-slate-600" /></label><label className="font-bold">Phone<input value={form.phone || ""} onChange={(e) => updateField("phone", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">City<input value={form.city || ""} onChange={(e) => updateField("city", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">State<input value={form.state || ""} onChange={(e) => updateField("state", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold md:col-span-2">Photo URL<input value={form.profile_photo_url || ""} onChange={(e) => updateField("profile_photo_url", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold md:col-span-2">Short Bio<textarea value={form.short_bio || ""} onChange={(e) => updateField("short_bio", e.target.value)} className="mt-1 min-h-28 w-full rounded-xl border p-3 font-normal" /></label></div>}{activeTab === "connected" && <div className="mt-6"><p className="font-black">Your connected SDTV profiles</p><p className="mt-1 text-sm text-slate-500">Click any card to manage that connected record here, without leaving this page.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{connectedProfiles.map((item) => <button key={item.kind} onClick={() => selectConnected(item)} className={`rounded-2xl border p-4 text-left ${selectedConnected?.kind === item.kind ? "border-pink-500 bg-pink-50" : "bg-slate-50"}`}><h3 className="font-black">{item.title}</h3><p className="mt-1 text-sm text-slate-600">Status: {label(item.status)}</p>{connectedSummary(item).slice(0,2).map((text: string) => <p key={text} className="mt-1 text-xs text-slate-500">{text}</p>)}</button>)}{connectedProfiles.length === 0 && <div className="rounded-2xl bg-slate-50 p-5 text-slate-500">No role-specific profiles are connected yet.</div>}</div>{selectedConnected && <div className="mt-5 rounded-3xl border bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Manage connected profile</p><h3 className="text-2xl font-black">{selectedConnected.title}</h3><p className="text-sm text-slate-500">Status: {label(selectedConnected.status)}</p></div><button onClick={() => setSelectedConnected(null)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">Close</button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{selectedConnected.kind === "team" && <><label className="font-bold">Name<input value={connectedEdit.name || ""} onChange={(e) => updateConnected("name", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Title<input value={connectedEdit.title || ""} onChange={(e) => updateConnected("title", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold md:col-span-2">Image URL<input value={connectedEdit.image || ""} onChange={(e) => updateConnected("image", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label></>}{selectedConnected.kind === "radio" && <><label className="font-bold">Name<input value={connectedEdit.name || ""} onChange={(e) => updateConnected("name", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Title<input value={connectedEdit.title || ""} onChange={(e) => updateConnected("title", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Segment<input value={connectedEdit.segment_name || ""} onChange={(e) => updateConnected("segment_name", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Image URL<input value={connectedEdit.image || ""} onChange={(e) => updateConnected("image", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label></>}{selectedConnected.kind === "volunteer" && <><label className="font-bold">Full Name<input value={connectedEdit.full_name || ""} onChange={(e) => updateConnected("full_name", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Phone<input value={connectedEdit.phone || ""} onChange={(e) => updateConnected("phone", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">City<input value={connectedEdit.city || ""} onChange={(e) => updateConnected("city", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Photo URL<input value={connectedEdit.photo_url || ""} onChange={(e) => updateConnected("photo_url", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label></>}{selectedConnected.kind === "influencer" && <><label className="font-bold">Full Name<input value={connectedEdit.full_name || ""} onChange={(e) => updateConnected("full_name", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">City<input value={connectedEdit.city || ""} onChange={(e) => updateConnected("city", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Niche<input value={connectedEdit.niche || ""} onChange={(e) => updateConnected("niche", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Follower Count<input value={connectedEdit.follower_count || ""} onChange={(e) => updateConnected("follower_count", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold md:col-span-2">Bio<textarea value={connectedEdit.bio || ""} onChange={(e) => updateConnected("bio", e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Instagram<input value={connectedEdit.instagram_url || ""} onChange={(e) => updateConnected("instagram_url", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">YouTube<input value={connectedEdit.youtube_url || ""} onChange={(e) => updateConnected("youtube_url", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label></>}{!["team","radio","volunteer","influencer"].includes(selectedConnected.kind) && <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 md:col-span-2">This connected record is shown here for visibility. Detailed edits are handled by the main profile or SDTV workflow.</div>}</div>{["team","radio","volunteer","influencer"].includes(selectedConnected.kind) && <button onClick={saveConnectedProfile} disabled={saving} className="mt-4 rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : `Save ${selectedConnected.title}`}</button>}</div>}</div>}{activeTab === "social" && <div className="mt-6 grid gap-4 md:grid-cols-2"><input value={form.instagram_url || ""} onChange={(e) => updateField("instagram_url", e.target.value)} placeholder="Instagram URL" className="rounded-xl border p-3" /><input value={form.linkedin_url || ""} onChange={(e) => updateField("linkedin_url", e.target.value)} placeholder="LinkedIn URL" className="rounded-xl border p-3" /><input value={form.facebook_url || ""} onChange={(e) => updateField("facebook_url", e.target.value)} placeholder="Facebook URL" className="rounded-xl border p-3" /><input value={form.website_url || ""} onChange={(e) => updateField("website_url", e.target.value)} placeholder="Website URL" className="rounded-xl border p-3" /><input value={form.youtube_url || ""} onChange={(e) => updateField("youtube_url", e.target.value)} placeholder="YouTube URL" className="rounded-xl border p-3 md:col-span-2" /></div>}{activeTab === "interests" && <div className="mt-6"><p className="font-black">What are you interested in?</p><div className="mt-4 flex flex-wrap gap-2">{interestOptions.map((item) => <button key={item} type="button" onClick={() => toggleInterest(item)} className={`rounded-xl px-3 py-2 text-sm font-black ${form.interests?.includes(item) ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-700"}`}>{item}</button>)}</div></div>}{activeTab === "privacy" && <div className="mt-6 space-y-4"><div><p className="font-black">Public Visibility</p><p className="mt-1 text-sm text-slate-500">Choose how SDTV may use your profile publicly. Admin emergency visibility controls may still override this if needed.</p></div><div className="grid gap-3">{(["private", "credit", "public"] as VisibilityMode[]).map((mode) => <button key={mode} type="button" onClick={() => setMode(mode)} className={`rounded-2xl border p-4 text-left ${visibilityMode === mode ? "border-pink-500 bg-pink-50" : "border-slate-200 bg-white"}`}><p className="font-black">{visibilityLabel(mode)}</p><p className="text-sm text-slate-600">{visibilityDescription(mode)}</p></button>)}</div><label className="block rounded-2xl bg-slate-50 p-4"><input type="checkbox" checked={Boolean(form.allow_sdtv_contact)} onChange={(e) => updateField("allow_sdtv_contact", e.target.checked)} /> <b>Allow SDTV to contact me</b></label></div>}<button onClick={saveProfile} disabled={saving || uploading} className="mt-8 rounded-xl bg-pink-600 px-6 py-4 font-black text-white disabled:opacity-60">{uploading ? "Uploading..." : saving ? "Saving..." : "Save Profile"}</button></section></div>}</section><SiteFooter /></main>;
}

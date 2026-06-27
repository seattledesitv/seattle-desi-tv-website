"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import IdBadgeTools from "../components/IdBadgeTools";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

export default function MyIdBadgePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading ID badge...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [profile, setProfile] = useState<any>({ full_name: "", email: "", profile_photo_url: "", id_badge_url: "" });

  async function load() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const u = data?.user || null;
    setUser(u);
    if (!u?.id) { setMessage("Please login to view your SDTV ID badge."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, u);
    setRole(nextRole);
    const { data: p, error } = await supabase.from("user_profiles").select("*").eq("user_id", u.id).maybeSingle();
    if (error) { setMessage(`Could not load profile: ${error.message}`); setLoading(false); return; }
    const fallbackName = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "SDTV Team Member";
    setProfile({ ...(p || {}), user_id: u.id, email: u.email, full_name: p?.full_name || fallbackName, profile_photo_url: p?.profile_photo_url || "", id_badge_url: p?.id_badge_url || "" });
    setMessage("");
    setLoading(false);
  }

  async function saveBadge(nextUrl?: string) {
    if (!user?.id || !user?.email) return;
    setSaving(true);
    const idBadgeUrl = nextUrl || profile.id_badge_url || null;
    const { error } = await supabase.from("user_profiles").upsert({
      user_id: user.id,
      email: user.email,
      role,
      full_name: profile.full_name || null,
      profile_photo_url: profile.profile_photo_url || null,
      id_badge_url: idBadgeUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaving(false);
    setMessage(error ? `Could not save ID badge: ${error.message}` : "ID badge saved.");
  }

  useEffect(() => { load(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader /><section className="mx-auto max-w-5xl px-6 py-10"><a href="/my-hub" className="font-black text-pink-300">← Back to My Hub</a><h1 className="mt-3 text-4xl font-black md:text-5xl">My SDTV ID Badge</h1><p className="mt-2 text-slate-300">Generate, download, or print your official Seattle Desi TV badge.</p>{loading && <div className="mt-8 rounded-3xl bg-white/10 p-6">{message}</div>}{!loading && !user?.id && <div className="mt-8 rounded-3xl bg-white p-8 text-slate-950"><p className="font-bold">{message}</p><a href="/login?next=/my-id-badge" className="mt-5 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Login</a></div>}{!loading && user?.id && <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]"><aside className="rounded-3xl bg-white p-6 text-slate-950"><div className="grid place-items-center text-center"><div className="grid h-40 w-40 place-items-center overflow-hidden rounded-full bg-slate-100 text-5xl font-black text-pink-600">{profile.profile_photo_url ? <img src={profile.profile_photo_url} alt="Profile" className="h-full w-full object-cover" /> : String(profile.full_name || "S").slice(0,1).toUpperCase()}</div><h2 className="mt-4 text-2xl font-black">{profile.full_name}</h2><p className="text-sm font-bold text-slate-500">{profile.email}</p><p className="mt-2 rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-700">{role.replaceAll("_", " ")}</p></div><div className="mt-5"><IdBadgeTools fullName={profile.full_name} roleLabel={role} email={profile.email} profilePhotoUrl={profile.profile_photo_url} idBadgeUrl={profile.id_badge_url} onGenerated={(url) => { setProfile((c: any) => ({ ...c, id_badge_url: url })); saveBadge(url); }} compact /></div></aside><section className="rounded-3xl bg-white p-6 text-slate-950">{message && <div className="mb-5 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}<h2 className="text-2xl font-black">Badge Preview</h2>{profile.id_badge_url ? <img src={profile.id_badge_url} alt="SDTV ID badge" className="mt-5 w-full rounded-2xl border bg-slate-50 object-contain" /> : <div className="mt-5 grid min-h-80 place-items-center rounded-2xl bg-slate-50 p-8 text-center font-bold text-slate-500">No ID badge generated yet.</div>}<button onClick={() => saveBadge()} disabled={saving} className="mt-5 rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Badge"}</button><a href="/my-profile" className="ml-3 mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Edit Profile Photo</a></section></div>}</section><SiteFooter /></main>;
}

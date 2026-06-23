"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

export default function StudioInfluencersPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);

  async function loadProfiles() {
    const { data, error } = await supabase.from("influencer_profiles").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) { setMessage(`Could not load influencers: ${error.message}`); setProfiles([]); return; }
    setProfiles(data || []);
  }

  async function init() {
    setLoading(true);
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage influencers."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This page is for admins only."); setLoading(false); return; }
    await loadProfiles();
    setMessage("");
    setLoading(false);
  }

  async function updateProfile(profile: any, patch: any) {
    setMessage("Updating influencer...");
    const payload = { ...patch, updated_at: new Date().toISOString() };
    if (patch.status === "approved") {
      (payload as any).approved_by = user?.email || user?.id || null;
      (payload as any).approved_at = new Date().toISOString();
    }
    const { error } = await supabase.from("influencer_profiles").update(payload).eq("id", profile.id);
    setMessage(error ? `Update failed: ${error.message}` : "Influencer updated.");
    await loadProfiles();
  }

  useEffect(() => { init(); }, []);

  const canAccess = Boolean(user && isAdminRole(role));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/10 p-8">
          <p className="font-black uppercase tracking-wide text-pink-300">Studio</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Manage Influencers</h1>
          <p className="mt-3 max-w-3xl text-slate-300">Approve influencers, reject profiles, hide profiles, and control whether an approved influencer appears on the public directory.</p>
          <button onClick={init} className="mt-5 rounded-xl bg-white px-4 py-2 font-black text-slate-950">Refresh</button>
        </div>
        {loading && <div className="rounded-2xl bg-white/10 p-6">{message}</div>}
        {!loading && !canAccess && <div className="rounded-2xl bg-white p-6 text-slate-950">{message}</div>}
        {!loading && canAccess && <>
          {message && <div className="mb-5 rounded-2xl bg-white p-4 text-sm font-bold text-orange-700">{message}</div>}
          {profiles.length === 0 && <div className="rounded-2xl bg-white p-8 text-slate-500">No influencer profiles yet.</div>}
          <div className="grid gap-5">
            {profiles.map((profile) => <article key={profile.id} className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2 text-xs font-black"><span className="rounded-full bg-slate-100 px-3 py-1">{profile.status || "pending"}</span><span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">public: {profile.public_listing ? "yes" : "no"}</span></div>
                  <h2 className="mt-3 text-2xl font-black">{profile.full_name}</h2>
                  <p className="text-slate-600">{profile.email} · {profile.city || "Washington"}</p>
                  <p className="mt-2 text-sm text-slate-500">{profile.niche || "Influencer"} · {profile.follower_count || "Followers not listed"}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm font-black text-pink-600">
                    {profile.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}
                    {profile.tiktok_url && <a href={profile.tiktok_url} target="_blank" rel="noreferrer">TikTok</a>}
                    {profile.youtube_url && <a href={profile.youtube_url} target="_blank" rel="noreferrer">YouTube</a>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <button onClick={() => updateProfile(profile, { status: "approved" })} className="rounded-xl bg-green-600 px-4 py-2 font-black text-white">Approve</button>
                  <button onClick={() => updateProfile(profile, { public_listing: !profile.public_listing })} className="rounded-xl bg-slate-950 px-4 py-2 font-black text-white">{profile.public_listing ? "Disable Public" : "Enable Public"}</button>
                  <button onClick={() => updateProfile(profile, { status: "hidden", public_listing: false })} className="rounded-xl border px-4 py-2 font-black text-slate-950">Hide</button>
                  <button onClick={() => updateProfile(profile, { status: "rejected", public_listing: false })} className="rounded-xl bg-red-600 px-4 py-2 font-black text-white">Reject</button>
                </div>
              </div>
            </article>)}
          </div>
        </>}
      </div>
    </main>
  );
}

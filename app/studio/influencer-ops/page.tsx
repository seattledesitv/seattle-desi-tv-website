"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

function dateText(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function InfluencerOpsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [pendingProfiles, setPendingProfiles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [events, setEvents] = useState<Record<string, any>>({});

  async function loadData() {
    const [intentResult, pendingProfileResult] = await Promise.all([
      supabase.from("event_influencer_intents").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("influencer_profiles").select("id,full_name,email,city,niche,follower_count,instagram_url,tiktok_url,youtube_url,status,public_listing,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(100),
    ]);
    if (intentResult.error) { setMessage(`Could not load influencer requests: ${intentResult.error.message}`); setRows([]); return; }
    setPendingProfiles(pendingProfileResult.data || []);
    const nextRows = intentResult.data || [];
    setRows(nextRows);
    const profileIds = Array.from(new Set(nextRows.map((row: any) => row.influencer_profile_id).filter(Boolean)));
    const eventIds = Array.from(new Set(nextRows.map((row: any) => row.event_id).filter(Boolean)));
    if (profileIds.length) {
      const profileResult = await supabase.from("influencer_profiles").select("id,full_name,email,city,niche,follower_count,instagram_url,tiktok_url,youtube_url,status,public_listing").in("id", profileIds);
      const map: Record<string, any> = {};
      (profileResult.data || []).forEach((profile: any) => { map[profile.id] = profile; });
      setProfiles(map);
    } else setProfiles({});
    if (eventIds.length) {
      const eventResult = await supabase.from("events").select("id,title,date,location,status").in("id", eventIds);
      const map: Record<string, any> = {};
      (eventResult.data || []).forEach((event: any) => { map[event.id] = event; });
      setEvents(map);
    } else setEvents({});
  }

  async function init() {
    setLoading(true);
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access Influencer Ops."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This page is for admins only."); setLoading(false); return; }
    await loadData();
    setMessage("");
    setLoading(false);
  }

  async function updateProfile(id: string, status: string) {
    const payload: any = { status, updated_at: new Date().toISOString() };
    if (status === "approved") { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("influencer_profiles").update(payload).eq("id", id);
    setActionMessage(error ? `Profile update failed: ${error.message}` : `Influencer profile marked ${status}.`);
    await loadData();
  }

  async function updateIntent(id: string, status: string) {
    const payload: any = { status, updated_at: new Date().toISOString() };
    if (status === "approved") { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("event_influencer_intents").update(payload).eq("id", id);
    setActionMessage(error ? `Request update failed: ${error.message}` : `Influencer event request marked ${status}.`);
    await loadData();
  }

  useEffect(() => { init(); }, []);

  const canAccess = Boolean(user && isAdminRole(role));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/10 p-8">
          <p className="font-black uppercase tracking-wide text-pink-300">Studio</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Influencer Ops</h1>
          <p className="mt-3 max-w-3xl text-slate-300">Approve influencer profiles and event collaboration requests.</p>
          <button onClick={init} className="mt-5 rounded-xl bg-white px-4 py-2 font-black text-slate-950">Refresh</button>
        </div>
        {loading && <div className="rounded-2xl bg-white/10 p-6">{message}</div>}
        {!loading && !canAccess && <div className="rounded-2xl bg-white p-6 text-slate-950">{message}</div>}
        {!loading && canAccess && <div className="grid gap-8">
          {actionMessage && <div className="rounded-2xl bg-white p-4 text-sm font-bold text-orange-700">{actionMessage}</div>}
          <section>
            <h2 className="mb-4 text-3xl font-black">Pending Influencer Profiles</h2>
            {pendingProfiles.length === 0 && <div className="rounded-2xl bg-white p-8 text-slate-500">No pending influencer profiles.</div>}
            <div className="grid gap-4">{pendingProfiles.map((profile) => <article key={profile.id} className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl"><h3 className="text-2xl font-black">{profile.full_name}</h3><p className="text-slate-600">{profile.email} · {profile.city || "Washington"}</p><p className="mt-2 text-sm text-slate-500">{profile.niche || "Influencer"} · {profile.follower_count || "Followers not listed"} · Public: {profile.public_listing ? "Yes" : "No"}</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => updateProfile(profile.id, "approved")} className="rounded-xl bg-green-600 px-4 py-2 font-black text-white">Approve Profile</button><button onClick={() => updateProfile(profile.id, "rejected")} className="rounded-xl bg-red-600 px-4 py-2 font-black text-white">Reject</button><button onClick={() => updateProfile(profile.id, "hidden")} className="rounded-xl border px-4 py-2 font-black text-slate-950">Hide</button></div></article>)}</div>
          </section>
          <section>
            <h2 className="mb-4 text-3xl font-black">Event Collaboration Requests</h2>
            {rows.length === 0 && <div className="rounded-2xl bg-white p-8 text-slate-500">No influencer event requests yet.</div>}
            <div className="grid gap-5">{rows.map((row) => { const profile = profiles[row.influencer_profile_id] || {}; const event = events[row.event_id] || {}; return <article key={row.id} className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl"><span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-black text-yellow-800">request: {row.status || "pending"}</span><h3 className="mt-3 text-2xl font-black">{profile.full_name || row.user_email}</h3><p className="text-slate-600">{profile.city || "Washington"} · {profile.niche || "Influencer"} · {profile.follower_count || "Followers not listed"}</p><p className="mt-4 font-black">Event: {event.title || row.event_id}</p><p className="text-sm text-slate-500">{dateText(event.date)} · {event.location || "Location not listed"}</p><p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{row.collab_note || "Influencer plans to attend/collab with SDTV."}</p><p className="mt-2 text-sm text-slate-500">Platforms: {row.expected_platforms || "Not specified"}</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => updateIntent(row.id, "approved")} className="rounded-xl bg-green-600 px-4 py-2 font-black text-white">Approve Request</button><button onClick={() => updateIntent(row.id, "completed")} className="rounded-xl bg-blue-600 px-4 py-2 font-black text-white">Completed</button><button onClick={() => updateIntent(row.id, "rejected")} className="rounded-xl bg-red-600 px-4 py-2 font-black text-white">Reject</button></div></article>; })}</div>
          </section>
        </div>}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

function dateText(value?: string | null) {
  if (!value) return "—";
  const d = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function label(value?: string | null) {
  return String(value || "").replaceAll("_", " ") || "—";
}

function statusClass(status?: string | null) {
  const value = String(status || "").toLowerCase();
  if (value === "approved") return "bg-green-50 text-green-700";
  if (value === "completed") return "bg-blue-50 text-blue-700";
  if (value === "rejected") return "bg-red-50 text-red-700";
  if (value === "pending") return "bg-yellow-50 text-yellow-800";
  return "bg-slate-100 text-slate-700";
}

export default function EventCoverageBriefsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [query, setQuery] = useState("");

  async function loadData() {
    const [eventResult, assignmentResult, influencerResult] = await Promise.all([
      supabase.from("events").select("id,title,date,location,status,poc_email,poc_phone,description").order("date", { ascending: false }).limit(300),
      supabase.from("event_crew_assignments").select("id,event_id,user_email,assignment_type,status,crew_confirmed,coverage_completed,coverage_notes").order("created_at", { ascending: false }).limit(1000),
      supabase.from("event_influencer_intents").select("id,event_id,user_email,influencer_profile_id,status,expected_platforms,collab_note,post_url").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (eventResult.error) { setMessage(`Could not load events: ${eventResult.error.message}`); return; }
    setEvents(eventResult.data || []);
    setAssignments(assignmentResult.data || []);
    const influencerRows = influencerResult.data || [];
    setInfluencers(influencerRows);
    const profileIds = Array.from(new Set(influencerRows.map((row: any) => row.influencer_profile_id).filter(Boolean)));
    if (profileIds.length) {
      const profileResult = await supabase.from("influencer_profiles").select("id,full_name,email,instagram_url,tiktok_url,youtube_url,niche,follower_count,status,public_listing").in("id", profileIds);
      const map: Record<string, any> = {};
      (profileResult.data || []).forEach((profile: any) => { map[profile.id] = profile; });
      setProfiles(map);
    } else setProfiles({});
  }

  async function init() {
    setLoading(true);
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access coverage briefs."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This page is for admins only."); setLoading(false); return; }
    await loadData();
    setMessage("");
    setLoading(false);
  }

  useEffect(() => { init(); }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((event) => !q || `${event.title || ""} ${event.location || ""} ${event.poc_email || ""}`.toLowerCase().includes(q));
  }, [events, query]);

  function crewFor(eventId: string) {
    return assignments.filter((row) => row.event_id === eventId && String(row.status || "").toLowerCase() === "approved");
  }

  function influencersFor(eventId: string) {
    return influencers.filter((row) => row.event_id === eventId && ["approved", "completed"].includes(String(row.status || "").toLowerCase()));
  }

  function pendingInfluencersFor(eventId: string) {
    return influencers.filter((row) => row.event_id === eventId && String(row.status || "").toLowerCase() === "pending");
  }

  function emailOrganizer(event: any) {
    const crew = crewFor(event.id);
    const inf = influencersFor(event.id);
    const crewLines = crew.length ? crew.map((item) => `- ${item.user_email || "SDTV crew"} (${label(item.assignment_type)})`).join("\n") : "- SDTV crew assignment is being finalized.";
    const influencerLines = inf.length ? inf.map((item) => { const profile = profiles[item.influencer_profile_id] || {}; return `- ${profile.full_name || item.user_email || "Influencer"} (${item.expected_platforms || "social collaboration"})`; }).join("\n") : "- No approved influencer collaboration listed yet.";
    const subject = `SDTV coverage plan for ${event.title}`;
    const body = `Hello,\n\nSharing the current Seattle Desi TV coverage plan for your event.\n\nEvent: ${event.title}\nDate: ${dateText(event.date)}\nLocation: ${event.location || "TBD"}\n\nSDTV Crew / Coverage:\n${crewLines}\n\nInfluencer / Social Collaboration:\n${influencerLines}\n\nThis plan may be updated as crew and influencer confirmations are finalized.\n\nThank you,\nSeattle Desi TV`;
    window.location.href = `mailto:${event.poc_email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const canAccess = Boolean(user && isAdminRole(role));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/10 p-8">
          <p className="font-black uppercase tracking-wide text-pink-300">Studio</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Event Coverage Briefs</h1>
          <p className="mt-3 max-w-3xl text-slate-300">Operational view of crew and influencer coverage by event, with a one-click organizer email draft.</p>
          <button onClick={init} className="mt-5 rounded-xl bg-white px-4 py-2 font-black text-slate-950">Refresh</button>
        </div>

        {loading && <div className="rounded-2xl bg-white/10 p-6">{message}</div>}
        {!loading && !canAccess && <div className="rounded-2xl bg-white p-6 text-slate-950">{message}</div>}
        {!loading && canAccess && <>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event, location, or organizer email..." className="mb-6 w-full rounded-xl border p-3 text-slate-950" />
          <div className="grid gap-5">
            {rows.map((event) => {
              const crew = crewFor(event.id);
              const inf = influencersFor(event.id);
              const pendingInf = pendingInfluencersFor(event.id);
              return <article key={event.id} className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-black">{event.title}</h2>
                    <p className="text-slate-600">{dateText(event.date)} · {event.location || "No location"}</p>
                    <p className="mt-1 text-sm text-slate-500">Organizer: {event.poc_email || "No organizer email"}</p>
                  </div>
                  <button disabled={!event.poc_email} onClick={() => emailOrganizer(event)} className="rounded-xl bg-pink-600 px-4 py-2 font-black text-white disabled:opacity-50">Email Organizer</button>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border p-4"><p className="font-black">Approved Crew</p><p className="mt-1 text-3xl font-black text-pink-600">{crew.length}</p>{crew.slice(0, 4).map((item) => <p key={item.id} className="mt-2 text-xs text-slate-600">{item.user_email} · {label(item.assignment_type)}</p>)}</div>
                  <div className="rounded-2xl border p-4"><p className="font-black">Approved Influencers</p><p className="mt-1 text-3xl font-black text-yellow-600">{inf.length}</p>{inf.slice(0, 4).map((item) => { const profile = profiles[item.influencer_profile_id] || {}; return <p key={item.id} className="mt-2 text-xs text-slate-600">{profile.full_name || item.user_email} · {item.expected_platforms || "social"}</p>; })}</div>
                  <div className="rounded-2xl border p-4"><p className="font-black">Pending Influencers</p><p className="mt-1 text-3xl font-black text-orange-600">{pendingInf.length}</p>{pendingInf.slice(0, 4).map((item) => <p key={item.id} className="mt-2 text-xs text-slate-600">{item.user_email} · pending</p>)}</div>
                </div>
              </article>;
            })}
          </div>
        </>}
      </div>
    </main>
  );
}

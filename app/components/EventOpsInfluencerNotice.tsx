"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

function label(value?: string | null) {
  return String(value || "").replaceAll("_", " ") || "—";
}

function statusClass(status?: string | null) {
  const value = String(status || "").toLowerCase();
  if (value === "approved") return "bg-green-50 text-green-700";
  if (value === "completed") return "bg-blue-50 text-blue-700";
  if (value === "rejected") return "bg-red-50 text-red-700";
  return "bg-yellow-50 text-yellow-800";
}

export default function EventOpsInfluencerNotice() {
  const [visible, setVisible] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [events, setEvents] = useState<Record<string, any>>({});

  async function load() {
    if (typeof window === "undefined" || window.location.pathname !== "/studio/event-ops") return;
    setVisible(true);
    const { data } = await supabase.from("event_influencer_intents").select("id,event_id,user_email,influencer_profile_id,status,expected_platforms,created_at").order("created_at", { ascending: false }).limit(20);
    const nextRows = data || [];
    setRows(nextRows);
    const profileIds = Array.from(new Set(nextRows.map((row: any) => row.influencer_profile_id).filter(Boolean)));
    const eventIds = Array.from(new Set(nextRows.map((row: any) => row.event_id).filter(Boolean)));
    if (profileIds.length) {
      const profileResult = await supabase.from("influencer_profiles").select("id,full_name,email,niche,follower_count,status").in("id", profileIds);
      const map: Record<string, any> = {};
      (profileResult.data || []).forEach((profile: any) => { map[profile.id] = profile; });
      setProfiles(map);
    }
    if (eventIds.length) {
      const eventResult = await supabase.from("events").select("id,title").in("id", eventIds);
      const map: Record<string, any> = {};
      (eventResult.data || []).forEach((event: any) => { map[event.id] = event; });
      setEvents(map);
    }
  }

  useEffect(() => { load(); }, []);

  if (!visible) return null;

  return (
    <div className="mx-auto max-w-7xl px-6 pt-5">
      <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-5 text-slate-950 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-yellow-700">Influencer Coverage</p>
            <h2 className="mt-1 text-2xl font-black">Influencer requests are active for Event Ops</h2>
            <p className="mt-1 text-sm text-slate-600">Use this summary with the event cards below. For full crew + influencer operational view and organizer email drafts, open Coverage Briefs.</p>
          </div>
          <a href="/studio/event-coverage-briefs" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Open Coverage Briefs</a>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {rows.length === 0 && <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 md:col-span-3">No influencer event requests yet.</div>}
          {rows.slice(0, 6).map((row) => {
            const profile = profiles[row.influencer_profile_id] || {};
            const event = events[row.event_id] || {};
            return <div key={row.id} className="rounded-2xl bg-white p-4 text-sm"><span className={`rounded-full px-2 py-1 text-[11px] font-black ${statusClass(row.status)}`}>{label(row.status)}</span><p className="mt-2 font-black">{event.title || "Event"}</p><p className="mt-1 text-slate-600">{profile.full_name || row.user_email || "Influencer"}</p><p className="mt-1 text-xs text-slate-500">{row.expected_platforms || "Social collab"}</p></div>;
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function label(value?: string | null) { return String(value || "").replaceAll("_", " ") || "—"; }
function ageDays(value?: string | null) { const d = value ? new Date(value) : null; return d && !Number.isNaN(d.getTime()) ? Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000)) : 0; }
function old(value?: string | null) { const d = value ? new Date(value) : null; return Boolean(d && !Number.isNaN(d.getTime()) && Date.now() - d.getTime() >= TWO_WEEKS_MS); }
function target(item: any) { if (item.kind === "Crew request") return "/studio/crew/pending"; if (item.kind === "Influencer request") return "/studio/influencer-ops"; if (item.kind === "Video workflow") return item.workflowId ? `/studio/video-production/${item.workflowId}` : "/studio/video-production"; return "/studio/event-ops-v2"; }

export default function EventOpsAgingPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAgingItems() {
    setLoading(true);
    const [events, crew, influencers, videos] = await Promise.all([
      supabase.from("events").select("id,title,date,status,created_at,updated_at").in("status", ["pending", "on_hold"]).limit(200),
      supabase.from("event_crew_assignments").select("id,event_id,event_title,user_email,assignment_type,status,created_at,updated_at").in("status", ["pending", "on_hold"]).limit(300),
      supabase.from("event_influencer_intents").select("id,event_id,user_email,status,created_at,updated_at,collab_note").in("status", ["pending", "on_hold"]).limit(300),
      supabase.from("event_video_workflows").select("id,event_id,status,assigned_editor_email,updated_at,created_at").in("status", ["changes_requested", "awaiting_admin_approval", "awaiting_crew_review", "ready_for_editing"]).limit(300),
    ]);
    const next: any[] = [];
    (events.data || []).forEach((event: any) => { const since = event.updated_at || event.created_at; if (old(since)) next.push({ kind: "Event approval", title: event.title || "Untitled event", status: event.status, since, note: event.date ? `Event date: ${event.date}` : "Needs admin decision" }); });
    (crew.data || []).forEach((row: any) => { const since = row.updated_at || row.created_at; if (old(since)) next.push({ kind: "Crew request", title: row.event_title || row.event_id || "Event", status: row.status, since, note: `${row.user_email || "Crew"} · ${label(row.assignment_type)}` }); });
    (influencers.data || []).forEach((row: any) => { const since = row.updated_at || row.created_at; if (old(since)) next.push({ kind: "Influencer request", title: row.user_email || "Influencer request", status: row.status, since, note: row.collab_note || "Collab request waiting" }); });
    (videos.data || []).forEach((row: any) => { const since = row.updated_at || row.created_at; if (old(since)) next.push({ kind: "Video workflow", title: row.assigned_editor_email || row.event_id || "Video workflow", status: row.status, since, workflowId: row.id, note: "Video workflow waiting" }); });
    setItems(next.sort((a, b) => ageDays(b.since) - ageDays(a.since)).slice(0, 12));
    setLoading(false);
  }

  useEffect(() => { loadAgingItems(); }, []);
  const topItems = useMemo(() => items.slice(0, 5), [items]);

  return <aside className="event-aging-panel rounded-3xl bg-white p-6 text-slate-950">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-red-600">Action needed</p><h2 className="text-2xl font-black">Pending over 2 weeks</h2><p className="text-sm text-slate-500">Click an item to open where it can be fixed.</p></div><button onClick={loadAgingItems} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">Refresh</button></div>
    <div className="mt-4 rounded-2xl bg-red-50 p-4"><p className="text-3xl font-black text-red-700">{loading ? "…" : items.length}</p><p className="text-xs font-bold text-red-700">items older than 14 days</p></div>
    <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">{!loading && topItems.length === 0 && <p className="rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-700">Nothing urgent right now.</p>}{topItems.map((item, index) => <a href={target(item)} key={`${item.kind}-${item.since}-${index}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-red-300 hover:bg-red-50"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-black">{item.title}</p><p className="text-xs text-slate-500">{item.kind} · {label(item.status)}</p></div><span className="shrink-0 rounded-full bg-red-100 px-2 py-1 text-[11px] font-black text-red-700">{ageDays(item.since)}d</span></div><p className="mt-2 line-clamp-2 text-xs text-slate-600">{item.note}</p></a>)}</div>
  </aside>;
}

"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

function isAdminRole(role: string) { return String(role || "").toLowerCase().includes("admin"); }
function dateText(value?: string) { if (!value) return ""; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
function getImage(row: any) { if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0]; return row?.image || ""; }

export default function CoverageRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const canAccess = Boolean(user && isAdminRole(role));

  function eventFor(request: any) { return events.find((event) => event.id === request.event_id) || null; }

  async function loadData() {
    const [eventsResult, requestsResult] = await Promise.all([
      supabase.from("events").select("id,title,date,location,image,image_urls,created_by,crew_member_ids"),
      supabase.from("event_crew_assignments").select("id,event_id,user_id,user_email,assignment_type,status,created_at,approved_by,approved_at,event_title").eq("assignment_type", "owner_coverage_request").order("created_at", { ascending: false })
    ]);
    if (eventsResult.error) setActionMessage(`Could not load events: ${eventsResult.error.message}`); else setEvents(eventsResult.data || []);
    if (requestsResult.error) setActionMessage(`Could not load coverage requests: ${requestsResult.error.message}`); else setRequests(requestsResult.data || []);
  }

  async function init() {
    setLoading(true); setMessage("Checking access...");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access coverage requests."); setLoading(false); return; }
    const adminResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    const nextRole = adminResult.data?.role || "";
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This account does not have coverage request access."); setLoading(false); return; }
    await loadData(); setMessage(""); setLoading(false);
  }

  async function updateRequestStatus(request: any, status: string) {
    setActionMessage("Updating coverage request...");
    const payload: any = { status };
    if (["approved", "rejected", "on_hold"].includes(status)) { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("event_crew_assignments").update(payload).eq("id", request.id);
    if (error) { setActionMessage(`Update failed: ${error.message}`); return; }
    setActionMessage(`Coverage request marked ${status}.`);
    await loadData();
  }

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="max-w-6xl mx-auto px-6 py-10"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><h1 className="text-4xl md:text-5xl font-black">Coverage Requests</h1><p className="text-slate-300 mt-2">Organizer requests for SDTV event coverage.</p>{user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role || "none"}</p>}</div><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button></div>{loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}{!loading && canAccess && <div className="space-y-5">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<div className="bg-white/10 rounded-2xl p-5"><p className="text-slate-300">Coverage Requests</p><p className="text-4xl font-black">{requests.length}</p></div><div className="grid gap-4">{requests.map((request) => { const ev = eventFor(request); const title = request.event_title || ev?.title || "Unknown event"; const assignedCrewCount = Array.isArray(ev?.crew_member_ids) ? ev.crew_member_ids.length : 0; return <article key={request.id} className="bg-white text-slate-950 rounded-2xl p-4 grid md:grid-cols-[112px_1fr_auto] gap-4 items-center">{getImage(ev) ? <img src={getImage(ev)} alt={title} className="w-28 h-28 rounded-xl object-cover" /> : <div className="w-28 h-28 bg-pink-50 rounded-xl grid place-items-center text-pink-600 font-black text-xs">No image</div>}<div><h2 className="text-xl font-black">{title}</h2>{ev && <p className="text-sm text-gray-600">{dateText(ev.date)} · {ev.location}</p>}<p className="text-sm text-gray-700 mt-2">Organizer: {request.user_email || request.user_id}</p><p className="text-xs text-gray-500">Status: {request.status || "pending"} · Assigned crew: {assignedCrewCount}</p></div><div className="flex flex-wrap gap-2 md:justify-end"><a href={`/studio/events/${request.event_id}`} className="bg-slate-900 text-white px-3 py-2 rounded-lg font-bold text-sm">Open Event</a><a href="/studio/crew/pending" className="border border-slate-900 text-slate-900 px-3 py-2 rounded-lg font-bold text-sm">Crew Inbox</a><button onClick={() => updateRequestStatus(request, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button><button onClick={() => updateRequestStatus(request, "on_hold")} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">On Hold</button><button onClick={() => updateRequestStatus(request, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Decline</button></div></article>; })}{requests.length === 0 && <div className="bg-white text-slate-950 rounded-2xl p-8">No coverage requests found.</div>}</div></div>}</div></main>;
}

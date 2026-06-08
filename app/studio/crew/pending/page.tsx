"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import StudioHeader from "../../../components/StudioHeader";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", { auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

function roleContainsAdmin(role: string) { return String(role || "").toLowerCase().includes("admin"); }
function dateText(value?: string) { if (!value) return ""; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
function getImage(row: any) { if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0]; return row?.image || ""; }
function shouldAddToEventCrew(assignment: any) { return assignment?.assignment_type === "team_member_request" || assignment?.assignment_type === "self_selected"; }

export default function PendingCrewPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const canAccess = Boolean(user && roleContainsAdmin(role));

  function eventFor(a: any) { return events.find((e) => e.id === a.event_id) || null; }

  async function loadData() {
    const [eventsResult, crewResult] = await Promise.all([
      supabase.from("events").select("id,title,date,location,image,image_urls,crew_member_ids"),
      supabase.from("event_crew_assignments").select("id,event_id,user_id,user_email,assignment_type,status,created_at,event_title").or("status.is.null,status.eq.pending").order("created_at", { ascending: false })
    ]);
    if (eventsResult.error) setActionMessage(`Could not load events: ${eventsResult.error.message}`); else setEvents(eventsResult.data || []);
    if (crewResult.error) setActionMessage(`Could not load pending crew: ${crewResult.error.message}`); else setAssignments(crewResult.data || []);
  }

  async function init() {
    setLoading(true);
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access pending crew requests."); setLoading(false); return; }
    const adminResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    const nextRole = adminResult.data?.role || "";
    setRole(nextRole);
    if (!roleContainsAdmin(nextRole)) { setMessage("This account does not have admin access."); setLoading(false); return; }
    await loadData();
    setMessage("");
    setLoading(false);
  }

  async function addCrewToEvent(assignment: any, assignedEvent: any) {
    if (!assignedEvent?.id || !assignment?.user_id) return;
    const existing = Array.isArray(assignedEvent.crew_member_ids) ? assignedEvent.crew_member_ids : [];
    const nextCrew = Array.from(new Set([...existing, assignment.user_id]));
    const { error } = await supabase.from("events").update({ crew_member_ids: nextCrew }).eq("id", assignedEvent.id);
    if (error) throw error;
  }

  async function updateCrewStatus(assignment: any, status: string, assignedEvent: any) {
    setActionMessage("Updating crew request...");
    try {
      const payload: any = { status };
      const addsCrew = status === "approved" && shouldAddToEventCrew(assignment);
      if (status === "approved") {
        payload.approved_by = user?.email || user?.id || null;
        payload.approved_at = new Date().toISOString();
        if (addsCrew) await addCrewToEvent(assignment, assignedEvent);
      }
      if (assignedEvent?.title) payload.event_title = assignedEvent.title;
      const { error } = await supabase.from("event_crew_assignments").update(payload).eq("id", assignment.id);
      if (error) throw error;
      setActionMessage(addsCrew ? "Crew request approved and member added to event crew." : `Request marked ${status}.`);
      await loadData();
    } catch (error: any) {
      setActionMessage(`Update failed: ${error?.message || String(error)}`);
    }
  }

  async function deleteCrew(id: string) {
    if (!window.confirm("Delete this crew request?")) return;
    const { error } = await supabase.from("event_crew_assignments").delete().eq("id", id);
    if (error) setActionMessage(`Delete failed: ${error.message}`); else { setActionMessage("Crew request deleted."); await loadData(); }
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <a href="/studio" className="text-pink-300 font-bold">← Back to Studio</a>
        <h1 className="text-4xl md:text-5xl font-black mt-3">Pending Crew</h1>
        <p className="text-slate-300 mt-2 mb-8">Review crew requests waiting for approval.</p>
        {loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}
        {!loading && canAccess && <div className="space-y-5">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<div className="bg-white/10 rounded-2xl p-5"><p className="text-slate-300">Pending Crew Requests</p><p className="text-4xl font-black">{assignments.length}</p></div><div className="grid gap-4">{assignments.map((assignment) => { const ev = eventFor(assignment); const title = assignment.event_title || ev?.title || "Unknown event"; return <article key={assignment.id} className="bg-white text-slate-950 rounded-2xl p-4 grid md:grid-cols-[112px_1fr_auto] gap-4 items-center">{getImage(ev) ? <img src={getImage(ev)} alt={title} className="w-28 h-28 rounded-xl object-cover" /> : <div className="w-28 h-28 bg-pink-50 rounded-xl grid place-items-center text-pink-600 font-black text-xs">No image</div>}<div><h2 className="text-xl font-black">{title}</h2>{ev && <p className="text-sm text-gray-600">{dateText(ev.date)} · {ev.location}</p>}<p className="text-sm text-gray-700 mt-2">Requester: {assignment.user_email || assignment.user_id}</p><p className="text-xs text-gray-500">Type: {assignment.assignment_type || "not specified"}</p></div><div className="flex flex-wrap gap-2 md:justify-end"><button onClick={() => updateCrewStatus(assignment, "approved", ev)} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button><button onClick={() => updateCrewStatus(assignment, "on_hold", ev)} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">On Hold</button><button onClick={() => updateCrewStatus(assignment, "rejected", ev)} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button><button onClick={() => deleteCrew(assignment.id)} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button></div></article>; })}{assignments.length === 0 && <div className="bg-white text-slate-950 rounded-2xl p-8">No pending crew requests.</div>}</div></div>}
      </div>
    </main>
  );
}

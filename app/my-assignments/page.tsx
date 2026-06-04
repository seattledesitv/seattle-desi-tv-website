"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", { auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

function cleanRole(role: string) { return String(role || "general_public").toLowerCase().trim(); }
function isTeamRole(role: string) { const next = cleanRole(role); return next === "team_member" || next.includes("admin"); }
function firstImage(event: any) { if (Array.isArray(event?.image_urls) && event.image_urls.length > 0) return event.image_urls[0]; return event?.image || ""; }
function dateText(value?: string) { if (!value) return ""; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
function workflowLabel(a: any) { if (a.coverage_completed) return "Coverage Complete"; if (a.crew_confirmed) return "Confirmed"; return "Assigned - Awaiting Confirmation"; }
function workflowClass(a: any) { if (a.coverage_completed) return "bg-green-100 text-green-800"; if (a.crew_confirmed) return "bg-blue-100 text-blue-800"; return "bg-yellow-100 text-yellow-800"; }

export default function MyAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking assignments...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [eventsById, setEventsById] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const canViewAssignments = Boolean(user && isTeamRole(role));

  async function getUserRole(currentUser: any) {
    const adminResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    if (adminResult.data?.role) return cleanRole(adminResult.data.role);
    const requestResult = await supabase.from("user_role_requests").select("approved_role,requested_role,status").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
    return cleanRole(requestResult.data?.approved_role || requestResult.data?.requested_role || "general_public");
  }

  async function loadAssignments(currentUser: any) {
    if (!currentUser?.id) { setAssignments([]); setEventsById({}); return; }
    const { data, error } = await supabase.from("event_crew_assignments").select("id,event_id,user_id,user_email,assignment_type,status,created_at,crew_confirmed,coverage_completed,coverage_notes,completed_at,event_title").eq("user_id", currentUser.id).eq("status", "approved").order("created_at", { ascending: false });
    if (error) { setMessage(`Could not load assignments: ${error.message}`); setAssignments([]); return; }
    const rows = data || [];
    setAssignments(rows);
    const ids = Array.from(new Set(rows.map((row: any) => row.event_id).filter(Boolean)));
    if (ids.length) {
      const eventsResult = await supabase.from("events").select("id,title,date,location,description,image,image_urls,ticket_url,poc_email,poc_phone,status").in("id", ids).order("date", { ascending: true });
      if (!eventsResult.error) {
        const map: Record<string, any> = {};
        (eventsResult.data || []).forEach((event: any) => { map[event.id] = event; });
        setEventsById(map);
      }
    } else {
      setEventsById({});
    }
    const nextNotes: Record<string, string> = {};
    rows.forEach((row: any) => { nextNotes[row.id] = row.coverage_notes || ""; });
    setNotes(nextNotes);
    setMessage(rows.length ? `You have ${rows.length} assignment(s).` : "You do not have any approved assignments yet.");
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to see your SDTV assignments."); setLoading(false); return; }
    const nextRole = await getUserRole(currentUser);
    setRole(nextRole);
    if (!isTeamRole(nextRole)) { setMessage(`This page is for approved SDTV team members. Current role: ${nextRole}`); setLoading(false); return; }
    await loadAssignments(currentUser);
    setLoading(false);
  }

  async function updateAssignment(id: string, payload: any, success: string) {
    setActionMessage("Updating assignment...");
    const { error } = await supabase.from("event_crew_assignments").update(payload).eq("id", id);
    if (error) { setActionMessage(`Update failed: ${error.message}`); return; }
    setActionMessage(success);
    await loadAssignments(user);
  }

  async function confirmAssignment(id: string) {
    await updateAssignment(id, { crew_confirmed: true }, "Assignment confirmed.");
  }

  async function markComplete(id: string) {
    await updateAssignment(id, { coverage_completed: true, crew_confirmed: true, coverage_notes: notes[id] || null, completed_at: new Date().toISOString() }, "Coverage marked complete.");
  }

  async function saveNotes(id: string) {
    await updateAssignment(id, { coverage_notes: notes[id] || null }, "Coverage notes saved.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setRole("general_public"); setAssignments([]); setEventsById({}); setMessage("Logged out.");
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div><a href="/" className="text-pink-300 font-bold">← Back to Seattle Desi TV</a><h1 className="text-4xl md:text-5xl font-black mt-3">My Assignments</h1><p className="text-slate-300 mt-2">Confirm, complete, and track your SDTV event coverage work.</p>{user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role}</p>}</div>
          <div className="flex gap-3"><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>{user && <button onClick={signOut} className="border border-red-400 text-red-300 px-5 py-3 rounded-xl font-bold">Logout</button>}</div>
        </div>
        {loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canViewAssignments && <div className="bg-white text-slate-950 rounded-2xl p-8"><p>{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}
        {!loading && canViewAssignments && <div className="space-y-5">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<div className="bg-white/10 rounded-2xl p-5"><p className="text-slate-300">Approved Assignments</p><p className="text-4xl font-black">{assignments.length}</p></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{assignments.map((assignment) => { const event = eventsById[assignment.event_id] || {}; const image = firstImage(event); return <article key={assignment.id} className="bg-white text-slate-950 rounded-2xl overflow-hidden shadow-xl">{image ? <img src={image} alt={event.title || assignment.event_title} className="w-full h-52 object-cover" /> : <div className="w-full h-52 bg-pink-50 grid place-items-center text-pink-600 font-black">Seattle Desi TV</div>}<div className="p-5"><p className={`inline-block text-xs font-black uppercase tracking-wide rounded-full px-3 py-1 ${workflowClass(assignment)}`}>{workflowLabel(assignment)}</p><h2 className="text-xl font-black mt-3">{event.title || assignment.event_title || "Assigned Event"}</h2><p className="text-gray-600 mt-1">{dateText(event.date)} · {event.location || "Location TBD"}</p>{event.description && <p className="text-sm text-gray-600 mt-3 line-clamp-3">{event.description}</p>}<div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">{event.poc_email && <p><b>POC Email:</b> {event.poc_email}</p>}{event.poc_phone && <p><b>POC Phone:</b> {event.poc_phone}</p>}{assignment.completed_at && <p><b>Completed:</b> {new Date(assignment.completed_at).toLocaleString()}</p>}</div><textarea className="w-full border rounded-lg p-3 mt-4 text-sm" placeholder="Coverage notes" value={notes[assignment.id] || ""} onChange={(e) => setNotes({ ...notes, [assignment.id]: e.target.value })} /><div className="flex flex-wrap gap-3 mt-4">{event.ticket_url && <a href={event.ticket_url} target="_blank" rel="noreferrer" className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Tickets / Info</a>}{event.location && <a href={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}`} target="_blank" rel="noreferrer" className="border px-4 py-2 rounded-lg font-bold text-sm">Map</a>}<a href={`/events/${assignment.event_id}`} className="border px-4 py-2 rounded-lg font-bold text-sm">Event Page</a>{!assignment.crew_confirmed && <button onClick={() => confirmAssignment(assignment.id)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Confirm</button>}<button onClick={() => saveNotes(assignment.id)} className="border border-slate-900 px-4 py-2 rounded-lg font-bold text-sm">Save Notes</button>{!assignment.coverage_completed && <button onClick={() => markComplete(assignment.id)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Mark Complete</button>}</div></div></article>; })}</div>{assignments.length === 0 && <div className="bg-white text-slate-950 rounded-2xl p-8">No approved assignments yet.</div>}</div>}
      </div>
    </main>
  );
}

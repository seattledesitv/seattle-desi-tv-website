"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

const EVENT_STATUSES = ["pending", "approved", "on_hold", "rejected"];
const VIDEO_STATUSES = ["ready_for_editing", "in_editing", "awaiting_crew_review", "changes_requested", "awaiting_admin_approval", "approved_for_publishing", "published_complete"];

function dateText(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function label(value?: string | null) {
  return String(value || "").replaceAll("_", " ") || "—";
}

export default function EventOpsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [crewEmail, setCrewEmail] = useState("");
  const [editorEmail, setEditorEmail] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [crewNotes, setCrewNotes] = useState("");

  const canAccess = Boolean(user && isAdminRole(role));
  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);
  const eventAssignments = useMemo(() => assignments.filter((item) => item.event_id === selectedEventId), [assignments, selectedEventId]);
  const eventWorkflow = useMemo(() => workflows.find((item) => item.event_id === selectedEventId) || null, [workflows, selectedEventId]);

  async function loadData() {
    const [eventResult, assignmentResult, workflowResult] = await Promise.all([
      supabase.from("events").select("id,title,date,location,status,created_by,poc_email,poc_phone,ticket_url,description").order("date", { ascending: false }).limit(200),
      supabase.from("event_crew_assignments").select("id,event_id,user_id,user_email,assignment_type,status,event_title,coverage_completed,completed_at,created_at,approved_at").order("created_at", { ascending: false }).limit(1000),
      supabase.from("event_video_workflows").select("id,event_id,status,assigned_editor_email,crew_reviewer_email,raw_media_url,external_media_url,crew_notes,updated_at,published_at").order("updated_at", { ascending: false }).limit(300),
    ]);

    if (eventResult.error) setActionMessage(`Could not load events: ${eventResult.error.message}`); else setEvents(eventResult.data || []);
    if (assignmentResult.error) setAssignments([]); else setAssignments(assignmentResult.data || []);
    if (workflowResult.error) setWorkflows([]); else setWorkflows(workflowResult.data || []);
  }

  async function init() {
    setLoading(true);
    setMessage("Checking access...");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access Event Ops."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This Event Ops page is for admins only."); setLoading(false); return; }
    await loadData();
    setMessage("");
    setLoading(false);
  }

  async function updateEventStatus(status: string) {
    if (!selectedEventId) return;
    setActionMessage("Updating event status...");
    const payload: any = { status, approved: status === "approved" };
    if (status === "approved") { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("events").update(payload).eq("id", selectedEventId);
    if (error) { setActionMessage(`Event status update failed: ${error.message}`); return; }
    setActionMessage(`Event marked ${label(status)}.`);
    await loadData();
  }

  async function updateAssignment(item: any, status: string, completed = false) {
    setActionMessage("Updating crew/coverage request...");
    const payload: any = { status };
    if (status === "approved") { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    if (completed) { payload.coverage_completed = true; payload.completed_at = new Date().toISOString(); }
    const { error } = await supabase.from("event_crew_assignments").update(payload).eq("id", item.id);
    if (error) { setActionMessage(`Request update failed: ${error.message}`); return; }
    setActionMessage("Crew/coverage request updated.");
    await loadData();
  }

  async function assignCrew() {
    if (!selectedEventId || !crewEmail.trim()) { setActionMessage("Select an event and enter crew email."); return; }
    setActionMessage("Assigning crew...");
    const { error } = await supabase.from("event_crew_assignments").insert({ event_id: selectedEventId, user_email: crewEmail.trim().toLowerCase(), assignment_type: "team_member_request", status: "approved", event_title: selectedEvent?.title || null, approved_by: user?.email || user?.id || null, approved_at: new Date().toISOString() });
    if (error) { setActionMessage(`Crew assignment failed: ${error.message}`); return; }
    setCrewEmail("");
    setActionMessage("Crew assigned to event.");
    await loadData();
  }

  async function createVideoWorkflow() {
    if (!selectedEventId) return;
    if (eventWorkflow) { setActionMessage("This event already has a video production workflow."); return; }
    setActionMessage("Creating video production workflow...");
    const { error } = await supabase.from("event_video_workflows").insert({ event_id: selectedEventId, status: "ready_for_editing", assigned_editor_email: editorEmail.trim() || null, crew_reviewer_email: user?.email || null, raw_media_url: mediaUrl.trim() || null, crew_notes: crewNotes.trim() || null, created_by: user?.id || null, updated_by: user?.id || null });
    if (error) { setActionMessage(`Video workflow failed: ${error.message}. Confirm supabase/event-video-production.sql was run.`); return; }
    setEditorEmail(""); setMediaUrl(""); setCrewNotes("");
    setActionMessage("Video workflow created. Event is ready for editing.");
    await loadData();
  }

  async function updateWorkflowStatus(status: string) {
    if (!eventWorkflow) return;
    setActionMessage("Updating video workflow...");
    const payload: any = { status, updated_by: user?.id || null, updated_at: new Date().toISOString() };
    if (status === "published_complete") payload.published_at = new Date().toISOString();
    const { error } = await supabase.from("event_video_workflows").update(payload).eq("id", eventWorkflow.id);
    if (error) { setActionMessage(`Video workflow update failed: ${error.message}`); return; }
    setActionMessage(`Video workflow moved to ${label(status)}.`);
    await loadData();
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black">Event Ops</h1>
            <p className="text-slate-300 mt-2">One event control center: approval, coverage, crew, completion, and video production.</p>
            {user?.email && <p className="text-slate-400 text-sm mt-1">Logged in as {user.email} · Role: {role}</p>}
          </div>
          <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
        </div>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Access Required</h2><p className="text-gray-600 mt-3">{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}

        {!loading && canAccess && <div className="space-y-6">
          {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}

          <section className="bg-white text-slate-950 rounded-3xl p-6">
            <h2 className="text-2xl font-black">Select Event</h2>
            <p className="text-gray-600 mt-1">Choose an event and manage every operational step below.</p>
            <select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)} className="border rounded-xl p-3 w-full mt-4">
              <option value="">Select event...</option>
              {events.map((event) => <option key={event.id} value={event.id}>{event.title} — {dateText(event.date)} — {event.location || "No location"} — {label(event.status)}</option>)}
            </select>
          </section>

          {selectedEvent && <div className="grid xl:grid-cols-2 gap-6">
            <section className="bg-white text-slate-950 rounded-3xl p-6 space-y-4">
              <h2 className="text-2xl font-black">1. Event Approval</h2>
              <div className="text-sm text-gray-700 space-y-1"><p><b>Event:</b> {selectedEvent.title}</p><p><b>Date:</b> {dateText(selectedEvent.date)}</p><p><b>Location:</b> {selectedEvent.location || "—"}</p><p><b>Current Status:</b> {label(selectedEvent.status)}</p>{selectedEvent.poc_email && <p><b>POC:</b> {selectedEvent.poc_email}</p>}</div>
              <div className="flex flex-wrap gap-2">{EVENT_STATUSES.map((status) => <button key={status} onClick={() => updateEventStatus(status)} className={`px-4 py-2 rounded-lg font-bold ${selectedEvent.status === status ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-900"}`}>{label(status)}</button>)}</div>
            </section>

            <section className="bg-white text-slate-950 rounded-3xl p-6 space-y-4">
              <h2 className="text-2xl font-black">2. Crew / Coverage</h2>
              <div className="grid gap-3">{eventAssignments.length === 0 && <p className="text-gray-600">No coverage or crew requests yet.</p>}{eventAssignments.map((item) => <article key={item.id} className="border rounded-xl p-4"><p className="font-black">{item.user_email || "No email"}</p><p className="text-sm text-gray-600">{label(item.assignment_type)} · {label(item.status)}{item.coverage_completed ? " · coverage completed" : ""}</p><div className="flex flex-wrap gap-2 mt-3"><button onClick={() => updateAssignment(item, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button><button onClick={() => updateAssignment(item, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button><button onClick={() => updateAssignment(item, item.status || "approved", true)} className="bg-slate-900 text-white px-3 py-2 rounded-lg font-bold text-sm">Mark Coverage Complete</button></div></article>)}</div>
              <div className="border-t pt-4"><p className="font-black mb-2">Assign Crew Manually</p><div className="flex flex-col sm:flex-row gap-2"><input value={crewEmail} onChange={(event) => setCrewEmail(event.target.value)} placeholder="crew@email.com" className="border rounded-xl p-3 flex-1" /><button onClick={assignCrew} className="bg-pink-600 text-white px-4 py-3 rounded-xl font-black">Assign</button></div></div>
            </section>

            <section className="bg-white text-slate-950 rounded-3xl p-6 space-y-4 xl:col-span-2">
              <h2 className="text-2xl font-black">3. Video Production</h2>
              {!eventWorkflow ? <div className="grid md:grid-cols-2 gap-3"><input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="Raw footage / shared media URL" className="border rounded-xl p-3" /><input value={editorEmail} onChange={(event) => setEditorEmail(event.target.value)} placeholder="Assigned editor email" className="border rounded-xl p-3" /><textarea value={crewNotes} onChange={(event) => setCrewNotes(event.target.value)} placeholder="Coverage notes for editor: interviews, highlights, sponsor mentions, credits..." className="border rounded-xl p-3 md:col-span-2 min-h-24" /><button onClick={createVideoWorkflow} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black md:col-span-2">Create Video Workflow / Ready For Editing</button></div> : <div className="space-y-4"><div className="border rounded-xl p-4 bg-slate-50"><p><b>Status:</b> {label(eventWorkflow.status)}</p>{eventWorkflow.assigned_editor_email && <p><b>Editor:</b> {eventWorkflow.assigned_editor_email}</p>}{eventWorkflow.raw_media_url && <a href={eventWorkflow.raw_media_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Open raw media</a>}<p className="text-xs text-gray-500 mt-2">Updated {dateText(eventWorkflow.updated_at)}</p></div><div className="flex flex-wrap gap-2">{VIDEO_STATUSES.map((status) => <button key={status} onClick={() => updateWorkflowStatus(status)} className={`px-4 py-2 rounded-lg font-bold ${eventWorkflow.status === status ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-900"}`}>{label(status)}</button>)}<a href={`/studio/video-production/${eventWorkflow.id}`} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold">Open Full Workflow</a></div></div>}
            </section>
          </div>}
        </div>}
      </section>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const EVENT_STATUSES = ["pending", "approved", "on_hold", "rejected"];
const VIDEO_STATUSES = ["ready_for_editing", "in_editing", "awaiting_crew_review", "changes_requested", "awaiting_admin_approval", "approved_for_publishing", "published_complete"];
const CREW_ROLES = ["General Crew", "Host", "Reporter", "Camera", "Photography", "Production", "Editor", "Social Media"];
const PRIORITIES = ["Normal", "High", "Urgent", "Low"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateText(value?: string | null) { if (!value) return "—"; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
function label(value?: string | null) { return String(value || "").replaceAll("_", " ") || "—"; }
function canBeAssigned(role?: string | null) { const value = String(role || "").toLowerCase(); return value.includes("admin") || value.includes("team") || value.includes("crew") || value.includes("editor") || value.includes("volunteer"); }
function canEditVideo(role?: string | null) { const value = String(role || "").toLowerCase(); return value.includes("admin") || value.includes("editor") || value.includes("production") || value.includes("radio"); }
function normalizedRoleKey(role: string) { return `manual_${role.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "crew"}`; }
function eventDate(value?: string | null) { const d = value ? new Date(`${String(value).split("T")[0]}T00:00:00`) : null; return d && !Number.isNaN(d.getTime()) ? d : null; }

export default function EventOpsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedCrewUserIds, setSelectedCrewUserIds] = useState<string[]>([]);
  const [selectedCrewRole, setSelectedCrewRole] = useState("General Crew");
  const [selectedEditorEmail, setSelectedEditorEmail] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [crewNotes, setCrewNotes] = useState("");
  const [videoPriority, setVideoPriority] = useState("Normal");
  const [eventSearch, setEventSearch] = useState("");
  const [eventView, setEventView] = useState<"cards" | "calendar">("cards");
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const canAccess = Boolean(user && isAdminRole(role));
  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);
  const eventAssignments = useMemo(() => assignments.filter((item) => item.event_id === selectedEventId), [assignments, selectedEventId]);
  const eventWorkflow = useMemo(() => workflows.find((item) => item.event_id === selectedEventId) || null, [workflows, selectedEventId]);
  const selectedCrewUsers = useMemo(() => teamUsers.filter((item) => selectedCrewUserIds.includes(item.user_id)), [teamUsers, selectedCrewUserIds]);
  const editorUsers = useMemo(() => teamUsers.filter((item) => canEditVideo(item.role)), [teamUsers]);

  function statsForEvent(eventId: string) {
    const rows = assignments.filter((item) => item.event_id === eventId);
    const organizerCoverageRequests = rows.filter((item) => item.assignment_type === "owner_coverage_request");
    const crewRequests = rows.filter((item) => item.assignment_type === "team_member_request");
    const manualAssignments = rows.filter((item) => String(item.assignment_type || "").startsWith("manual_"));
    const approvedCrew = rows.filter((item) => String(item.status || "").toLowerCase() === "approved");
    const pendingCrew = rows.filter((item) => String(item.status || "").toLowerCase() === "pending");
    const completedCoverage = rows.filter((item) => item.coverage_completed);
    const workflow = workflows.find((item) => item.event_id === eventId);
    return {
      organizerRequested: organizerCoverageRequests.length,
      crewRequested: crewRequests.length,
      manuallyAssigned: manualAssignments.length,
      approvedCrew: approvedCrew.length,
      pendingCrew: pendingCrew.length,
      completedCoverage: completedCoverage.length,
      videoStatus: workflow?.status || "not_started",
    };
  }

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    if (!q) return events;
    return events.filter((event) => `${event.title || ""} ${event.location || ""} ${event.poc_email || ""} ${event.poc_phone || ""} ${event.status || ""}`.toLowerCase().includes(q));
  }, [events, eventSearch]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; events: any[] }> = [];
    for (let i = 0; i < first.getDay(); i++) cells.push({ day: null, events: [] });
    for (let day = 1; day <= days; day++) {
      const dayEvents = filteredEvents.filter((event) => { const d = eventDate(event.date); return d && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day; });
      cells.push({ day, events: dayEvents });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, events: [] });
    return cells;
  }, [filteredEvents, calendarMonth]);

  async function loadTeamUsers() {
    const adminResult = await supabase.from("admins").select("user_id,email,role,name,created_at").order("created_at", { ascending: false });
    if (adminResult.error) { setTeamUsers([]); return; }
    const adminRows = (adminResult.data || []).filter((item: any) => item.email && canBeAssigned(item.role));
    const emails = Array.from(new Set(adminRows.map((item: any) => String(item.email || "").toLowerCase()).filter(Boolean)));
    const userIds = Array.from(new Set(adminRows.map((item: any) => item.user_id).filter(Boolean))) as string[];
    const profileByEmail: Record<string, any> = {}; const profileByUserId: Record<string, any> = {};
    if (emails.length > 0 || userIds.length > 0) {
      let profileQuery = supabase.from("volunteer_onboarding_submissions").select("user_id,email,full_name,photo_url,created_at");
      if (emails.length > 0 && userIds.length > 0) profileQuery = profileQuery.or(`email.in.(${emails.join(",")}),user_id.in.(${userIds.join(",")})`);
      else if (emails.length > 0) profileQuery = profileQuery.in("email", emails);
      else profileQuery = profileQuery.in("user_id", userIds);
      const { data } = await profileQuery.order("created_at", { ascending: false });
      (data || []).forEach((item: any) => { if (item.email && !profileByEmail[String(item.email).toLowerCase()]) profileByEmail[String(item.email).toLowerCase()] = item; if (item.user_id && !profileByUserId[item.user_id]) profileByUserId[item.user_id] = item; });
    }
    const seen = new Set<string>();
    setTeamUsers(adminRows.map((item: any) => { const email = String(item.email || "").toLowerCase(); const profile = profileByUserId[item.user_id || ""] || profileByEmail[email] || {}; return { user_id: item.user_id || profile.user_id || email, email, role: item.role || "team_member", name: profile.full_name || item.name || email, photo_url: profile.photo_url || "" }; }).filter((item: any) => { const key = item.user_id || item.email; if (!key || seen.has(key)) return false; seen.add(key); return true; }).sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""))));
  }

  async function loadData() {
    const [eventResult, assignmentResult, workflowResult] = await Promise.all([
      supabase.from("events").select("id,title,date,location,status,created_by,poc_email,poc_phone,ticket_url,description").order("date", { ascending: false }).limit(300),
      supabase.from("event_crew_assignments").select("id,event_id,user_id,user_email,assignment_type,status,event_title,coverage_completed,completed_at,created_at,approved_at").order("created_at", { ascending: false }).limit(1000),
      supabase.from("event_video_workflows").select("id,event_id,status,assigned_editor_email,crew_reviewer_email,raw_media_url,external_media_url,crew_notes,updated_at,published_at").order("updated_at", { ascending: false }).limit(300),
    ]);
    if (eventResult.error) setActionMessage(`Could not load events: ${eventResult.error.message}`); else setEvents(eventResult.data || []);
    if (assignmentResult.error) setAssignments([]); else setAssignments(assignmentResult.data || []);
    if (workflowResult.error) setWorkflows([]); else setWorkflows(workflowResult.data || []);
    await loadTeamUsers();
  }

  async function init() {
    setLoading(true); setMessage("Checking access...");
    const sessionResult = await supabase.auth.getSession(); const currentUser = sessionResult.data?.session?.user || null; setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access Event Ops."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser); setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This Event Ops page is for admins only."); setLoading(false); return; }
    await loadData(); setMessage(""); setLoading(false);
  }

  async function updateEventStatus(status: string) {
    if (!selectedEventId) return; setActionMessage("Updating event status...");
    const payload: any = { status, approved: status === "approved" };
    if (status === "approved") { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("events").update(payload).eq("id", selectedEventId);
    if (error) { setActionMessage(`Event status update failed: ${error.message}`); return; }
    setActionMessage(`Event marked ${label(status)}.`); await loadData();
  }

  async function updateAssignment(item: any, status: string, completed = false) {
    setActionMessage("Updating crew/coverage request...");
    const payload: any = { status };
    if (status === "approved") { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    if (completed) { payload.coverage_completed = true; payload.completed_at = new Date().toISOString(); }
    const { error } = await supabase.from("event_crew_assignments").update(payload).eq("id", item.id);
    if (error) { setActionMessage(`Request update failed: ${error.message}`); return; }
    setActionMessage("Crew/coverage request updated."); await loadData();
  }

  function toggleCrewUser(userId: string) { setSelectedCrewUserIds((current) => current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId]); }
  function moveMonth(delta: number) { setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1)); }

  async function assignCrew() {
    if (!selectedEventId || selectedCrewUsers.length === 0) { setActionMessage("Select an event and choose one or more approved team members."); return; }
    setActionMessage("Assigning crew...");
    const rows = selectedCrewUsers.map((member) => ({ event_id: selectedEventId, user_id: member.user_id?.includes("@") ? null : member.user_id, user_email: member.email, assignment_type: normalizedRoleKey(selectedCrewRole), status: "approved", event_title: selectedEvent?.title || null, approved_by: user?.email || user?.id || null, approved_at: new Date().toISOString() }));
    const { error } = await supabase.from("event_crew_assignments").insert(rows);
    if (error) { setActionMessage(`Crew assignment failed: ${error.message}`); return; }
    setSelectedCrewUserIds([]); setSelectedCrewRole("General Crew"); setActionMessage(`${rows.length} crew member(s) assigned as ${selectedCrewRole}.`); await loadData();
  }

  async function createVideoWorkflow() {
    if (!selectedEventId) return;
    if (eventWorkflow) { setActionMessage("This event already has a video production workflow."); return; }
    setActionMessage("Creating video production workflow...");
    const notes = [`Priority: ${videoPriority}`, crewNotes.trim()].filter(Boolean).join("\n\n");
    const { error } = await supabase.from("event_video_workflows").insert({ event_id: selectedEventId, status: "ready_for_editing", assigned_editor_email: selectedEditorEmail || null, crew_reviewer_email: user?.email || null, raw_media_url: mediaUrl.trim() || null, crew_notes: notes || null, created_by: user?.id || null, updated_by: user?.id || null });
    if (error) { setActionMessage(`Video workflow failed: ${error.message}. Confirm supabase/event-video-production.sql was run.`); return; }
    setSelectedEditorEmail(""); setMediaUrl(""); setCrewNotes(""); setVideoPriority("Normal"); setActionMessage("Video workflow created. Event is ready for editing."); await loadData();
  }

  async function updateWorkflowStatus(status: string) {
    if (!eventWorkflow) return; setActionMessage("Updating video workflow...");
    const payload: any = { status, updated_by: user?.id || null, updated_at: new Date().toISOString() };
    if (status === "published_complete") payload.published_at = new Date().toISOString();
    const { error } = await supabase.from("event_video_workflows").update(payload).eq("id", eventWorkflow.id);
    if (error) { setActionMessage(`Video workflow update failed: ${error.message}`); return; }
    setActionMessage(`Video workflow moved to ${label(status)}.`); await loadData();
  }

  useEffect(() => { init(); }, []);

  function statusClass(status?: string | null) { const v = String(status || "").toLowerCase(); if (v === "approved") return "bg-green-50 text-green-700"; if (v === "pending") return "bg-yellow-50 text-yellow-800"; if (v.includes("hold")) return "bg-orange-50 text-orange-700"; if (v.includes("reject")) return "bg-red-50 text-red-700"; return "bg-slate-100 text-slate-700"; }
  function pillClass(active: boolean) { return active ? "bg-pink-50 text-pink-700 border-pink-100" : "bg-slate-50 text-slate-500 border-slate-100"; }

  function EventCard({ event }: { event: any }) {
    const active = selectedEventId === event.id; const stats = statsForEvent(event.id);
    return <button type="button" onClick={() => setSelectedEventId(event.id)} className={`w-full text-left rounded-2xl p-4 transition border shadow-sm hover:shadow-md ${active ? "border-pink-500 bg-pink-50 ring-2 ring-pink-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-black text-slate-950 truncate">{event.title}</h3><p className="text-sm text-gray-600 mt-1">{dateText(event.date)} · {event.location || "No location"}</p><p className="text-xs text-gray-500 mt-1 truncate">POC: {event.poc_email || "—"}</p></div><span className={`text-[11px] font-black px-2 py-1 rounded-full whitespace-nowrap ${statusClass(event.status)}`}>{label(event.status)}</span></div><div className="grid grid-cols-2 gap-2 mt-4"><div className={`rounded-xl border p-2 ${pillClass(stats.organizerRequested > 0)}`}><p className="text-xs font-black">Organizer Coverage</p><p className="text-[11px] mt-1">{stats.organizerRequested > 0 ? `${stats.organizerRequested} requested` : "No request"}</p></div><div className={`rounded-xl border p-2 ${pillClass(stats.crewRequested > 0)}`}><p className="text-xs font-black">Crew Requested</p><p className="text-[11px] mt-1">{stats.crewRequested > 0 ? `${stats.crewRequested} request(s)` : "None"}</p></div><div className={`rounded-xl border p-2 ${pillClass(stats.manuallyAssigned > 0)}`}><p className="text-xs font-black">Manual Assign</p><p className="text-[11px] mt-1">{stats.manuallyAssigned > 0 ? `${stats.manuallyAssigned} assigned` : "None"}</p></div><div className={`rounded-xl border p-2 ${pillClass(stats.approvedCrew > 0)}`}><p className="text-xs font-black">Crew Status</p><p className="text-[11px] mt-1">{stats.approvedCrew} approved · {stats.completedCoverage} complete</p></div></div><div className="flex flex-wrap gap-2 mt-3"><span className="text-[11px] rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-700">Video: {label(stats.videoStatus)}</span>{stats.pendingCrew > 0 && <span className="text-[11px] rounded-full bg-yellow-50 px-2 py-1 font-bold text-yellow-800">{stats.pendingCrew} pending</span>}</div></button>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="max-w-7xl mx-auto px-6 py-10"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><h1 className="text-4xl md:text-5xl font-black">Event Ops</h1><p className="text-slate-300 mt-2">One event control center: approval, coverage, crew, completion, and video production.</p>{user?.email && <p className="text-slate-400 text-sm mt-1">Logged in as {user.email} · Role: {role}</p>}</div><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button></div>{loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Access Required</h2><p className="text-gray-600 mt-3">{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}
      {!loading && canAccess && <div className="space-y-6">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<section className="bg-white text-slate-950 rounded-3xl p-6"><div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"><div><h2 className="text-2xl font-black">Select Event</h2><p className="text-gray-600 mt-1">Search by event name, location, POC email, phone, or status.</p></div><div className="flex gap-2"><button onClick={() => setEventView("cards")} className={`px-4 py-2 rounded-xl font-bold ${eventView === "cards" ? "bg-pink-600 text-white" : "bg-slate-100"}`}>Cards</button><button onClick={() => setEventView("calendar")} className={`px-4 py-2 rounded-xl font-bold ${eventView === "calendar" ? "bg-pink-600 text-white" : "bg-slate-100"}`}>Calendar</button></div></div><input value={eventSearch} onChange={(event) => setEventSearch(event.target.value)} placeholder="Search event name, POC, location, status..." className="border rounded-xl p-3 w-full mt-4" />{eventView === "cards" ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4 max-h-[560px] overflow-y-auto pr-1">{filteredEvents.map((event) => <EventCard key={event.id} event={event} />)}{filteredEvents.length === 0 && <p className="text-gray-500">No events match your search.</p>}</div> : <div className="mt-4"><div className="flex items-center justify-between mb-3"><button onClick={() => moveMonth(-1)} className="border px-3 py-2 rounded-lg font-bold">← Prev</button><h3 className="text-xl font-black">{calendarMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}</h3><button onClick={() => moveMonth(1)} className="border px-3 py-2 rounded-lg font-bold">Next →</button></div><div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-gray-500 mb-2">{WEEKDAYS.map((day) => <div key={day}>{day}</div>)}</div><div className="grid grid-cols-7 gap-2">{calendarCells.map((cell, index) => <div key={index} className="min-h-32 rounded-xl border bg-slate-50 p-2 overflow-hidden">{cell.day && <p className="font-black text-sm mb-1">{cell.day}</p>}<div className="space-y-1">{cell.events.slice(0, 3).map((event) => <button key={event.id} onClick={() => setSelectedEventId(event.id)} className={`block w-full rounded-lg p-1 text-left text-[11px] font-bold truncate ${selectedEventId === event.id ? "bg-pink-600 text-white" : "bg-white text-slate-900"}`}>{event.title}</button>)}{cell.events.length > 3 && <p className="text-[10px] text-gray-500">+{cell.events.length - 3} more</p>}</div></div>)}</div></div>}</section>
      {selectedEvent && <div className="grid xl:grid-cols-2 gap-6"><section className="bg-white text-slate-950 rounded-3xl p-6 space-y-4"><h2 className="text-2xl font-black">1. Event Approval</h2><div className="text-sm text-gray-700 space-y-1"><p><b>Event:</b> {selectedEvent.title}</p><p><b>Date:</b> {dateText(selectedEvent.date)}</p><p><b>Location:</b> {selectedEvent.location || "—"}</p><p><b>Current Status:</b> {label(selectedEvent.status)}</p>{selectedEvent.poc_email && <p><b>POC:</b> {selectedEvent.poc_email}</p>}</div><div className="flex flex-wrap gap-2">{EVENT_STATUSES.map((status) => <button key={status} onClick={() => updateEventStatus(status)} className={`px-4 py-2 rounded-lg font-bold ${selectedEvent.status === status ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-900"}`}>{label(status)}</button>)}</div></section><section className="bg-white text-slate-950 rounded-3xl p-6 space-y-4"><h2 className="text-2xl font-black">2. Crew / Coverage</h2><div className="grid gap-3">{eventAssignments.length === 0 && <p className="text-gray-600">No coverage or crew requests yet.</p>}{eventAssignments.map((item) => <article key={item.id} className="border rounded-xl p-4"><p className="font-black">{item.user_email || "No email"}</p><p className="text-sm text-gray-600">{label(item.assignment_type)} · {label(item.status)}{item.coverage_completed ? " · coverage completed" : ""}</p><div className="flex flex-wrap gap-2 mt-3"><button onClick={() => updateAssignment(item, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button><button onClick={() => updateAssignment(item, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button><button onClick={() => updateAssignment(item, item.status || "approved", true)} className="bg-slate-900 text-white px-3 py-2 rounded-lg font-bold text-sm">Mark Coverage Complete</button></div></article>)}</div><div className="border-t pt-4"><p className="font-black mb-2">Assign Crew Manually</p><div className="border rounded-2xl p-3 max-h-48 overflow-y-auto grid gap-2">{teamUsers.map((item) => <label key={`${item.user_id}-${item.email}`} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={selectedCrewUserIds.includes(item.user_id)} onChange={() => toggleCrewUser(item.user_id)} /><span><b>{item.name}</b> · {item.email} · {label(item.role)}</span></label>)}{teamUsers.length === 0 && <p className="text-sm text-gray-500">No approved team users found.</p>}</div><div className="flex flex-col sm:flex-row gap-2 mt-3"><select value={selectedCrewRole} onChange={(event) => setSelectedCrewRole(event.target.value)} className="border rounded-xl p-3 flex-1">{CREW_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select><button onClick={assignCrew} className="bg-pink-600 text-white px-4 py-3 rounded-xl font-black">Assign Selected ({selectedCrewUserIds.length})</button></div></div></section><section className="bg-white text-slate-950 rounded-3xl p-6 space-y-4 xl:col-span-2"><h2 className="text-2xl font-black">3. Video Production</h2><p className="text-sm text-gray-600">After coverage is complete, crew should submit raw media/notes. Admin can prioritize and assign editor here.</p>{!eventWorkflow ? <div className="grid md:grid-cols-2 gap-3"><input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="Raw footage / shared media URL" className="border rounded-xl p-3" /><select value={selectedEditorEmail} onChange={(event) => setSelectedEditorEmail(event.target.value)} className="border rounded-xl p-3"><option value="">Select editor / production lead...</option>{editorUsers.map((item) => <option key={`${item.email}-editor`} value={item.email}>{item.name} · {item.email} · {label(item.role)}</option>)}</select><select value={videoPriority} onChange={(event) => setVideoPriority(event.target.value)} className="border rounded-xl p-3 md:col-span-2">{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority} Priority</option>)}</select><textarea value={crewNotes} onChange={(event) => setCrewNotes(event.target.value)} placeholder="Coverage notes for editor: interviews, highlights, sponsor mentions, credits..." className="border rounded-xl p-3 md:col-span-2 min-h-24" /><button onClick={createVideoWorkflow} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black md:col-span-2">Create Video Workflow / Ready For Editing</button></div> : <div className="space-y-4"><div className="border rounded-xl p-4 bg-slate-50"><p><b>Status:</b> {label(eventWorkflow.status)}</p>{eventWorkflow.assigned_editor_email && <p><b>Editor:</b> {eventWorkflow.assigned_editor_email}</p>}{eventWorkflow.crew_notes && <p className="whitespace-pre-line text-sm mt-2"><b>Notes:</b> {eventWorkflow.crew_notes}</p>}{eventWorkflow.raw_media_url && <a href={eventWorkflow.raw_media_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Open raw media</a>}<p className="text-xs text-gray-500 mt-2">Updated {dateText(eventWorkflow.updated_at)}</p></div><div className="flex flex-wrap gap-2">{VIDEO_STATUSES.map((status) => <button key={status} onClick={() => updateWorkflowStatus(status)} className={`px-4 py-2 rounded-lg font-bold ${eventWorkflow.status === status ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-900"}`}>{label(status)}</button>)}<a href={`/studio/video-production/${eventWorkflow.id}`} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold">Open Full Workflow</a></div></div>}</section></div>}
      </div>}
      </section></main>
  );
}

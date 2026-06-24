"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const EVENT_STATUSES = ["pending", "approved", "on_hold", "rejected"];
const VIDEO_STATUSES = ["ready_for_editing", "in_editing", "awaiting_crew_review", "changes_requested", "awaiting_admin_approval", "approved_for_publishing"];
const CREW_ROLES = ["General Crew", "Host", "Reporter", "Camera", "Photography", "Production", "Editor", "Social Media"];
const PRIORITIES = ["Normal", "High", "Urgent", "Low"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type TabKey = "overview" | "approval" | "crew" | "influencers" | "video" | "email";
type BrowserMode = "cards" | "calendar" | "list";

function dateText(value?: string | null) {
  if (!value) return "—";
  const d = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}
function monthKey(value?: string | null) {
  const d = eventDate(value);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "No date";
}
function monthLabel(key: string) {
  if (key === "No date") return key;
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}
function eventDate(value?: string | null) {
  const d = value ? new Date(`${String(value).split("T")[0]}T00:00:00`) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}
function label(value?: string | null) { return String(value || "").replaceAll("_", " ") || "—"; }
function canBeAssigned(role?: string | null) { const value = String(role || "").toLowerCase(); return value.includes("admin") || value.includes("team") || value.includes("crew") || value.includes("editor") || value.includes("volunteer"); }
function canEditVideo(role?: string | null) { const value = String(role || "").toLowerCase(); return value.includes("admin") || value.includes("editor") || value.includes("production") || value.includes("radio"); }
function normalizedRoleKey(role: string) { return `manual_${role.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "crew"}`; }
function isNoContent(notes?: string | null) { return String(notes || "").toLowerCase().includes("no media content"); }
function socialPostFromNotes(notes?: string | null) {
  const text = String(notes || "");
  const marker = "Social Post Message:";
  const index = text.indexOf(marker);
  return index >= 0 ? text.slice(index + marker.length).trim() : "";
}
function statusClass(status?: string | null) {
  const v = String(status || "").toLowerCase();
  if (v === "approved" || v === "completed") return "bg-green-50 text-green-700 border-green-100";
  if (v === "pending") return "bg-yellow-50 text-yellow-800 border-yellow-100";
  if (v.includes("hold")) return "bg-orange-50 text-orange-700 border-orange-100";
  if (v.includes("reject")) return "bg-red-50 text-red-700 border-red-100";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function EventOpsV2Page() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [influencerIntents, setInfluencerIntents] = useState<any[]>([]);
  const [influencerProfiles, setInfluencerProfiles] = useState<Record<string, any>>({});
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [browserMode, setBrowserMode] = useState<BrowserMode>("cards");
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedCrewUserIds, setSelectedCrewUserIds] = useState<string[]>([]);
  const [selectedCrewRole, setSelectedCrewRole] = useState("General Crew");
  const [selectedEditorEmail, setSelectedEditorEmail] = useState("");
  const [videoPriority, setVideoPriority] = useState("Normal");
  const [socialPostMessage, setSocialPostMessage] = useState("");

  const canAccess = Boolean(user && isAdminRole(role));
  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);
  const eventAssignments = useMemo(() => assignments.filter((item) => item.event_id === selectedEventId), [assignments, selectedEventId]);
  const eventWorkflow = useMemo(() => workflows.find((item) => item.event_id === selectedEventId) || null, [workflows, selectedEventId]);
  const eventInfluencers = useMemo(() => influencerIntents.filter((item) => item.event_id === selectedEventId), [influencerIntents, selectedEventId]);
  const selectedCrewUsers = useMemo(() => teamUsers.filter((item) => selectedCrewUserIds.includes(item.user_id)), [teamUsers, selectedCrewUserIds]);
  const editorUsers = useMemo(() => teamUsers.filter((item) => canEditVideo(item.role)), [teamUsers]);
  const suggestedSocialPost = useMemo(() => eventAssignments.map((item) => String(item.coverage_notes || "")).find((note) => note.toLowerCase().includes("social")) || "", [eventAssignments]);

  function statsForEvent(eventId: string) {
    const rows = assignments.filter((item) => item.event_id === eventId);
    const workflow = workflows.find((item) => item.event_id === eventId);
    const influencers = influencerIntents.filter((item) => item.event_id === eventId);
    const approvedCrew = rows.filter((item) => String(item.status || "").toLowerCase() === "approved").length;
    const approvedInfluencers = influencers.filter((item) => ["approved", "completed"].includes(String(item.status || "").toLowerCase())).length;
    const pendingInfluencers = influencers.filter((item) => String(item.status || "pending").toLowerCase() === "pending").length;
    const submittedContent = rows.filter((item) => item.coverage_completed && !isNoContent(item.coverage_notes)).length;
    const pendingSubmission = rows.filter((item) => String(item.status || "").toLowerCase() === "approved" && !item.coverage_completed).length;
    const coverageReady = approvedCrew > 0 && approvedInfluencers > 0 ? "Fully Covered" : approvedCrew > 0 ? "Need Influencer" : approvedInfluencers > 0 ? "Need Crew" : "Uncovered";
    return {
      approvedCrew,
      pendingCrew: rows.filter((item) => String(item.status || "pending").toLowerCase() === "pending").length,
      crewRequested: rows.filter((item) => item.assignment_type === "team_member_request").length,
      organizerRequested: rows.filter((item) => item.assignment_type === "owner_coverage_request").length,
      manualAssigned: rows.filter((item) => String(item.assignment_type || "").startsWith("manual_")).length,
      submittedContent,
      noContent: rows.filter((item) => item.coverage_completed && isNoContent(item.coverage_notes)).length,
      pendingSubmission,
      influencerRequested: influencers.length,
      approvedInfluencers,
      pendingInfluencers,
      videoStatus: workflow?.status || "not_started",
      coverageReady,
    };
  }

  const selectedStats = selectedEventId ? statsForEvent(selectedEventId) : null;
  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    if (!q) return events;
    return events.filter((event) => `${event.title || ""} ${event.location || ""} ${event.poc_email || ""} ${event.poc_phone || ""} ${event.status || ""}`.toLowerCase().includes(q));
  }, [events, eventSearch]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredEvents.forEach((event) => {
      const key = monthKey(event.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([key, rows]) => [key, rows.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))] as [string, any[]]);
  }, [filteredEvents]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; events: any[] }> = [];
    for (let i = 0; i < first.getDay(); i++) cells.push({ day: null, events: [] });
    for (let day = 1; day <= days; day++) {
      const dayEvents = filteredEvents.filter((event) => {
        const d = eventDate(event.date);
        return d && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
      });
      cells.push({ day, events: dayEvents });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, events: [] });
    return cells;
  }, [filteredEvents, calendarMonth]);

  const allUpStats = useMemo(() => {
    const stats = events.map((event) => statsForEvent(event.id));
    const totalPendingActions = stats.reduce((sum, item) => sum + item.pendingCrew + item.pendingInfluencers + item.pendingSubmission, 0);
    return {
      totalEvents: events.length,
      approvedEvents: events.filter((event) => String(event.status || "").toLowerCase() === "approved").length,
      pendingEvents: events.filter((event) => String(event.status || "pending").toLowerCase() === "pending").length,
      fullyCovered: stats.filter((item) => item.coverageReady === "Fully Covered").length,
      needCoverage: stats.filter((item) => item.coverageReady !== "Fully Covered").length,
      pendingInfluencers: stats.reduce((sum, item) => sum + item.pendingInfluencers, 0),
      pendingCrew: stats.reduce((sum, item) => sum + item.pendingCrew, 0),
      contentSubmitted: stats.reduce((sum, item) => sum + item.submittedContent, 0),
      totalPendingActions,
    };
  }, [events, assignments, influencerIntents, workflows]);

  async function loadTeamUsers() {
    const adminResult = await supabase.from("admins").select("user_id,email,role,name,created_at").order("created_at", { ascending: false });
    if (adminResult.error) { setTeamUsers([]); return; }
    const adminRows = (adminResult.data || []).filter((item: any) => item.email && canBeAssigned(item.role));
    const emails = Array.from(new Set(adminRows.map((item: any) => String(item.email || "").toLowerCase()).filter(Boolean)));
    const userIds = Array.from(new Set(adminRows.map((item: any) => item.user_id).filter(Boolean))) as string[];
    const profileByEmail: Record<string, any> = {};
    const profileByUserId: Record<string, any> = {};
    if (emails.length > 0 || userIds.length > 0) {
      let profileQuery = supabase.from("volunteer_onboarding_submissions").select("user_id,email,full_name,photo_url,created_at");
      if (emails.length > 0 && userIds.length > 0) profileQuery = profileQuery.or(`email.in.(${emails.join(",")}),user_id.in.(${userIds.join(",")})`);
      else if (emails.length > 0) profileQuery = profileQuery.in("email", emails);
      else profileQuery = profileQuery.in("user_id", userIds);
      const { data } = await profileQuery.order("created_at", { ascending: false });
      (data || []).forEach((item: any) => {
        if (item.email && !profileByEmail[String(item.email).toLowerCase()]) profileByEmail[String(item.email).toLowerCase()] = item;
        if (item.user_id && !profileByUserId[item.user_id]) profileByUserId[item.user_id] = item;
      });
    }
    const seen = new Set<string>();
    setTeamUsers(adminRows.map((item: any) => {
      const email = String(item.email || "").toLowerCase();
      const profile = profileByUserId[item.user_id || ""] || profileByEmail[email] || {};
      return { user_id: item.user_id || profile.user_id || email, email, role: item.role || "team_member", name: profile.full_name || item.name || email };
    }).filter((item: any) => {
      const key = item.user_id || item.email;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""))));
  }

  async function loadData() {
    const [eventResult, assignmentResult, workflowResult, influencerResult] = await Promise.all([
      supabase.from("events").select("id,title,date,location,status,created_by,poc_email,poc_phone,ticket_url,description").order("date", { ascending: false }).limit(300),
      supabase.from("event_crew_assignments").select("id,event_id,user_id,user_email,assignment_type,status,event_title,coverage_completed,coverage_notes,completed_at,created_at,approved_at,crew_confirmed").order("created_at", { ascending: false }).limit(1000),
      supabase.from("event_video_workflows").select("id,event_id,status,assigned_editor_email,crew_reviewer_email,raw_media_url,external_media_url,crew_notes,updated_at,published_at").order("updated_at", { ascending: false }).limit(300),
      supabase.from("event_influencer_intents").select("*").order("created_at", { ascending: false }).limit(1000),
    ]);
    setEvents(eventResult.data || []);
    setAssignments(assignmentResult.data || []);
    setWorkflows(workflowResult.data || []);
    setInfluencerIntents(influencerResult.data || []);
    const profileIds = Array.from(new Set((influencerResult.data || []).map((item: any) => item.influencer_profile_id).filter(Boolean)));
    if (profileIds.length) {
      const { data } = await supabase.from("influencer_profiles").select("*").in("id", profileIds);
      const next: Record<string, any> = {};
      (data || []).forEach((item: any) => { next[item.id] = item; });
      setInfluencerProfiles(next);
    } else setInfluencerProfiles({});
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    const nextRole = currentUser ? await resolveUserRole(supabase, currentUser) : "";
    setRole(nextRole);
    if (!currentUser || !isAdminRole(nextRole)) { setMessage("Admin access required."); setLoading(false); return; }
    await Promise.all([loadData(), loadTeamUsers()]);
    setMessage("");
    setLoading(false);
  }

  function toggleCrewUser(userId: string) {
    setSelectedCrewUserIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  }

  async function updateEventStatus(status: string) {
    if (!selectedEventId) return;
    const { error } = await supabase.from("events").update({ status }).eq("id", selectedEventId);
    if (error) setActionMessage(`Event update failed: ${error.message}`);
    else { setActionMessage(`Event moved to ${label(status)}.`); await loadData(); }
  }

  async function updateAssignment(item: any, status: string) {
    const payload: any = { status };
    if (status === "approved") { payload.approved_by = user?.email || null; payload.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("event_crew_assignments").update(payload).eq("id", item.id);
    if (error) setActionMessage(`Crew request update failed: ${error.message}`);
    else { setActionMessage(`Crew request ${label(status)}.`); await loadData(); }
  }

  async function updateInfluencerIntent(id: string, status: string) {
    const { error } = await supabase.from("event_influencer_intents").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) setActionMessage(`Influencer update failed: ${error.message}`);
    else { setActionMessage(`Influencer request ${label(status)}.`); await loadData(); }
  }

  async function assignCrew() {
    if (!selectedEvent || selectedCrewUsers.length === 0) return;
    const roleKey = normalizedRoleKey(selectedCrewRole);
    const rows = selectedCrewUsers.map((member) => ({ event_id: selectedEvent.id, event_title: selectedEvent.title, user_id: member.user_id, user_email: member.email, assignment_type: roleKey, status: "approved", approved_by: user?.email || null, approved_at: new Date().toISOString(), crew_confirmed: false }));
    const { error } = await supabase.from("event_crew_assignments").insert(rows);
    if (error) setActionMessage(`Assign crew failed: ${error.message}`);
    else { setSelectedCrewUserIds([]); setActionMessage("Crew assigned."); await loadData(); }
  }

  function buildWorkflowNotes() {
    const submitted = eventAssignments.filter((item) => item.coverage_completed).map((item) => `${item.user_email || "Crew"}: ${item.coverage_notes || "Coverage completed"}`).join("\n\n");
    const post = socialPostMessage.trim() || socialPostFromNotes(eventWorkflow?.crew_notes) || suggestedSocialPost.trim();
    return [submitted || eventWorkflow?.crew_notes || "Started from Event Ops v2.", post ? `\n\nSocial Post Message:\n${post}` : ""].join("");
  }

  async function ensureVideoWorkflow() {
    if (!selectedEventId) return;
    if (eventWorkflow) return;
    const { error } = await supabase.from("event_video_workflows").insert({
      event_id: selectedEventId,
      status: "ready_for_editing",
      assigned_editor_email: selectedEditorEmail || null,
      crew_reviewer_email: user?.email || null,
      crew_notes: buildWorkflowNotes(),
      created_by: user?.id || null,
      updated_by: user?.id || null,
    });
    if (error) setActionMessage(`Video workflow failed: ${error.message}. Confirm supabase/event-video-production.sql was run.`);
    else { setActionMessage("Video workflow started from crew submissions."); await loadData(); }
  }

  async function updateWorkflowStatus(status: string) {
    const post = socialPostMessage.trim() || socialPostFromNotes(eventWorkflow?.crew_notes) || suggestedSocialPost.trim();
    if (status === "approved_for_publishing" && !post) { setActionMessage("Add the social post message before approving for publishing."); return; }
    if (!eventWorkflow) { await ensureVideoWorkflow(); return; }
    const payload: any = {
      status,
      assigned_editor_email: selectedEditorEmail || eventWorkflow.assigned_editor_email || null,
      crew_notes: buildWorkflowNotes(),
      updated_by: user?.id || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("event_video_workflows").update(payload).eq("id", eventWorkflow.id);
    if (error) { setActionMessage(`Video workflow update failed: ${error.message}`); return; }
    setActionMessage(status === "approved_for_publishing" ? "Approved for publishing and sent to editor." : `Video workflow moved to ${label(status)}.`);
    await loadData();
  }

  function coverageEmailBody() {
    const crewLines = eventAssignments.filter((item) => String(item.status || "").toLowerCase() === "approved").map((item) => `- ${item.user_email || "Crew member"} (${label(item.assignment_type)})`);
    const influencerLines = eventInfluencers.filter((item) => ["approved", "completed"].includes(String(item.status || "").toLowerCase())).map((item) => {
      const profile = influencerProfiles[item.influencer_profile_id] || {};
      return `- ${profile.full_name || item.user_email || "Influencer"} (${profile.email || item.user_email || "email not listed"})`;
    });
    return [`Hello,`, ``, `Sharing the current SDTV coverage plan for ${selectedEvent?.title || "your event"}.`, ``, `Event: ${selectedEvent?.title || "—"}`, `Date: ${dateText(selectedEvent?.date)}`, `Location: ${selectedEvent?.location || "—"}`, ``, `Crew Coverage:`, crewLines.length ? crewLines.join("\n") : "- Not assigned yet", ``, `Influencer Coverage:`, influencerLines.length ? influencerLines.join("\n") : "- Not approved yet", ``, `Video Status: ${label(eventWorkflow?.status || "not_started")}`, ``, `Thank you,`, `Seattle Desi TV Team`].join("\n");
  }

  useEffect(() => { init(); }, []);

  function openEvent(id: string) {
    setSelectedEventId(id);
    setActiveTab("overview");
  }

  function EventCard({ event }: { event: any }) {
    const active = selectedEventId === event.id;
    const stats = statsForEvent(event.id);
    return <button type="button" onClick={() => openEvent(event.id)} className={`w-full rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md ${active ? "border-pink-500 bg-pink-50 ring-2 ring-pink-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-slate-950">{event.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{dateText(event.date)} · {event.location || "No location"}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[11px] font-black ${statusClass(event.status)}`}>{label(event.status)}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{stats.approvedCrew}</p><p className="text-[11px] font-bold text-slate-500">Crew</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{stats.approvedInfluencers}</p><p className="text-[11px] font-bold text-slate-500">Influencers</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{stats.submittedContent}</p><p className="text-[11px] font-bold text-slate-500">Media</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">{stats.coverageReady}</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">Video: {label(stats.videoStatus)}</span>
        {(stats.pendingCrew + stats.pendingInfluencers) > 0 && <span className="rounded-full bg-yellow-50 px-2 py-1 text-[11px] font-bold text-yellow-800">{stats.pendingCrew + stats.pendingInfluencers} pending</span>}
      </div>
    </button>;
  }

  function EventBrowser() {
    return <aside className="rounded-3xl bg-white p-4 text-slate-950 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-hidden">
      <div className="mb-4">
        <h2 className="text-2xl font-black">Events</h2>
        <p className="text-sm text-slate-500">Search title, POC, location, or status.</p>
        <input value={eventSearch} onChange={(event) => setEventSearch(event.target.value)} placeholder="Search event title, POC, location, status..." className="mt-3 w-full rounded-xl border p-3" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["cards", "calendar", "list"] as BrowserMode[]).map((mode) => <button key={mode} onClick={() => setBrowserMode(mode)} className={`rounded-xl px-3 py-2 text-sm font-black capitalize ${browserMode === mode ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-700"}`}>{mode}</button>)}
        </div>
      </div>
      <div className="lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-1">
        {browserMode === "cards" && <div className="grid gap-3">{filteredEvents.map((event) => <EventCard key={event.id} event={event} />)}</div>}
        {browserMode === "list" && <div className="grid gap-5">
          {groupedEvents.map(([key, rows]) => <div key={key}>
            <h3 className="mb-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">{monthLabel(key)}</h3>
            <div className="grid gap-2">
              {rows.map((event) => <button key={event.id} onClick={() => openEvent(event.id)} className={`rounded-xl border p-3 text-left transition ${selectedEventId === event.id ? "border-pink-500 bg-pink-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                <p className="font-black">{event.title}</p>
                <p className="text-xs text-slate-500">{dateText(event.date)} · {label(event.status)}</p>
              </button>)}
            </div>
          </div>)}
        </div>}
        {browserMode === "calendar" && <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <button onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="rounded-lg border px-3 py-2 text-sm font-black">←</button>
            <h3 className="text-center text-base font-black">{calendarMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}</h3>
            <button onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="rounded-lg border px-3 py-2 text-sm font-black">→</button>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-500">{WEEKDAYS.map((day) => <div key={day}>{day}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, index) => <div key={index} className="min-h-20 rounded-xl border bg-slate-50 p-1">
              {cell.day && <p className="mb-1 text-xs font-black">{cell.day}</p>}
              {cell.events.slice(0, 2).map((event) => <button key={event.id} onClick={() => openEvent(event.id)} className={`mb-1 block w-full truncate rounded-md px-1 py-1 text-left text-[10px] font-bold ${selectedEventId === event.id ? "bg-pink-600 text-white" : "bg-white text-slate-900"}`}>{event.title}</button>)}
              {cell.events.length > 2 && <p className="text-[10px] font-bold text-slate-500">+{cell.events.length - 2}</p>}
            </div>)}
          </div>
        </div>}
      </div>
    </aside>;
  }

  function AllUpAnalytics() {
    return <div className="space-y-5">
      <div className="rounded-3xl bg-white p-6 text-slate-950">
        <h2 className="text-3xl font-black">All Event Analytics</h2>
        <p className="mt-2 text-slate-600">Select an event on the left to open the detailed operations workflow.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-3xl font-black">{allUpStats.totalEvents}</p><p className="text-xs font-bold text-slate-500">Total events</p></div>
          <div className="rounded-2xl bg-green-50 p-4"><p className="text-3xl font-black">{allUpStats.approvedEvents}</p><p className="text-xs font-bold text-slate-500">Approved events</p></div>
          <div className="rounded-2xl bg-yellow-50 p-4"><p className="text-3xl font-black">{allUpStats.totalPendingActions}</p><p className="text-xs font-bold text-slate-500">Pending actions</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-3xl font-black">{allUpStats.fullyCovered}</p><p className="text-xs font-bold text-slate-500">Fully covered</p></div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 text-slate-950">
          <h3 className="text-2xl font-black">Coverage Health</h3>
          <div className="mt-4 grid gap-3">
            <p><b>Need coverage:</b> {allUpStats.needCoverage}</p>
            <p><b>Pending crew requests:</b> {allUpStats.pendingCrew}</p>
            <p><b>Pending influencer requests:</b> {allUpStats.pendingInfluencers}</p>
            <p><b>Media submitted:</b> {allUpStats.contentSubmitted}</p>
          </div>
        </section>
        <section className="rounded-3xl bg-white p-6 text-slate-950">
          <h3 className="text-2xl font-black">Quick Filters To Use</h3>
          <p className="mt-4 text-slate-600">Use the search box with words like <b>pending</b>, <b>approved</b>, a venue name, organizer email, or event title.</p>
          <button onClick={() => setBrowserMode("list")} className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-black text-white">View Events by Month</button>
        </section>
      </div>
    </div>;
  }

  const tabs: Array<[TabKey, string]> = [["overview", "Overview"], ["approval", "Approval"], ["crew", "Crew"], ["influencers", "Influencers"], ["video", "Video"], ["email", "Email POC"]];

  return <main className="min-h-screen bg-slate-950 text-white">
    <StudioHeader />
    <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-black uppercase tracking-wide text-pink-300">Test page</p>
          <h1 className="text-4xl font-black md:text-5xl">Event Ops v2</h1>
          <p className="mt-2 text-slate-300">Cleaner event operations view with cards, calendar, monthly list, analytics, and all admin actions preserved.</p>
          {user?.email && <p className="mt-1 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/studio/event-ops" className="rounded-xl border border-white/20 px-4 py-3 font-bold text-white">Old Event Ops</a>
          {selectedEvent && <button onClick={() => setSelectedEventId("")} className="rounded-xl border border-white/20 px-4 py-3 font-bold text-white">All Analytics</button>}
          <button onClick={init} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950">Refresh</button>
        </div>
      </div>

      {loading && <div className="rounded-2xl border border-white/10 bg-white/10 p-6">{message}</div>}
      {!loading && !canAccess && <div className="max-w-xl rounded-2xl bg-white p-8 text-slate-950">{message}</div>}

      {!loading && canAccess && <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        {EventBrowser()}

        <section className="space-y-5">
          {actionMessage && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}
          {!selectedEvent && <AllUpAnalytics />}

          {selectedEvent && selectedStats && <>
            <div className="rounded-3xl bg-white p-5 text-slate-950">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(selectedEvent.status)}`}>{label(selectedEvent.status)}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{selectedStats.coverageReady}</span>
                  </div>
                  <h2 className="text-3xl font-black">{selectedEvent.title}</h2>
                  <p className="mt-1 text-slate-600">{dateText(selectedEvent.date)} · {selectedEvent.location || "No location"}</p>
                  <p className="mt-1 text-sm text-slate-500">POC: {selectedEvent.poc_email || "—"} {selectedEvent.poc_phone ? `· ${selectedEvent.poc_phone}` : ""}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[420px]">
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black">{selectedStats.approvedCrew}</p><p className="text-xs font-bold text-slate-500">Crew approved</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black">{selectedStats.approvedInfluencers}</p><p className="text-xs font-bold text-slate-500">Influencers</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black">{selectedStats.submittedContent}</p><p className="text-xs font-bold text-slate-500">Media submitted</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black">{selectedStats.pendingCrew + selectedStats.pendingInfluencers}</p><p className="text-xs font-bold text-slate-500">Pending actions</p></div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 text-slate-950">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {tabs.map(([key, text]) => <button key={key} onClick={() => setActiveTab(key)} className={`whitespace-nowrap rounded-xl px-4 py-2 font-black ${activeTab === key ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-700"}`}>{text}</button>)}
              </div>
            </div>

            {activeTab === "overview" && <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-3xl bg-white p-6 text-slate-950"><h3 className="text-2xl font-black">Coverage Story</h3><div className="mt-4 grid gap-3"><p><b>Event status:</b> {label(selectedEvent.status)}</p><p><b>Crew:</b> {selectedStats.approvedCrew} approved, {selectedStats.pendingCrew} pending</p><p><b>Influencers:</b> {selectedStats.approvedInfluencers} approved, {selectedStats.pendingInfluencers} pending</p><p><b>Video:</b> {label(selectedStats.videoStatus)}</p><p><b>Publishing readiness:</b> {selectedStats.submittedContent} content submitted, {selectedStats.pendingSubmission} pending</p></div></section>
              <section className="rounded-3xl bg-white p-6 text-slate-950"><h3 className="text-2xl font-black">Fast Actions</h3><div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={() => setActiveTab("approval")} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Manage Approval</button><button onClick={() => setActiveTab("crew")} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Assign Crew</button><button onClick={() => setActiveTab("influencers")} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Review Influencers</button><button onClick={() => setActiveTab("video")} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Video Workflow</button></div></section>
            </div>}

            {activeTab === "approval" && <section className="rounded-3xl bg-white p-6 text-slate-950"><h3 className="text-2xl font-black">Event Approval</h3><p className="mt-2 text-slate-600">Current status: <b>{label(selectedEvent.status)}</b></p><div className="mt-5 flex flex-wrap gap-2">{EVENT_STATUSES.map((status) => <button key={status} onClick={() => updateEventStatus(status)} className={`rounded-xl px-4 py-3 font-black ${selectedEvent.status === status ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-950"}`}>{label(status)}</button>)}</div></section>}

            {activeTab === "crew" && <section className="rounded-3xl bg-white p-6 text-slate-950"><div className="flex flex-col gap-1"><h3 className="text-2xl font-black">Crew / Coverage</h3><p className="text-sm text-slate-500">Approve requests, reject requests, and manually assign crew.</p></div><div className="mt-5 grid gap-3">{eventAssignments.length === 0 && <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">No coverage or crew requests yet.</p>}{eventAssignments.map((item) => { const pending = String(item.status || "").toLowerCase() === "pending"; return <article key={item.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black">{item.user_email || "No email"}</p><p className="text-sm text-slate-600">{label(item.assignment_type)} · {label(item.status)}{item.crew_confirmed ? " · crew confirmed" : String(item.status || "").toLowerCase() === "approved" ? " · awaiting crew confirmation" : ""}{item.coverage_completed ? isNoContent(item.coverage_notes) ? " · no content" : " · submitted" : ""}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(item.status)}`}>{label(item.status)}</span></div>{item.coverage_notes && <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{item.coverage_notes}</p>}{pending && <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => updateAssignment(item, "approved")} className="rounded-xl bg-green-600 px-4 py-2 font-black text-white">Approve Request</button><button onClick={() => updateAssignment(item, "rejected")} className="rounded-xl bg-red-600 px-4 py-2 font-black text-white">Reject Request</button></div>}</article>; })}</div><div className="mt-6 border-t pt-5"><p className="mb-3 font-black">Assign Crew Manually</p><div className="grid max-h-64 gap-2 overflow-y-auto rounded-2xl border p-3">{teamUsers.map((item) => <label key={`${item.user_id}-${item.email}`} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm"><input type="checkbox" checked={selectedCrewUserIds.includes(item.user_id)} onChange={() => toggleCrewUser(item.user_id)} /><span><b>{item.name}</b> · {item.email} · {label(item.role)}</span></label>)}</div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={selectedCrewRole} onChange={(event) => setSelectedCrewRole(event.target.value)} className="flex-1 rounded-xl border p-3">{CREW_ROLES.map((crewRole) => <option key={crewRole} value={crewRole}>{crewRole}</option>)}</select><button onClick={assignCrew} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Assign Selected ({selectedCrewUserIds.length})</button></div></div></section>}

            {activeTab === "influencers" && <section className="rounded-3xl bg-white p-6 text-slate-950"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-2xl font-black">Influencer Coverage</h3><p className="text-sm text-slate-500">Approve, reject, or mark influencer event collabs completed.</p></div><a href="/studio/influencer-ops" className="rounded-xl bg-slate-900 px-4 py-3 text-center font-black text-white">Open Influencer Ops</a></div><div className="mt-5 grid gap-3">{eventInfluencers.length === 0 && <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">No influencer requests for this event yet.</p>}{eventInfluencers.map((item) => { const profile = influencerProfiles[item.influencer_profile_id] || {}; return <article key={item.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black">{profile.full_name || item.user_email || "Influencer"}</p><p className="text-sm text-slate-600">{profile.email || item.user_email || "No email"} · {profile.city || "Washington"} · {profile.niche || "Influencer"}</p><p className="mt-1 text-sm text-slate-500">Platforms: {item.expected_platforms || "Not specified"}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(item.status || "pending")}`}>{label(item.status || "pending")}</span></div>{item.collab_note && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{item.collab_note}</p>}<div className="mt-3 flex flex-wrap gap-2"><button onClick={() => updateInfluencerIntent(item.id, "approved")} className="rounded-xl bg-green-600 px-4 py-2 font-black text-white">Approve</button><button onClick={() => updateInfluencerIntent(item.id, "completed")} className="rounded-xl bg-slate-900 px-4 py-2 font-black text-white">Completed</button><button onClick={() => updateInfluencerIntent(item.id, "rejected")} className="rounded-xl bg-red-600 px-4 py-2 font-black text-white">Reject</button></div></article>; })}</div></section>}

            {activeTab === "video" && <section className="rounded-3xl bg-white p-6 text-slate-950"><h3 className="text-2xl font-black">Video Production</h3><p className="mt-1 text-sm text-slate-500">Start workflow, assign editor, request review, request changes, and approve for publishing.</p><div className="mt-5 grid gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black">{selectedStats.approvedCrew}</p><p className="text-xs font-bold text-slate-500">Assigned</p></div><div className="rounded-2xl bg-green-50 p-3"><p className="text-2xl font-black">{selectedStats.submittedContent}</p><p className="text-xs font-bold text-slate-500">Submitted</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black">{selectedStats.noContent}</p><p className="text-xs font-bold text-slate-500">No Content</p></div><div className="rounded-2xl bg-yellow-50 p-3"><p className="text-2xl font-black">{selectedStats.pendingSubmission}</p><p className="text-xs font-bold text-slate-500">Pending</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-2"><select value={selectedEditorEmail || eventWorkflow?.assigned_editor_email || ""} onChange={(event) => setSelectedEditorEmail(event.target.value)} className="rounded-xl border p-3"><option value="">Select editor / production lead...</option>{editorUsers.map((item) => <option key={`${item.email}-editor`} value={item.email}>{item.name} · {item.email} · {label(item.role)}</option>)}</select><select value={videoPriority} onChange={(event) => setVideoPriority(event.target.value)} className="rounded-xl border p-3">{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority} Priority</option>)}</select></div><textarea value={socialPostMessage || socialPostFromNotes(eventWorkflow?.crew_notes) || suggestedSocialPost} onChange={(event) => setSocialPostMessage(event.target.value)} placeholder="Social post message required before approving for publishing" className="mt-4 min-h-28 w-full rounded-xl border p-3" /><div className="mt-4 flex flex-wrap gap-2"><button onClick={ensureVideoWorkflow} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Start / Sync Workflow</button>{VIDEO_STATUSES.map((status) => <button key={status} onClick={() => updateWorkflowStatus(status)} className={`rounded-xl px-4 py-3 font-black ${eventWorkflow?.status === status ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-950"}`}>{label(status)}</button>)}</div>{eventWorkflow && <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><b>Status:</b> {label(eventWorkflow.status)}<br /><b>Editor:</b> {eventWorkflow.assigned_editor_email || "Not assigned"}<br /><b>Updated:</b> {eventWorkflow.updated_at ? new Date(eventWorkflow.updated_at).toLocaleString() : "—"}</p>}</section>}

            {activeTab === "email" && <section className="rounded-3xl bg-white p-6 text-slate-950"><h3 className="text-2xl font-black">Email Event POC</h3><p className="mt-2 text-slate-600">Send this coverage summary to the event organizer using your email client.</p><textarea readOnly value={coverageEmailBody()} className="mt-4 min-h-72 w-full rounded-xl border bg-slate-50 p-3" /><a href={`mailto:${selectedEvent.poc_email || ""}?subject=${encodeURIComponent(`SDTV coverage plan - ${selectedEvent.title}`)}&body=${encodeURIComponent(coverageEmailBody())}`} className="mt-4 inline-block rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Open Email Draft</a></section>}
          </>}
        </section>
      </div>}
    </section>
  </main>;
}

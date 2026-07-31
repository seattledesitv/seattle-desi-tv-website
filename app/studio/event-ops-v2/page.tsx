"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const EVENT_STATUSES = ["pending", "approved", "on_hold", "rejected"];
const CREW_ROLES = ["General Crew", "Host", "Reporter", "Camera", "Photography", "Production", "Editor", "Social Media"];
const VIDEO_STATUSES = ["ready_for_editing", "in_editing", "awaiting_crew_review", "changes_requested", "awaiting_admin_approval", "approved_for_publishing", "published_complete"];
type TabKey = "overview" | "edit" | "approval" | "crew" | "influencers" | "brief" | "video" | "communications" | "admin_poc" | "timeline";
type Audience = "poc" | "crew" | "influencers" | "editor";
type Poc = { admin_user_id?: string | null; admin_email?: string; admin_name?: string; admin_phone?: string; admin_photo_url?: string };

function dateText(v?: string | null) { if (!v) return "—"; const d = new Date(`${String(v).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString(); }
function timeText(v?: string | null) { if (!v) return ""; const d = new Date(v); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(); }
function dateInput(v?: string | null) { return String(v || "").split("T")[0]; }
function monthInput(v?: string | null) { return dateInput(v).slice(0, 7); }
function label(v?: string | null) { return String(v || "").replaceAll("_", " ") || "—"; }
function eventImages(row: any) { const urls = Array.isArray(row?.image_urls) ? row.image_urls.filter(Boolean) : []; if (row?.image && !urls.includes(row.image)) urls.unshift(row.image); return urls; }
function statusClass(status?: string | null) { const v = String(status || "").toLowerCase(); if (["approved", "completed", "published_complete"].includes(v)) return "bg-green-50 text-green-700 border-green-100"; if (v === "pending") return "bg-yellow-50 text-yellow-800 border-yellow-100"; if (v.includes("reject")) return "bg-red-50 text-red-700 border-red-100"; return "bg-slate-100 text-slate-700 border-slate-200"; }
function Field({ label, children }: { label: string; children: any }) { return <label className="grid gap-1 text-sm font-black text-slate-800"><span>{label}</span>{children}</label>; }
function FieldRow({ label, value }: { label: string; value: any }) { return <p><b>{label}:</b><br />{value || "—"}</p>; }
function Metric({ title, value, tone = "slate" }: { title: string; value: any; tone?: "slate" | "green" | "yellow" | "pink" }) { const bg = tone === "green" ? "bg-green-50" : tone === "yellow" ? "bg-yellow-50" : tone === "pink" ? "bg-pink-50" : "bg-slate-50"; return <div className={`rounded-2xl ${bg} p-4`}><p className="text-3xl font-black">{value}</p><p className="text-xs font-bold text-slate-500">{title}</p></div>; }
function TimelineItem({ done, title, detail, when }: { done?: boolean; title: string; detail?: string; when?: string }) { return <div className="flex gap-3"><span className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${done ? "bg-green-600 text-white" : "bg-slate-200 text-slate-500"}`}>{done ? "✓" : "•"}</span><div className="flex-1 rounded-2xl border bg-white p-4"><p className="font-black">{title}</p>{detail && <p className="mt-1 text-sm text-slate-600">{detail}</p>}{when && <p className="mt-1 text-xs font-bold text-slate-400">{when}</p>}</div></div>; }
function isNoContent(notes?: string | null) { return String(notes || "").toLowerCase().includes("no media content"); }
function roleKey(role: string) { return `manual_${role.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "crew"}`; }
function cleanPhone(v?: string | null) { return String(v || "").replace(/[^0-9+]/g, ""); }
function whatsappUrl(phone?: string | null, text?: string) { const n = cleanPhone(phone).replace(/^\+/, ""); return n ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}` : ""; }
function getPocs(row: any): Poc[] { const list = Array.isArray(row?.pocs) && row.pocs.length ? row.pocs : row?.admin_email ? [row] : []; return list.filter((p: Poc) => p?.admin_email || p?.admin_name); }
function pocLabel(row: any) { const list = getPocs(row); if (!list.length) return "not assigned"; if (list.length === 1) return list[0].admin_name || list[0].admin_email || "assigned"; return `${list.length} POCs assigned`; }
function blankPoc(): Poc { return { admin_user_id: "", admin_email: "", admin_name: "", admin_phone: "", admin_photo_url: "" }; }

export default function EventOpsV2Page() {
  const [loading, setLoading] = useState(true); const [message, setMessage] = useState("Checking access..."); const [actionMessage, setActionMessage] = useState(""); const [user, setUser] = useState<any>(null); const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]); const [assignments, setAssignments] = useState<any[]>([]); const [workflows, setWorkflows] = useState<any[]>([]); const [teamUsers, setTeamUsers] = useState<any[]>([]); const [intents, setIntents] = useState<any[]>([]); const [profiles, setProfiles] = useState<Record<string, any>>({}); const [userProfiles, setUserProfiles] = useState<any[]>([]); const [eventPocs, setEventPocs] = useState<Record<string, any>>({});
  const [selectedEventId, setSelectedEventId] = useState(""); const [eventSearch, setEventSearch] = useState(""); const [monthFilter, setMonthFilter] = useState(""); const [statusFilter, setStatusFilter] = useState("all"); const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [editForm, setEditForm] = useState<any>({}); const [imageUrlInput, setImageUrlInput] = useState(""); const [selectedCrewUserIds, setSelectedCrewUserIds] = useState<string[]>([]); const [selectedCrewRole, setSelectedCrewRole] = useState("General Crew");
  const [selectedEditorEmail, setSelectedEditorEmail] = useState(""); const [selectedPriority, setSelectedPriority] = useState(10); const [briefNotes, setBriefNotes] = useState(""); const [audience, setAudience] = useState<Audience>("poc"); const [manualRecipient, setManualRecipient] = useState(""); const [selectedRecipientEmails, setSelectedRecipientEmails] = useState<string[]>([]); const [commSubject, setCommSubject] = useState(""); const [commMessage, setCommMessage] = useState("");
  const [pocForm, setPocForm] = useState<any>({ pocs: [blankPoc()], notes: "" });
  const canAccess = Boolean(user && isAdminRole(role));
  const selectedEvent = useMemo(() => events.find((e) => e.id === selectedEventId) || null, [events, selectedEventId]);
  const selectedPoc = selectedEventId ? eventPocs[selectedEventId] || null : null;
  const selectedPocList = getPocs(selectedPoc);
  const eventAssignments = assignments.filter((a) => a.event_id === selectedEventId); const pendingCrew = eventAssignments.filter((a) => String(a.status || "pending") === "pending"); const approvedCrew = eventAssignments.filter((a) => String(a.status || "") === "approved"); const submittedCrew = approvedCrew.filter((a) => a.coverage_completed && !isNoContent(a.coverage_notes)); const waitingCrew = approvedCrew.filter((a) => !a.coverage_completed); const noContentCrew = approvedCrew.filter((a) => a.coverage_completed && isNoContent(a.coverage_notes));
  const eventWorkflow = workflows.find((w) => w.event_id === selectedEventId) || null; const eventInfluencers = intents.filter((i) => i.event_id === selectedEventId); const pendingInfluencers = eventInfluencers.filter((i) => String(i.status || "pending") === "pending"); const approvedInfluencers = eventInfluencers.filter((i) => String(i.status || "") === "approved"); const completedInfluencers = eventInfluencers.filter((i) => String(i.status || "") === "completed"); const rejectedInfluencers = eventInfluencers.filter((i) => String(i.status || "") === "rejected");
  const editorUsers = teamUsers.filter((u) => {
  const roleText = `${u.role || ""} ${(u.roles || []).join(" ")}`.toLowerCase();

  return (
    roleText.includes("super_admin") ||
    roleText.includes("pm_admin") ||
    roleText.includes("admin") ||
    roleText.includes("video_editor") ||
    roleText.includes("editor") ||
    roleText.includes("production")
  );
});
  const filteredEvents = events.filter((e) => { const q = eventSearch.trim().toLowerCase(); if (statusFilter !== "all" && String(e.status || "pending") !== statusFilter) return false; if (monthFilter && monthInput(e.date) !== monthFilter) return false; if (!q) return true; return `${e.title || ""} ${e.location || ""} ${e.poc_email || ""}`.toLowerCase().includes(q); });
  function statsForEvent(eventId: string) { const rows = assignments.filter((a) => a.event_id === eventId); const infl = intents.filter((i) => i.event_id === eventId); const wf = workflows.find((w) => w.event_id === eventId); return { crew: rows.filter((a) => String(a.status || "") === "approved").length, pendingCrew: rows.filter((a) => String(a.status || "pending") === "pending").length, influencers: infl.filter((i) => ["approved", "completed"].includes(String(i.status || ""))).length, pendingInfluencers: infl.filter((i) => String(i.status || "pending") === "pending").length, submitted: rows.filter((a) => a.coverage_completed && !isNoContent(a.coverage_notes)).length, videoStatus: wf?.status || "not_started" }; }
  const selectedStats = selectedEventId ? statsForEvent(selectedEventId) : null;

 async function loadData() {
  const [er, ar, wr, ir, up, admins, team, roleRequests, pocResult] =
    await Promise.all([
      supabase
        .from("events")
        .select("id,title,date,location,status,created_by,poc_email,poc_phone,ticket_url,description,image,image_urls,featured,created_at")
        .order("date", { ascending: false })
        .limit(300),

      supabase
        .from("event_crew_assignments")
        .select("id,event_id,user_id,user_email,assignment_type,status,event_title,coverage_completed,coverage_notes,completed_at,created_at,approved_at,crew_confirmed,approved_by")
        .order("created_at", { ascending: false })
        .limit(1000),

      supabase
        .from("event_video_workflows")
        .select("id,event_id,status,assigned_editor_email,crew_reviewer_email,raw_media_url,external_media_url,crew_notes,updated_at,published_at,priority")
        .order("updated_at", { ascending: false })
        .limit(300),

      supabase
        .from("event_influencer_intents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),

      supabase
        .from("user_profiles")
        .select("user_id,email,full_name,preferred_display_name,profile_photo_url")
        .limit(1000),

      supabase
        .from("admins")
        .select("user_id,email,role,name,created_at")
        .order("created_at", { ascending: false }),

      supabase
        .from("team_members")
        .select("name,email,image,user_id")
        .limit(1000),

      supabase
        .from("user_role_requests")
        .select("user_id,email,approved_role,requested_role,status")
        .eq("status", "approved"),

      supabase
        .from("event_admin_pocs")
        .select("*"),
    ]);

  if (er.error) setActionMessage(er.error.message);
  if (pocResult.error) {
    setActionMessage("Event Admin POC table is not ready. Run supabase/event-admin-poc.sql.");
  }

  setEvents(er.data || []);
  setAssignments(ar.data || []);
  setWorkflows(wr.data || []);
  setIntents(ir.data || []);
  setUserProfiles(up.data || []);

  const profileByUser: Record<string, any> = {};
  const profileByEmail: Record<string, any> = {};
  const teamByEmail: Record<string, any> = {};
  const roleByEmail: Record<string, string[]> = {};

  (up.data || []).forEach((p: any) => {
    const email = String(p.email || "").toLowerCase();
    if (p.user_id) profileByUser[p.user_id] = p;
    if (email) profileByEmail[email] = p;
  });

  (team.data || []).forEach((t: any) => {
    const email = String(t.email || "").toLowerCase();
    if (email) teamByEmail[email] = t;
  });

  (roleRequests.data || []).forEach((r: any) => {
    const email = String(r.email || "").toLowerCase();
    const approvedRole = String(r.approved_role || r.requested_role || "").toLowerCase();

    if (!email || !approvedRole) return;

    if (!roleByEmail[email]) roleByEmail[email] = [];
    if (!roleByEmail[email].includes(approvedRole)) {
      roleByEmail[email].push(approvedRole);
    }
  });

  const adminRows = (admins.data || [])
    .filter((i: any) => i.email)
    .map((i: any) => {
      const email = String(i.email || "").toLowerCase();
      const profile = profileByUser[i.user_id || ""] || profileByEmail[email] || {};
      const teamRow = teamByEmail[email] || {};
      const roles = Array.from(
        new Set([String(i.role || "admin").toLowerCase(), ...(roleByEmail[email] || [])])
      );

      return {
        user_id: i.user_id || i.email,
        email,
        role: roles.join(","),
        roles,
        name: i.name || profile.full_name || profile.preferred_display_name || teamRow.name || i.email,
        photo: profile.profile_photo_url || teamRow.image || "",
      };
    });

  const teamRows = (team.data || [])
    .filter((t: any) => t.email)
    .map((t: any) => {
      const email = String(t.email || "").toLowerCase();
      const profile = profileByUser[t.user_id || ""] || profileByEmail[email] || {};
      const roles = Array.from(new Set(["team_member", ...(roleByEmail[email] || [])]));

      return {
        user_id: t.user_id || profile.user_id || t.email,
        email,
        role: roles.join(","),
        roles,
        name: t.name || profile.full_name || profile.preferred_display_name || t.email,
        photo: profile.profile_photo_url || t.image || "",
      };
    });

  const roleOnlyRows = Object.keys(roleByEmail)
    .filter((email) => !teamByEmail[email])
    .map((email) => {
      const profile = profileByEmail[email] || {};
      const roles = roleByEmail[email] || [];

      return {
        user_id: profile.user_id || email,
        email,
        role: roles.join(","),
        roles,
        name: profile.full_name || profile.preferred_display_name || email,
        photo: profile.profile_photo_url || "",
      };
    });

  const byEmail = new Map<string, any>();

  [...teamRows, ...roleOnlyRows, ...adminRows].forEach((person) => {
    if (person.email) byEmail.set(person.email, person);
  });

  setTeamUsers(
    Array.from(byEmail.values()).sort((a: any, b: any) =>
      String(a.name).localeCompare(String(b.name))
    )
  );

  const pocMap: Record<string, any> = {};
  (pocResult.data || []).forEach((p: any) => {
    pocMap[p.event_id] = p;
  });
  setEventPocs(pocMap);

  const ids = Array.from(
    new Set((ir.data || []).map((i: any) => i.influencer_profile_id).filter(Boolean))
  );

  if (ids.length) {
    const { data } = await supabase.from("influencer_profiles").select("*").in("id", ids);
    const next: Record<string, any> = {};
    (data || []).forEach((p: any) => {
      next[p.id] = p;
    });
    setProfiles(next);
  } else {
    setProfiles({});
  }
}
  async function init() { setLoading(true); const { data } = await supabase.auth.getUser(); const currentUser = data?.user || null; setUser(currentUser); const nextRole = currentUser ? await resolveUserRole(supabase, currentUser) : ""; setRole(nextRole); if (!currentUser || !isAdminRole(nextRole)) { setMessage("Admin access required."); setLoading(false); return; } await loadData(); setMessage(""); setLoading(false); }
  useEffect(() => { init(); }, []);
  useEffect(() => { if (!selectedEvent) return; setEditForm({ title: selectedEvent.title || "", date: dateInput(selectedEvent.date), location: selectedEvent.location || "", description: selectedEvent.description || "", poc_email: selectedEvent.poc_email || "", poc_phone: selectedEvent.poc_phone || "", ticket_url: selectedEvent.ticket_url || "", image_urls: eventImages(selectedEvent) }); const p = eventPocs[selectedEvent.id] || {}; const list = getPocs(p); setPocForm({ pocs: list.length ? list : [blankPoc()], notes: p.notes || "" }); }, [selectedEventId, eventPocs]);
  useEffect(() => {
  if (eventWorkflow) {
    setSelectedPriority(eventWorkflow.priority ?? 10);
  } else {
    setSelectedPriority(10);
  }
}, [eventWorkflow]);
  function openEvent(id: string) { setSelectedEventId(id); setActiveTab("overview"); }
  function openCommunications(nextAudience: Audience) { setAudience(nextAudience); setActiveTab("communications"); }
  function selectedCrewUsers() { return teamUsers.filter((u) => selectedCrewUserIds.includes(u.user_id)); }
  function chooseAdmin(id: string, index: number) { const admin = teamUsers.find((u) => String(u.user_id) === id || String(u.email) === id); if (!admin) return; const next = [...(pocForm.pocs || [])]; next[index] = { ...(next[index] || blankPoc()), admin_user_id: admin.user_id || null, admin_email: admin.email, admin_name: admin.name, admin_photo_url: admin.photo || next[index]?.admin_photo_url || "", admin_phone: next[index]?.admin_phone || "" }; setPocForm({ ...pocForm, pocs: next }); }
  function updatePoc(index: number, patch: Partial<Poc>) { const next = [...(pocForm.pocs || [])]; next[index] = { ...(next[index] || blankPoc()), ...patch }; setPocForm({ ...pocForm, pocs: next }); }
  function addPoc() { setPocForm({ ...pocForm, pocs: [...(pocForm.pocs || []), blankPoc()] }); }
  function removePoc(index: number) { const next = (pocForm.pocs || []).filter((_p: Poc, i: number) => i !== index); setPocForm({ ...pocForm, pocs: next.length ? next : [blankPoc()] }); }
  async function updateEventStatus(status: string) { if (!selectedEventId) return; const { error } = await supabase.from("events").update({ status }).eq("id", selectedEventId); if (error) setActionMessage(`Event update failed: ${error.message}`); else { setActionMessage(`Event moved to ${label(status)}.`); await loadData(); } }
  async function saveEventEdits() { const urls = (editForm.image_urls || []).filter(Boolean); const payload = { title: editForm.title || null, date: editForm.date || null, location: editForm.location || null, description: editForm.description || null, poc_email: editForm.poc_email || null, poc_phone: editForm.poc_phone || null, ticket_url: editForm.ticket_url || null, image: urls[0] || null, image_urls: urls.length ? urls : null }; const { error } = await supabase.from("events").update(payload).eq("id", selectedEventId); if (error) setActionMessage(`Event save failed: ${error.message}`); else { setActionMessage("Event details and images saved."); await loadData(); } }
  async function saveAdminPoc() { if (!selectedEventId) return; const { data } = await supabase.auth.getSession(); const token = data.session?.access_token || ""; const response = await fetch("/api/studio/event-poc", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" }, body: JSON.stringify({ event_id: selectedEventId, notes: pocForm.notes || "", pocs: (pocForm.pocs || []).filter((p: Poc) => p.admin_email || p.admin_name) }) }); const result = await response.json().catch(() => ({})); if (!response.ok) setActionMessage(result.error || "Could not save Admin POC."); else { setActionMessage(result.message || "Admin POCs saved for this event."); await loadData(); } }
  async function updateAssignment(item: any, status: string) { const payload: any = { status }; if (status === "approved") { payload.approved_by = user?.email || null; payload.approved_at = new Date().toISOString(); } const { error } = await supabase.from("event_crew_assignments").update(payload).eq("id", item.id); if (error) setActionMessage(`Crew request update failed: ${error.message}`); else { setActionMessage(`Crew request ${label(status)}.`); await loadData(); } }
  async function updateInfluencerIntent(id: string, status: string) { const { error } = await supabase.from("event_influencer_intents").update({ status, updated_at: new Date().toISOString() }).eq("id", id); if (error) setActionMessage(`Influencer update failed: ${error.message}`); else { setActionMessage(`Influencer request ${label(status)}.`); await loadData(); } }
  async function assignCrew() { if (!selectedEvent || selectedCrewUsers().length === 0) return; const rows = selectedCrewUsers().map((m) => ({ event_id: selectedEvent.id, event_title: selectedEvent.title, user_id: m.user_id, user_email: m.email, assignment_type: roleKey(selectedCrewRole), status: "approved", approved_by: user?.email || null, approved_at: new Date().toISOString(), crew_confirmed: false })); const { error } = await supabase.from("event_crew_assignments").insert(rows); if (error) setActionMessage(`Assign crew failed: ${error.message}`); else { setSelectedCrewUserIds([]); setActionMessage("Crew assigned."); await loadData(); } }
async function ensureVideoWorkflow() {
  if (!selectedEventId) return;

  const payload = {
    status: "ready_for_editing",
    assigned_editor_email: selectedEditorEmail || eventWorkflow?.assigned_editor_email || null,
    priority: selectedPriority,
    crew_reviewer_email: user?.email || eventWorkflow?.crew_reviewer_email || null,
    crew_notes: eventWorkflow?.crew_notes || "Submitted to editor from Event Operations.",
    updated_by: user?.id || null,
    updated_at: new Date().toISOString(),
  };

  if (eventWorkflow) {
    const { error } = await supabase
      .from("event_video_workflows")
      .update(payload)
      .eq("id", eventWorkflow.id);

    if (error) setActionMessage(`Editor assignment update failed: ${error.message}`);
    else {
      setActionMessage("Editor assignment updated.");
      await loadData();
    }
    return;
  }

  const { error } = await supabase
    .from("event_video_workflows")
    .insert({
      event_id: selectedEventId,
      ...payload,
      created_by: user?.id || null,
    });

  if (error) setActionMessage(`Submit to editor failed: ${error.message}`);
  else {
    setActionMessage("Submitted to editor.");
    await loadData();
  }
}
  async function updateWorkflowStatus(status: string) { if (!eventWorkflow) { await ensureVideoWorkflow(); return; } const { error } = await supabase.from("event_video_workflows").update({
    status,
    assigned_editor_email:
        selectedEditorEmail || eventWorkflow.assigned_editor_email || null,

    // NEW
    priority: selectedPriority,

    updated_by: user?.id || null,
    updated_at: new Date().toISOString(),
}).eq("id", eventWorkflow.id); if (error) setActionMessage(`Video workflow update failed: ${error.message}`); else { setActionMessage(`Video workflow moved to ${label(status)}.`); await loadData(); } }
  function recipientsFor(audienceKey: Audience) { const linked = (email?: string) => userProfiles.find((p) => String(p.email || "").toLowerCase() === String(email || "").toLowerCase()); if (audienceKey === "poc") { const p = linked(selectedEvent?.poc_email); return selectedEvent?.poc_email ? [{ email: selectedEvent.poc_email, user_id: p?.user_id || null, name: p?.preferred_display_name || p?.full_name || "Event POC" }] : []; } if (audienceKey === "crew") return approvedCrew.map((a) => ({ email: a.user_email, user_id: a.user_id, name: a.user_email })); if (audienceKey === "influencers") return [...approvedInfluencers, ...completedInfluencers].map((i) => { const p = profiles[i.influencer_profile_id] || {}; const linkedProfile = linked(p.email || i.user_email); return { email: p.email || i.user_email, user_id: i.user_id || linkedProfile?.user_id || null, name: p.full_name || i.user_email }; }); if (audienceKey === "editor") { const email = selectedEditorEmail || eventWorkflow?.assigned_editor_email; const p = linked(email); return email ? [{ email, user_id: p?.user_id || null, name: p?.preferred_display_name || p?.full_name || "Editor" }] : []; } return []; }
  function defaultSubject(a: Audience) { const event = selectedEvent?.title || "SDTV event"; if (a === "crew") return `SDTV coverage brief - ${event}`; if (a === "influencers") return `SDTV influencer coverage update - ${event}`; if (a === "editor") return `SDTV video workflow update - ${event}`; return `SDTV coverage plan - ${event}`; }
  function defaultMessage(a: Audience) { const event = selectedEvent?.title || "the event"; const base = [`Hello,`, ``, `Sharing an SDTV update for ${event}.`, ``, `Event: ${event}`, `Date: ${dateText(selectedEvent?.date)}`, `Location: ${selectedEvent?.location || "—"}`]; if (a === "crew") base.push(``, `Coverage Checklist:`, `- Opening and venue shots`, `- Stage, audience, sponsor banners, and key moments`, `- Short vertical clips for social media`, `- Upload media folder after coverage`, briefNotes ? `\nNotes:\n${briefNotes}` : ""); else if (a === "influencers") base.push(``, `Please confirm your coverage plan and tag Seattle Desi TV where applicable.`, briefNotes ? `\nNotes:\n${briefNotes}` : ""); else if (a === "editor") base.push(``, `Video workflow status: ${label(eventWorkflow?.status || "not started")}`, `Please review raw media and update the workflow when ready.`); else base.push(``, `Crew Coverage: ${approvedCrew.length || "Not assigned yet"}`, `Influencer Coverage: ${approvedInfluencers.length + completedInfluencers.length || "Not approved yet"}`, `Video Status: ${label(eventWorkflow?.status || "not started")}`, briefNotes ? `\nCoverage Brief Notes:\n${briefNotes}` : ""); base.push(``, `Thank you,`, `Seattle Desi TV Team`); return base.filter(Boolean).join("\n"); }
  const autoRecipients = recipientsFor(audience); const visibleRecipients = useMemo(() => { const base = [...autoRecipients]; if (manualRecipient.trim()) base.push({ email: manualRecipient.trim(), user_id: null, name: "Manual recipient" }); const seen = new Set<string>(); return base.filter((r) => { const e = String(r.email || "").toLowerCase(); if (!e || seen.has(e)) return false; seen.add(e); return true; }); }, [audience, selectedEventId, assignments, intents, profiles, userProfiles, manualRecipient, eventWorkflow?.assigned_editor_email, selectedEditorEmail]);
  useEffect(() => { const emails = recipientsFor(audience).map((r) => r.email).filter(Boolean); setSelectedRecipientEmails(emails as string[]); setCommSubject(defaultSubject(audience)); setCommMessage(defaultMessage(audience)); }, [audience, selectedEventId, eventWorkflow?.status, approvedCrew.length, approvedInfluencers.length, completedInfluencers.length, briefNotes]);
  async function sendCommunication() { const recipients = visibleRecipients.filter((r) => selectedRecipientEmails.includes(r.email)); if (!recipients.length) { setActionMessage("Select at least one recipient."); return; } const { data } = await supabase.auth.getSession(); const token = data.session?.access_token; const response = await fetch("/api/studio/send-communication", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ recipients, subject: commSubject, message: commMessage, notificationTitle: commSubject, notificationLink: "/notifications?from=hub" }) }); const result = await response.json(); if (!response.ok) setActionMessage(result.error || "Communication failed."); else setActionMessage(`Communication sent to ${result.recipients} recipient(s). Email ${result.emailStatus?.skipped ? "was skipped because Resend is not configured" : "sent"}. Notifications created: ${result.notificationStatus?.inserted || 0}.`); }
  function CrewRow({ item }: { item: any }) { const pending = String(item.status || "") === "pending"; return <article className="rounded-2xl border p-4"><div className="flex justify-between gap-3"><div><p className="font-black">{item.user_email || "No email"}</p><p className="text-sm text-slate-600">{label(item.assignment_type)} · {label(item.status)}{item.coverage_completed ? isNoContent(item.coverage_notes) ? " · no content" : " · submitted" : ""}</p></div><span className={`h-fit rounded-full border px-3 py-1 text-xs font-black ${statusClass(item.status)}`}>{label(item.status)}</span></div>{item.coverage_notes && <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{item.coverage_notes}</p>}{pending && <div className="mt-3 flex gap-2"><button onClick={() => updateAssignment(item, "approved")} className="rounded-xl bg-green-600 px-4 py-2 font-black text-white">Approve</button><button onClick={() => updateAssignment(item, "rejected")} className="rounded-xl bg-red-600 px-4 py-2 font-black text-white">Reject</button></div>}</article>; }
  function InfluencerRow({ item }: { item: any }) { const p = profiles[item.influencer_profile_id] || {}; return <article className="rounded-2xl border p-4"><div className="flex justify-between gap-3"><div><p className="font-black">{p.full_name || item.user_email || "Influencer"}</p><p className="text-sm text-slate-600">{p.email || item.user_email || "No email"} · {p.niche || "Influencer"}</p></div><span className={`h-fit rounded-full border px-3 py-1 text-xs font-black ${statusClass(item.status || "pending")}`}>{label(item.status || "pending")}</span></div>{item.collab_note && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{item.collab_note}</p>}<div className="mt-3 flex gap-2"><button onClick={() => updateInfluencerIntent(item.id, "approved")} className="rounded-xl bg-green-600 px-4 py-2 font-black text-white">Approve</button><button onClick={() => updateInfluencerIntent(item.id, "completed")} className="rounded-xl bg-slate-900 px-4 py-2 font-black text-white">Completed</button><button onClick={() => updateInfluencerIntent(item.id, "rejected")} className="rounded-xl bg-red-600 px-4 py-2 font-black text-white">Reject</button></div></article>; }
  const tabs: Array<[TabKey, string, number?]> = [["overview", "Overview"], ["edit", "Edit Event"], ["approval", "Approval", selectedEvent?.status === "pending" ? 1 : 0], ["crew", "Crew", pendingCrew.length], ["influencers", "Influencers", pendingInfluencers.length], ["brief", "Coverage Brief"], ["video", "Video"], ["communications", "Communications"], ["admin_poc", "Admin POC", selectedPocList.length ? 0 : 1], ["timeline", "Timeline"]];
  const selectedImages = eventImages(selectedEvent || {}); const editImages = (editForm.image_urls || []).filter(Boolean); const allStats = { total: events.length, approved: events.filter((e) => String(e.status) === "approved").length, pendingActions: events.reduce((sum, e) => { const s = statsForEvent(e.id); return sum + s.pendingCrew + s.pendingInfluencers; }, 0) };

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="mx-auto max-w-7xl px-4 py-8 md:px-6"><div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-black uppercase tracking-wide text-pink-300">Studio Operations</p><h1 className="text-4xl font-black md:text-5xl">Event Operations</h1><p className="mt-2 text-slate-300">Unified event workspace for details, approvals, crew, influencers, briefs, Admin POC, communications, and video workflow.</p>{user?.email && <p className="mt-1 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}</div><div className="flex gap-2">{selectedEvent && <button onClick={() => setSelectedEventId("")} className="rounded-xl border border-white/20 px-4 py-3 font-bold text-white">All Analytics</button>}<button onClick={init} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950">Refresh</button></div></div>{loading && <div className="rounded-2xl border border-white/10 bg-white/10 p-6">{message}</div>}{!loading && !canAccess && <div className="max-w-xl rounded-2xl bg-white p-8 text-slate-950">{message}</div>}{!loading && canAccess && <div className="grid gap-5 lg:grid-cols-[420px_1fr]"><aside className="rounded-3xl bg-white p-4 text-slate-950 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]"><div className="mb-4"><div className="flex justify-between gap-2"><div><h2 className="text-2xl font-black">Events</h2><p className="text-sm text-slate-500">Search, filter, then operate selected event.</p></div><a href="/studio/events" className="rounded-xl bg-pink-600 px-3 py-2 text-xs font-black text-white">+ Add</a></div><input value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} placeholder="Search title, POC, location..." className="mt-3 w-full rounded-xl border p-3" /><div className="mt-3 grid grid-cols-2 gap-2"><input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="rounded-xl border p-3 text-sm font-bold" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border p-3 text-sm font-bold"><option value="all">All statuses</option>{EVENT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></div></div><div className="grid max-h-[calc(100vh-230px)] gap-3 overflow-y-auto pr-1">{filteredEvents.map((e) => { const s = statsForEvent(e.id); const image = eventImages(e)[0]; const eventPoc = eventPocs[e.id]; return <button key={e.id} onClick={() => openEvent(e.id)} className={`rounded-2xl border p-4 text-left ${selectedEventId === e.id ? "border-pink-500 bg-pink-50 ring-2 ring-pink-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}><div className="flex gap-3"><div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">{image ? <img src={image} alt={e.title} className="h-full w-full object-cover" /> : <span className="text-xs font-black text-pink-600">SDTV</span>}</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h3 className="truncate font-black">{e.title}</h3><span className={`h-fit rounded-full border px-2 py-1 text-[10px] font-black ${statusClass(e.status)}`}>{label(e.status)}</span></div><p className="text-sm text-slate-600">{dateText(e.date)} · {e.location || "No location"}</p><p className="mt-1 text-xs text-slate-500">Crew {s.crew} · Influencers {s.influencers} · Video {label(s.videoStatus)}</p><p className="mt-1 text-xs font-bold text-pink-600">Admin POC: {pocLabel(eventPoc)}</p></div></div></button>; })}</div></aside><section className="space-y-5">{actionMessage && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}{!selectedEvent && <div className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-3xl font-black">Event Operations Dashboard</h2><p className="mt-2 text-slate-600">Select an event on the left to open the full operations workspace.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric title="Total events" value={allStats.total} /><Metric title="Approved events" value={allStats.approved} tone="green" /><Metric title="Pending actions" value={allStats.pendingActions} tone="yellow" /></div></div>}{selectedEvent && selectedStats && <><div className="rounded-3xl bg-white p-5 text-slate-950"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><div className="mb-2 flex gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(selectedEvent.status)}`}>{label(selectedEvent.status)}</span></div><h2 className="text-3xl font-black">{selectedEvent.title}</h2><p className="mt-1 text-slate-600">{dateText(selectedEvent.date)} · {selectedEvent.location || "No location"}</p><p className="mt-1 text-sm text-slate-500">Organizer POC: {selectedEvent.poc_email || "—"} {selectedEvent.poc_phone ? `· ${selectedEvent.poc_phone}` : ""}</p><p className="mt-1 text-sm font-bold text-pink-600">Admin POC: {pocLabel(selectedPoc)}</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[420px]"><Metric title="Crew" value={selectedStats.crew} /><Metric title="Influencers" value={selectedStats.influencers} /><Metric title="Media" value={selectedStats.submitted} /><Metric title="Pending" value={selectedStats.pendingCrew + selectedStats.pendingInfluencers} tone="yellow" /></div></div></div><div className="rounded-3xl bg-white p-4 text-slate-950"><div className="flex flex-wrap gap-2 pb-1">{tabs.map(([key, text, count]) => <button key={key} onClick={() => setActiveTab(key)} className={`whitespace-nowrap rounded-xl px-4 py-2 font-black ${activeTab === key ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-700"}`}>{text}{Boolean(count) && <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-xs text-pink-700">{count}</span>}</button>)}</div></div>{activeTab === "overview" && <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><section className="rounded-3xl bg-white p-6 text-slate-950"><div className="flex justify-between gap-3"><h3 className="text-2xl font-black">Event Details</h3><button onClick={() => setActiveTab("edit")} className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white">Edit Event</button></div>{selectedImages.length > 0 && <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">{selectedImages.map((url: string, index: number) => <img key={`${url}-${index}`} src={url} alt={`${selectedEvent.title} image ${index + 1}`} className="h-40 w-full rounded-xl border object-cover" />)}</div>}<div className="mt-5 grid gap-4 text-sm md:grid-cols-2"><FieldRow label="Event name" value={selectedEvent.title} /><FieldRow label="Date" value={dateText(selectedEvent.date)} /><FieldRow label="Location" value={selectedEvent.location} /><FieldRow label="Status" value={label(selectedEvent.status)} /><FieldRow label="Organizer email" value={selectedEvent.poc_email} /><FieldRow label="Organizer phone" value={selectedEvent.poc_phone} /><FieldRow label="Admin POC" value={pocLabel(selectedPoc)} /><p className="md:col-span-2"><b>Ticket URL:</b><br />{selectedEvent.ticket_url ? <a href={selectedEvent.ticket_url} target="_blank" rel="noreferrer" className="break-all font-bold text-pink-600">{selectedEvent.ticket_url}</a> : "—"}</p><p className="md:col-span-2"><b>Description:</b><br />{selectedEvent.description || "—"}</p></div></section><section className="rounded-3xl bg-white p-6 text-slate-950"><h3 className="text-2xl font-black">Quick Actions</h3><div className="mt-5 grid gap-2"><button onClick={() => setActiveTab("approval")} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Manage Approval</button><button onClick={() => setActiveTab("admin_poc")} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Assign Admin POC</button><button onClick={() => setActiveTab("crew")} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Assign Crew</button><button onClick={() => openCommunications("crew")} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Email Crew</button><button onClick={() => openCommunications("poc")} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Email Organizer POC</button><button onClick={() => setActiveTab("video")} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Video Workflow</button></div></section></div>}{activeTab === "edit" && <section className="rounded-3xl bg-white p-6 text-slate-950"><h3 className="text-2xl font-black">Edit Event</h3><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Event title"><input className="rounded-xl border p-3 font-normal" value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></Field><Field label="Event date"><input type="date" className="rounded-xl border p-3 font-normal" value={editForm.date || ""} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} /></Field><Field label="Location"><input className="rounded-xl border p-3 font-normal" value={editForm.location || ""} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} /></Field><Field label="Ticket URL"><input className="rounded-xl border p-3 font-normal" value={editForm.ticket_url || ""} onChange={(e) => setEditForm({ ...editForm, ticket_url: e.target.value })} /></Field><Field label="Organizer email"><input className="rounded-xl border p-3 font-normal" value={editForm.poc_email || ""} onChange={(e) => setEditForm({ ...editForm, poc_email: e.target.value })} /></Field><Field label="Organizer phone"><input className="rounded-xl border p-3 font-normal" value={editForm.poc_phone || ""} onChange={(e) => setEditForm({ ...editForm, poc_phone: e.target.value })} /></Field><Field label="Description"><textarea className="min-h-28 rounded-xl border p-3 font-normal" value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></Field></div><div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="font-black">Event Images</p>{editImages.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">{editImages.map((url: string, index: number) => <div key={`${url}-${index}`} className="relative overflow-hidden rounded-xl border bg-white"><img src={url} alt={`Event image ${index + 1}`} className="h-36 w-full object-cover" /><span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-black text-white">{index === 0 ? "Primary" : `Image ${index + 1}`}</span><button type="button" onClick={() => setEditForm({ ...editForm, image_urls: editImages.filter((_u: string, i: number) => i !== index) })} className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-black text-white">Remove</button></div>)}</div>}<div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]"><input value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder="Paste image URL" className="rounded-xl border bg-white p-3" /><button type="button" onClick={() => { if (imageUrlInput.trim()) { setEditForm({ ...editForm, image_urls: [...editImages, imageUrlInput.trim()] }); setImageUrlInput(""); } }} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Add Image URL</button></div></div><button onClick={saveEventEdits} className="mt-5 rounded-xl bg-pink-600 px-5 py-4 font-black text-white">Save Event Details & Images</button></section>}{activeTab === "approval" && <section className="rounded-3xl bg-white p-6 text-slate-950"><h3 className="text-2xl font-black">Event Approval</h3><p className="mt-2 text-slate-600">Current status: <b>{label(selectedEvent.status)}</b></p><div className="mt-5 flex flex-wrap gap-2">{EVENT_STATUSES.map((s) => <button key={s} onClick={() => updateEventStatus(s)} className={`rounded-xl px-4 py-3 font-black ${selectedEvent.status === s ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-950"}`}>{label(s)}</button>)}</div></section>}{activeTab === "admin_poc" && <section className="rounded-3xl bg-white p-6 text-slate-950"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h3 className="text-2xl font-black">Admin POCs for Organizer</h3><p className="mt-2 text-slate-600">Assign one or more SDTV contacts. Organizer messages go to all assigned POCs and info@seattledesitv.com.</p></div><button onClick={addPoc} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">+ Add POC</button></div><div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.85fr]"><div className="space-y-4">{(pocForm.pocs || []).map((p: Poc, index: number) => <div key={index} className="rounded-2xl border bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><p className="font-black">POC {index + 1}{index === 0 ? " · Primary" : ""}</p><button onClick={() => removePoc(index)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">Remove</button></div><Field label="Choose admin"><select value={p.admin_user_id || p.admin_email || ""} onChange={(e) => chooseAdmin(e.target.value, index)} className="rounded-xl border bg-white p-3 font-normal"><option value="">Select admin...</option>{teamUsers.map((admin) => <option key={admin.user_id || admin.email} value={admin.user_id || admin.email}>{admin.name} · {admin.email}</option>)}</select></Field><div className="mt-3 grid gap-3 md:grid-cols-2"><Field label="Display name"><input value={p.admin_name || ""} onChange={(e) => updatePoc(index, { admin_name: e.target.value })} className="rounded-xl border bg-white p-3 font-normal" /></Field><Field label="Email"><input value={p.admin_email || ""} onChange={(e) => updatePoc(index, { admin_email: e.target.value })} className="rounded-xl border bg-white p-3 font-normal" /></Field><Field label="WhatsApp / Phone"><input value={p.admin_phone || ""} onChange={(e) => updatePoc(index, { admin_phone: e.target.value })} placeholder="+1425..." className="rounded-xl border bg-white p-3 font-normal" /></Field><Field label="Photo URL"><input value={p.admin_photo_url || ""} onChange={(e) => updatePoc(index, { admin_photo_url: e.target.value })} className="rounded-xl border bg-white p-3 font-normal" /></Field></div></div>)}<Field label="Internal notes"><textarea value={pocForm.notes || ""} onChange={(e) => setPocForm({ ...pocForm, notes: e.target.value })} className="min-h-24 rounded-xl border p-3 font-normal" /></Field><button onClick={saveAdminPoc} className="w-full rounded-xl bg-pink-600 px-5 py-4 font-black text-white">Save Admin POCs</button></div><div className="rounded-3xl border bg-slate-50 p-5"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Organizer Preview</p><div className="mt-4 space-y-3">{(pocForm.pocs || []).filter((p: Poc) => p.admin_email || p.admin_name).map((p: Poc, index: number) => <div key={index} className="flex items-center gap-4 rounded-2xl bg-white p-3"><div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-pink-600 font-black">{p.admin_photo_url ? <img src={p.admin_photo_url} alt={p.admin_name || "Admin POC"} className="h-full w-full object-cover" /> : "SDTV"}</div><div className="min-w-0 flex-1"><h4 className="font-black">{p.admin_name || "SDTV Team"}</h4><p className="text-sm text-slate-500">{p.admin_email || "info@seattledesitv.com"}</p><div className="mt-2 flex flex-wrap gap-2"><a href={`mailto:${p.admin_email || "info@seattledesitv.com"}`} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">Email</a>{whatsappUrl(p.admin_phone, `Hi ${p.admin_name || "SDTV"}, I have a question about ${selectedEvent.title}.`) && <a href={whatsappUrl(p.admin_phone, `Hi ${p.admin_name || "SDTV"}, I have a question about ${selectedEvent.title}.`)} target="_blank" rel="noreferrer" className="rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white">WhatsApp</a>}</div></div></div>)}{!(pocForm.pocs || []).some((p: Poc) => p.admin_email || p.admin_name) && <p className="rounded-2xl bg-white p-4 text-slate-600">No POCs assigned yet.</p>}</div></div></div></section>}{activeTab === "crew" && <section className="rounded-3xl bg-white p-6 text-slate-950"><div className="flex justify-between"><h3 className="text-2xl font-black">Crew / Coverage</h3><button onClick={() => openCommunications("crew")} className="rounded-xl bg-pink-600 px-4 py-2 font-black text-white">Email Crew</button></div><div className="mt-5 grid gap-5"><div><h4 className="font-black">Pending Requests ({pendingCrew.length})</h4><div className="mt-3 grid gap-3">{pendingCrew.length ? pendingCrew.map((i) => <CrewRow key={i.id} item={i} />) : <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">No pending crew requests.</p>}</div></div><div><h4 className="font-black">Approved Crew ({approvedCrew.length})</h4><div className="mt-3 grid gap-3">{approvedCrew.length ? approvedCrew.map((i) => <CrewRow key={i.id} item={i} />) : <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">No approved crew yet.</p>}</div></div><div className="grid gap-3 md:grid-cols-3"><Metric title="Submitted" value={submittedCrew.length} tone="green" /><Metric title="Waiting" value={waitingCrew.length} tone="yellow" /><Metric title="No content" value={noContentCrew.length} /></div></div><div className="mt-6 border-t pt-5"><p className="mb-3 font-black">Assign Crew Manually</p><div className="grid max-h-64 gap-2 overflow-y-auto rounded-2xl border p-3">{teamUsers.map((u) => <label key={`${u.user_id}-${u.email}`} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm"><input type="checkbox" checked={selectedCrewUserIds.includes(u.user_id)} onChange={() => setSelectedCrewUserIds((c) => c.includes(u.user_id) ? c.filter((x) => x !== u.user_id) : [...c, u.user_id])} /><span><b>{u.name}</b> · {u.email} · {label(u.role)}</span></label>)}</div><div className="mt-3 flex gap-2"><select value={selectedCrewRole} onChange={(e) => setSelectedCrewRole(e.target.value)} className="flex-1 rounded-xl border p-3">{CREW_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select><button onClick={assignCrew} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Assign Selected ({selectedCrewUserIds.length})</button></div></div></section>}{activeTab === "influencers" && <section className="rounded-3xl bg-white p-6 text-slate-950"><div className="flex justify-between"><h3 className="text-2xl font-black">Influencer Coverage</h3><button onClick={() => openCommunications("influencers")} className="rounded-xl bg-pink-600 px-4 py-2 font-black text-white">Email Influencers</button></div><div className="mt-5 grid gap-3">{eventInfluencers.length ? eventInfluencers.map((i) => <InfluencerRow key={i.id} item={i} />) : <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">No influencer requests for this event.</p>}</div><div className="mt-5 grid gap-3 md:grid-cols-4"><Metric title="Pending" value={pendingInfluencers.length} tone="yellow" /><Metric title="Approved" value={approvedInfluencers.length} tone="green" /><Metric title="Completed" value={completedInfluencers.length} tone="green" /><Metric title="Rejected" value={rejectedInfluencers.length} /></div></section>}{activeTab === "brief" && <section className="rounded-3xl bg-white p-6 text-slate-950"><h3 className="text-2xl font-black">Coverage Brief</h3><p className="mt-2 text-slate-600">Add notes that can be included in crew, influencer, editor, or organizer communications.</p><textarea value={briefNotes} onChange={(e) => setBriefNotes(e.target.value)} className="mt-4 min-h-48 w-full rounded-xl border p-4" placeholder="Important shots, interview names, sponsor mentions, arrival time, parking, etc." /><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => openCommunications("crew")} className="rounded-xl bg-slate-900 px-5 py-3 font-black text-white">Prepare Crew Email</button><button onClick={() => openCommunications("poc")} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Prepare Organizer Email</button></div></section>}{activeTab === "video" && <section className="rounded-3xl bg-white p-6 text-slate-950"><h3 className="text-2xl font-black">Video Workflow</h3><div className="mt-4 grid gap-4 md:grid-cols-2"><FieldRow label="Current status" value={label(eventWorkflow?.status || "not started")} /><FieldRow label="Assigned editor" value={eventWorkflow?.assigned_editor_email || selectedEditorEmail || "—"} /><FieldRow label="Raw media" value={eventWorkflow?.raw_media_url ? <a className="font-bold text-pink-600" href={eventWorkflow.raw_media_url} target="_blank" rel="noreferrer">Open raw media</a> : "—"} /><FieldRow label="External media" value={eventWorkflow?.external_media_url ? <a className="font-bold text-pink-600" href={eventWorkflow.external_media_url} target="_blank" rel="noreferrer">Open external media</a> : "—"} /></div><div className="mt-5 grid gap-3 lg:grid-cols-[1fr_180px_auto]">

    <select
        value={selectedEditorEmail || eventWorkflow?.assigned_editor_email || ""}
        onChange={(e) => setSelectedEditorEmail(e.target.value)}
        className="rounded-xl border p-3"
    >
        <option value="">Select editor...</option>

        {editorUsers.map((u) => (
            <option key={u.email} value={u.email}>
              {u.name} · {u.email} · {label(u.role)}
            </option>
        ))}
    </select>

    <select
        value={selectedPriority}
        onChange={(e) => setSelectedPriority(Number(e.target.value))}
        className="rounded-xl border p-3"
    >
        {Array.from({ length: 21 }, (_, i) => (
            <option key={i} value={i}>
                P{i}
            </option>
        ))}
    </select>

    <button
        onClick={ensureVideoWorkflow}
        className="rounded-xl bg-slate-900 px-5 py-3 font-black text-white"
    >
        Assign & Submit to Editor
    </button>

</div>

<p className="mt-2 text-xs text-slate-500">
    Priority <b>P0</b> = Highest &nbsp;&nbsp;•&nbsp;&nbsp;
    <b>P20</b> = Lowest
</p><div className="mt-5 flex flex-wrap gap-2">{VIDEO_STATUSES.map((s) => <button key={s} onClick={() => updateWorkflowStatus(s)} className={`rounded-xl px-4 py-3 font-black ${eventWorkflow?.status === s ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-950"}`}>{label(s)}</button>)}</div><button onClick={() => openCommunications("editor")} className="mt-5 rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Email Editor</button></section>}{activeTab === "communications" && <section className="rounded-3xl bg-white p-6 text-slate-950"><h3 className="text-2xl font-black">Communications</h3><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Audience"><select value={audience} onChange={(e) => setAudience(e.target.value as Audience)} className="rounded-xl border p-3 font-normal"><option value="poc">Organizer POC</option><option value="crew">Approved Crew</option><option value="influencers">Approved Influencers</option><option value="editor">Editor</option></select></Field><Field label="Manual recipient"><input value={manualRecipient} onChange={(e) => setManualRecipient(e.target.value)} className="rounded-xl border p-3 font-normal" placeholder="email@example.com" /></Field></div><div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="font-black">Recipients</p><div className="mt-2 grid gap-2">{visibleRecipients.map((r) => <label key={r.email} className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm"><input type="checkbox" checked={selectedRecipientEmails.includes(r.email)} onChange={() => setSelectedRecipientEmails((c) => c.includes(r.email) ? c.filter((x) => x !== r.email) : [...c, r.email])} /><span><b>{r.name}</b> · {r.email}</span></label>)}{visibleRecipients.length === 0 && <p className="text-slate-500">No recipients found. Add a manual recipient.</p>}</div></div><Field label="Subject"><input value={commSubject} onChange={(e) => setCommSubject(e.target.value)} className="rounded-xl border p-3 font-normal" /></Field><Field label="Message"><textarea value={commMessage} onChange={(e) => setCommMessage(e.target.value)} className="min-h-72 rounded-xl border p-4 font-normal" /></Field><button onClick={sendCommunication} className="rounded-xl bg-pink-600 px-5 py-4 font-black text-white">Send Communication</button></section>}{activeTab === "timeline" && <section className="rounded-3xl bg-white p-6 text-slate-950"><h3 className="text-2xl font-black">Timeline</h3><div className="mt-5 grid gap-4"><TimelineItem done title="Event submitted" detail={selectedEvent.poc_email || "Organizer submitted event listing"} when={timeText(selectedEvent.created_at)} /><TimelineItem done={selectedEvent.status === "approved"} title="Event approved" detail={`Current status: ${label(selectedEvent.status)}`} /><TimelineItem done={selectedPocList.length > 0} title="Admin POC assigned" detail={pocLabel(selectedPoc)} /><TimelineItem done={approvedCrew.length > 0} title="Crew coverage assigned" detail={`${approvedCrew.length} approved crew member(s)`} /><TimelineItem done={submittedCrew.length > 0} title="Coverage submitted" detail={`${submittedCrew.length} submitted media/coverage item(s)`} /><TimelineItem done={Boolean(eventWorkflow)} title="Video workflow" detail={label(eventWorkflow?.status || "not started")} when={timeText(eventWorkflow?.updated_at)} /></div></section>}</>}</section></div>}</section></main>;
}

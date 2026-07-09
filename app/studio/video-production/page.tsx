"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { canAccessVideoProduction, isAdminRole, isTeamRole, isVideoEditorRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

const STATUSES = [
  { key: "ready_for_editing", label: "Ready for Editing" },
  { key: "in_editing", label: "In Editing" },
  { key: "awaiting_crew_review", label: "Awaiting Crew Review" },
  { key: "changes_requested", label: "Changes Requested" },
  { key: "awaiting_admin_approval", label: "Awaiting Admin Approval" },
  { key: "approved_for_publishing", label: "Approved for Publishing" },
  { key: "published_complete", label: "Published Complete" },
];
const ACTIVE_STATUSES = ["ready_for_editing", "in_editing", "awaiting_crew_review", "changes_requested", "awaiting_admin_approval", "approved_for_publishing"];
const WAITING_STATUSES = ["awaiting_crew_review", "awaiting_admin_approval"];

function dateText(value?: string | null) { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString(); }
function shortDate(value?: string | null) { if (!value) return ""; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
function statusLabel(status?: string | null) { return STATUSES.find((item) => item.key === status)?.label || String(status || "Ready for Editing").replaceAll("_", " "); }
function emailMatches(a?: string | null, b?: string | null) { return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase(); }
function priorityValue(value?: number | string | null) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 10; }
function priorityClass(value?: number | string | null) { const p = priorityValue(value); if (p <= 3) return "bg-red-50 text-red-700 border-red-100"; if (p <= 7) return "bg-orange-50 text-orange-700 border-orange-100"; if (p <= 12) return "bg-yellow-50 text-yellow-800 border-yellow-100"; return "bg-slate-100 text-slate-700 border-slate-200"; }
function daysWaiting(value?: string | null) { if (!value) return 0; const d = new Date(value); if (Number.isNaN(d.getTime())) return 0; return Math.floor((Date.now() - d.getTime()) / 86400000); }
function stuckWith(workflow: any) {
  const status = String(workflow?.status || "");
  if (["ready_for_editing", "in_editing", "changes_requested", "approved_for_publishing"].includes(status)) return { label: "Editor", email: workflow.assigned_editor_email || "" };
  if (status === "awaiting_crew_review") return { label: "Crew Reviewer", email: workflow.crew_reviewer_email || "" };
  if (status === "awaiting_admin_approval") return { label: "Admin", email: "info@seattledesitv.com" };
  return { label: "Complete", email: "" };
}

function StatCard({ title, value, helper, active, onClick }: { title: string; value: number; helper?: string; active?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={`rounded-2xl p-5 text-left transition ${active ? "bg-pink-600 text-white" : "bg-white text-slate-950 hover:bg-pink-50"}`}><p className={`text-xs font-black uppercase ${active ? "text-pink-100" : "text-slate-500"}`}>{title}</p><p className="mt-2 text-4xl font-black">{value}</p>{helper && <p className={`mt-1 text-xs ${active ? "text-pink-100" : "text-slate-500"}`}>{helper}</p>}</button>;
}

export default function VideoProductionPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking Video Production access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [statusSearch, setStatusSearch] = useState("");
  const [form, setForm] = useState({ raw_media_url: "", external_media_url: "", crew_notes: "", assigned_editor_email: "", crew_reviewer_email: "", priority: 10 });
  const canAccess = Boolean(user && canAccessVideoProduction(role));
  const admin = isAdminRole(role);
  const crew = isTeamRole(role);
  const editor = isVideoEditorRole(role);

  async function loadData(currentUser?: any, currentRole?: string) {
    const activeUser = currentUser || user;
    const activeRole = currentRole || role;
    const activeEmail = activeUser?.email || "";
    const workflowResult = await supabase.from("event_video_workflows").select("*, events(id,title,date,location,image,image_urls)").order("priority", { ascending: true }).order("updated_at", { ascending: false });
    if (workflowResult.error) { setActionMessage(`Could not load video workflows: ${workflowResult.error.message}`); setWorkflows([]); }
    else {
      const rows = workflowResult.data || [];
      setWorkflows(isAdminRole(activeRole) ? rows : rows.filter((row: any) => emailMatches(row.assigned_editor_email, activeEmail) || emailMatches(row.crew_reviewer_email, activeEmail) || isTeamRole(activeRole)));
    }
    if (isAdminRole(activeRole) || isTeamRole(activeRole)) {
      const eventResult = await supabase.from("events").select("id,title,date,location,status").eq("status", "approved").order("date", { ascending: false }).limit(100);
      if (!eventResult.error) setEvents(eventResult.data || []);
    }
  }

  async function init() {
    setLoading(true); setActionMessage("");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setRole(""); setMessage("Please login to access Video Production."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!canAccessVideoProduction(nextRole)) { setMessage("You are logged in, but this account does not have Video Production access."); setLoading(false); return; }
    await loadData(currentUser, nextRole); setMessage(""); setLoading(false);
  }

  async function createWorkflow(event: React.FormEvent) {
    event.preventDefault(); if (!selectedEventId || !user?.id) return;
    setActionMessage("Creating video workflow...");
    const { error } = await supabase.from("event_video_workflows").insert({ event_id: selectedEventId, status: "ready_for_editing", raw_media_url: form.raw_media_url || null, external_media_url: form.external_media_url || null, crew_notes: form.crew_notes || null, assigned_editor_email: form.assigned_editor_email || null, crew_reviewer_email: form.crew_reviewer_email || user.email || null, priority: Number(form.priority) || 10, created_by: user.id, updated_by: user.id });
    if (error) { setActionMessage(`Could not create workflow: ${error.message}`); return; }
    setActionMessage("Video workflow created and marked ready for editing."); setSelectedEventId(""); setForm({ raw_media_url: "", external_media_url: "", crew_notes: "", assigned_editor_email: "", crew_reviewer_email: "", priority: 10 }); await loadData();
  }

  async function updateWorkflow(workflow: any, payload: any, success: string) {
    setActionMessage("Updating workflow...");
    const { error } = await supabase.from("event_video_workflows").update({ ...payload, updated_by: user?.id || null, updated_at: new Date().toISOString() }).eq("id", workflow.id);
    if (error) { setActionMessage(`Workflow update failed: ${error.message}`); return; }
    setActionMessage(success); await loadData();
  }

  async function updatePriority(workflow: any, value: string) { await updateWorkflow(workflow, { priority: Number(value) }, `Priority updated to P${value}.`); }
  async function sendAdminEmail(workflow: any) { const event = workflow.events || {}; await fetch("/api/notify-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "video production approval", title: event.title || "Event video workflow", date: event.date || "", location: event.location || "", submittedBy: user?.email || "crew", reviewUrl: `${window.location.origin}/studio/video-production` }) }).catch(() => null); }
  async function notifyAdminsInApp(workflow: any) { const event = workflow.events || {}; const { data } = await supabase.from("admins").select("user_id,email"); const notifications = (data || []).filter((admin: any) => admin.user_id).map((admin: any) => ({ user_id: admin.user_id, title: "Video workflow awaiting final approval", message: `${event.title || "An event video"} was approved by crew and needs SDTV admin final approval before publishing.`, link: "/studio/video-production", read: false })); if (notifications.length) await supabase.from("notifications").insert(notifications); }
  async function markCrewApproved(workflow: any) { await updateWorkflow(workflow, { status: "awaiting_admin_approval", crew_reviewer_email: workflow.crew_reviewer_email || user?.email || null, crew_approved_at: new Date().toISOString() }, "Crew approved. Admin has been notified for final approval."); await sendAdminEmail(workflow); await notifyAdminsInApp(workflow); }

  async function sendStuckEmail(workflow: any) {
    const owner = stuckWith(workflow); const event = workflow.events || {};
    if (!owner.email) { setActionMessage("No POC email is available for this workflow status."); return; }
    const { data } = await supabase.auth.getSession(); const token = data.session?.access_token || "";
    const response = await fetch("/api/studio/send-communication", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" }, body: JSON.stringify({ recipients: [{ email: owner.email, user_id: null, name: owner.label }], subject: `Action needed: SDTV video workflow - ${event.title || "Event video"}`, message: [`Hello,`, ``, `This SDTV video workflow currently appears to be waiting on ${owner.label}.`, ``, `Event: ${event.title || "Untitled event"}`, `Status: ${statusLabel(workflow.status)}`, `Priority: P${priorityValue(workflow.priority)}`, `Workflow: ${window.location.origin}/studio/video-production/${workflow.id}`, ``, `Please review and update the workflow when you get a chance.`, ``, `Thank you,`, `Seattle Desi TV Team`].join("\n"), notificationTitle: `Video workflow action needed: ${event.title || "Event video"}`, notificationLink: `/studio/video-production/${workflow.id}` }) });
    const result = await response.json().catch(() => ({})); if (!response.ok) setActionMessage(result.error || "Could not send reminder email."); else setActionMessage(`Reminder sent to ${owner.email}.`);
  }

  const existingEventIds = useMemo(() => new Set(workflows.map((workflow) => workflow.event_id)), [workflows]);
  const availableEvents = events.filter((event) => !existingEventIds.has(event.id));
  const stats = useMemo(() => ({
    active: workflows.filter((w) => ACTIVE_STATUSES.includes(String(w.status || ""))).length,
    waiting: workflows.filter((w) => WAITING_STATUSES.includes(String(w.status || ""))).length,
    overdue: workflows.filter((w) => ACTIVE_STATUSES.includes(String(w.status || "")) && daysWaiting(w.updated_at) >= 3).length,
    published: workflows.filter((w) => String(w.status || "") === "published_complete").length,
    high: workflows.filter((w) => priorityValue(w.priority) <= 3 && ACTIVE_STATUSES.includes(String(w.status || ""))).length,
  }), [workflows]);
  const managementRows = useMemo(() => { const q = statusSearch.trim().toLowerCase(); return workflows.filter((workflow) => { const event = workflow.events || {}; const owner = stuckWith(workflow); const haystack = `${event.title || ""} ${event.location || ""} ${workflow.status || ""} ${workflow.assigned_editor_email || ""} ${workflow.crew_reviewer_email || ""} ${owner.email || ""}`.toLowerCase(); if (q && !haystack.includes(q)) return false; if (statusFilter === "active") return ACTIVE_STATUSES.includes(String(workflow.status || "")); if (statusFilter === "waiting") return WAITING_STATUSES.includes(String(workflow.status || "")); if (statusFilter === "overdue") return ACTIVE_STATUSES.includes(String(workflow.status || "")) && daysWaiting(workflow.updated_at) >= 3; if (statusFilter === "published") return String(workflow.status || "") === "published_complete"; if (statusFilter === "high") return priorityValue(workflow.priority) <= 3 && ACTIVE_STATUSES.includes(String(workflow.status || "")); if (statusFilter !== "all") return String(workflow.status || "") === statusFilter; return true; }); }, [workflows, statusSearch, statusFilter]);
  const activeWorkflows = useMemo(() => workflows.filter((w) => ACTIVE_STATUSES.includes(String(w.status || ""))).slice(0, 12), [workflows]);
  const publishedWorkflows = useMemo(() => workflows.filter((w) => String(w.status || "") === "published_complete").slice(0, 8), [workflows]);

  function WorkflowCard({ workflow }: { workflow: any }) {
    const event = workflow.events || {}; const mediaUrl = workflow.raw_media_url || workflow.external_media_url; const canCrewReview = crew && (workflow.status === "awaiting_crew_review" || workflow.status === "changes_requested"); const canAdminApprove = admin && workflow.status === "awaiting_admin_approval"; const canEditorPublish = editor && workflow.status === "approved_for_publishing"; const owner = stuckWith(workflow); const waitingDays = daysWaiting(workflow.updated_at);
    return <article className="bg-white text-slate-950 rounded-2xl p-5 shadow-sm border space-y-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">{statusLabel(workflow.status)}</p><h3 className="text-xl font-black mt-1">{event.title || "Untitled event"}</h3><p className="text-sm text-gray-600 mt-1">{shortDate(event.date)}{event.location ? ` · ${event.location}` : ""}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-black ${priorityClass(workflow.priority)}`}>P{priorityValue(workflow.priority)}</span></div><div className="text-sm text-gray-700 space-y-1"><p><b>Waiting on:</b> {owner.label}{owner.email ? ` · ${owner.email}` : ""}{waitingDays >= 3 && <span className="ml-2 rounded-full bg-red-50 px-2 py-1 text-xs font-black text-red-700">Overdue</span>}</p>{workflow.assigned_editor_email && <p><b>Editor:</b> {workflow.assigned_editor_email}</p>}{workflow.crew_reviewer_email && <p><b>Crew Reviewer:</b> {workflow.crew_reviewer_email}</p>}{mediaUrl && <p><a href={mediaUrl} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Open media source</a></p>}<p className="text-xs text-gray-400">Updated {dateText(workflow.updated_at)}</p></div><div className="flex flex-wrap gap-2"><a href={`/studio/video-production/${workflow.id}`} className="bg-pink-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Open Workflow</a>{workflow.status === "ready_for_editing" && editor && <button onClick={() => updateWorkflow(workflow, { status: "in_editing", assigned_editor_email: workflow.assigned_editor_email || user?.email || null }, "Workflow moved to editing.")} className="bg-slate-950 text-white px-3 py-2 rounded-lg font-bold text-sm">Start Editing</button>}{canCrewReview && <button onClick={() => markCrewApproved(workflow)} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Crew Approve</button>}{canAdminApprove && <button onClick={() => updateWorkflow(workflow, { status: "approved_for_publishing", admin_approver_email: user?.email || null, admin_approved_at: new Date().toISOString() }, "Admin approved. Editor can publish.")} className="bg-green-700 text-white px-3 py-2 rounded-lg font-bold text-sm">Admin Final Approve</button>}{canEditorPublish && <button onClick={() => updateWorkflow(workflow, { status: "published_complete", published_at: new Date().toISOString() }, "Video publishing cycle marked complete.")} className="bg-purple-700 text-white px-3 py-2 rounded-lg font-bold text-sm">Mark Published Complete</button>}</div></article>;
  }

  useEffect(() => { if (typeof window !== "undefined") { const requestedStatus = new URLSearchParams(window.location.search).get("status") || ""; if (STATUSES.some((status) => status.key === requestedStatus)) setStatusFilter(requestedStatus); } init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="max-w-7xl mx-auto px-6 py-10"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><h1 className="text-4xl md:text-5xl font-black">Video Production</h1><p className="text-slate-300 mt-2">Event video operations dashboard for priority, ownership, reminders, review and publishing.</p>{user?.email && <p className="text-slate-400 text-sm mt-1">Logged in as {user.email} · Role: {role}</p>}</div><div className="flex gap-3"><a href="/studio/community-content" className="rounded-xl bg-white/10 px-5 py-3 font-bold text-white">Community Content</a><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button></div></div>{loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Access Required</h2><p className="text-gray-600 mt-3">{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}{!loading && canAccess && <div className="space-y-8">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold whitespace-pre-line">{actionMessage}</div>}{admin && <section className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><StatCard title="Active" value={stats.active} active={statusFilter === "active"} onClick={() => setStatusFilter("active")} /><StatCard title="Waiting" value={stats.waiting} helper="Crew/Admin review" active={statusFilter === "waiting"} onClick={() => setStatusFilter("waiting")} /><StatCard title="Overdue" value={stats.overdue} helper="3+ days idle" active={statusFilter === "overdue"} onClick={() => setStatusFilter("overdue")} /><StatCard title="Published" value={stats.published} active={statusFilter === "published"} onClick={() => setStatusFilter("published")} /><StatCard title="High Priority" value={stats.high} helper="P0-P3 active" active={statusFilter === "high"} onClick={() => setStatusFilter("high")} /></div><div className="bg-white text-slate-950 rounded-3xl p-6"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-pink-600 font-black uppercase tracking-wide text-sm">Admin</p><h2 className="text-2xl font-black mt-1">Video Editing Status Management</h2><p className="text-slate-600 text-sm mt-1">All event workflows with priority, next owner, days waiting, reminder email and direct open controls.</p></div><div className="flex flex-col gap-2 md:flex-row"><input value={statusSearch} onChange={(event) => setStatusSearch(event.target.value)} placeholder="Search event, owner, status..." className="rounded-xl border p-3 text-sm md:w-72" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border p-3 text-sm"><option value="active">Active</option><option value="waiting">Waiting</option><option value="overdue">Overdue</option><option value="high">High Priority</option><option value="published">Published</option><option value="all">All</option>{STATUSES.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}</select></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-3">Priority</th><th>Event</th><th>Status</th><th>Waiting On</th><th>Days</th><th>Editor</th><th>Crew</th><th>Updated</th><th></th></tr></thead><tbody>{managementRows.map((workflow) => { const event = workflow.events || {}; const owner = stuckWith(workflow); const priority = priorityValue(workflow.priority); const wait = daysWaiting(workflow.updated_at); return <tr key={workflow.id} className="border-b last:border-0"><td className="py-3"><select value={priority} onChange={(e) => updatePriority(workflow, e.target.value)} className={`rounded-lg border px-2 py-1 text-xs font-black ${priorityClass(priority)}`}>{Array.from({ length: 21 }, (_v, i) => <option key={i} value={i}>P{i}</option>)}</select></td><td><a href={`/studio/video-production/${workflow.id}`} className="font-black text-pink-600">{event.title || "Untitled event"}</a><p className="text-xs text-slate-500">{shortDate(event.date)}{event.location ? ` · ${event.location}` : ""}</p></td><td>{statusLabel(workflow.status)}</td><td><b>{owner.label}</b>{owner.email && <p className="text-xs text-slate-500">{owner.email}</p>}</td><td>{ACTIVE_STATUSES.includes(String(workflow.status || "")) ? <span className={wait >= 3 ? "font-black text-red-600" : ""}>{wait}</span> : "—"}</td><td>{workflow.assigned_editor_email || "—"}</td><td>{workflow.crew_reviewer_email || "—"}</td><td>{dateText(workflow.updated_at)}</td><td className="flex gap-2 py-3"><button onClick={() => sendStuckEmail(workflow)} disabled={!owner.email} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Email POC</button><a href={`/studio/video-production/${workflow.id}`} className="rounded-lg bg-pink-600 px-3 py-2 text-xs font-black text-white">Open</a></td></tr>; })}{managementRows.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-slate-500">No video workflows match this view.</td></tr>}</tbody></table></div></div></section>}{(admin || crew) && <section className="bg-white text-slate-950 rounded-3xl p-6"><h2 className="text-2xl font-black">Create Video Workflow</h2><p className="text-gray-600 mt-1">Crew can mark an approved event ready for editing after media and notes are available.</p><form onSubmit={createWorkflow} className="grid lg:grid-cols-2 gap-4 mt-5"><select required value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)} className="border rounded-xl p-3 lg:col-span-2"><option value="">Select approved event without a video workflow</option>{availableEvents.map((event) => <option key={event.id} value={event.id}>{event.title} — {shortDate(event.date)} — {event.location}</option>)}</select><input value={form.raw_media_url} onChange={(event) => setForm({ ...form, raw_media_url: event.target.value })} placeholder="SDTV upload folder URL" className="border rounded-xl p-3" /><input value={form.external_media_url} onChange={(event) => setForm({ ...form, external_media_url: event.target.value })} placeholder="External shared media URL" className="border rounded-xl p-3" /><input value={form.assigned_editor_email} onChange={(event) => setForm({ ...form, assigned_editor_email: event.target.value })} placeholder="Assigned editor email" className="border rounded-xl p-3" /><input value={form.crew_reviewer_email} onChange={(event) => setForm({ ...form, crew_reviewer_email: event.target.value })} placeholder="Crew reviewer email" className="border rounded-xl p-3" /><select value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })} className="border rounded-xl p-3">{Array.from({ length: 21 }, (_v, i) => <option key={i} value={i}>Priority P{i}</option>)}</select><textarea value={form.crew_notes} onChange={(event) => setForm({ ...form, crew_notes: event.target.value })} placeholder="Crew notes for editor" className="border rounded-xl p-3 lg:col-span-2 min-h-28" /><button className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black lg:col-span-2">Create Workflow</button></form></section>}<section><h2 className="mb-4 text-3xl font-black">Active Video Workflows</h2><div className="grid xl:grid-cols-2 gap-5">{activeWorkflows.map((workflow) => <WorkflowCard key={workflow.id} workflow={workflow} />)}{activeWorkflows.length === 0 && <div className="bg-white/10 border border-white/10 rounded-2xl p-6 text-slate-300">No active workflows.</div>}</div></section><section><h2 className="mb-4 text-3xl font-black">Published Recently</h2><div className="grid xl:grid-cols-2 gap-5">{publishedWorkflows.map((workflow) => <WorkflowCard key={workflow.id} workflow={workflow} />)}{publishedWorkflows.length === 0 && <div className="bg-white/10 border border-white/10 rounded-2xl p-6 text-slate-300">No published workflows yet.</div>}</div></section></div>}</section></main>;
}

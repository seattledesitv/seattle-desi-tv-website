"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isVideoEditorRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
const STATUS_LABELS: Record<string, string> = {
  review_requested: "Awaiting Review",
  approved_for_publishing: "Approved for Publishing",
  changes_requested: "Changes Requested",
  assigned_to_editor: "Assigned to Editor",
  in_editing: "In Editing",
  ready_for_editing: "Ready for Editing",
  awaiting_crew_review: "Awaiting Crew Review",
  awaiting_admin_approval: "Awaiting Admin Approval",
  published_complete: "Published Complete",
};
const STATUS_ORDER = ["all", "ready_for_editing", "in_editing", "awaiting_crew_review", "changes_requested", "awaiting_admin_approval", "approved_for_publishing", "published_complete"];
const ACTIVE_STATUSES = ["ready_for_editing", "in_editing", "awaiting_crew_review", "changes_requested", "awaiting_admin_approval", "approved_for_publishing"];

type ViewMode = "cards" | "list";
type PriorityFilter = "all" | "p0_3" | "p4_7" | "p8_12" | "p13_20";

function label(value?: string | null) {
  const key = String(value || "");
  return STATUS_LABELS[key] || key.replaceAll("_", " ") || "—";
}
function sameEmail(a?: string | null, b?: string | null) { return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase(); }
function dateText(value?: string | null) { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(); }
function shortDate(value?: string | null) { if (!value) return "Date TBD"; const date = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(); }
function priorityValue(value?: number | string | null) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 10; }
function priorityClass(value?: number | string | null) { const priority = priorityValue(value); if (priority <= 3) return "bg-red-50 text-red-700 border-red-100"; if (priority <= 7) return "bg-orange-50 text-orange-700 border-orange-100"; if (priority <= 12) return "bg-yellow-50 text-yellow-800 border-yellow-100"; return "bg-slate-100 text-slate-700 border-slate-200"; }
function priorityMatches(value: any, filter: PriorityFilter) { const p = priorityValue(value); if (filter === "p0_3") return p <= 3; if (filter === "p4_7") return p >= 4 && p <= 7; if (filter === "p8_12") return p >= 8 && p <= 12; if (filter === "p13_20") return p >= 13; return true; }
function workflowTitle(workflow: any) { return workflow?.events?.title || "Untitled Event"; }
function workflowLocation(workflow: any) { return workflow?.events?.location || ""; }

function StatCard({ title, value, helper }: { title: string; value: number; helper?: string }) {
  return <div className="rounded-2xl bg-white p-5 text-slate-950"><p className="text-sm font-black uppercase text-slate-500">{title}</p><p className="mt-2 text-4xl font-black text-pink-600">{value}</p>{helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}</div>;
}

export default function MyVideoAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading video assignments...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [contentRows, setContentRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  async function load() {
    setLoading(true);
    setActionMessage("");
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to view video assignments."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!(isVideoEditorRole(nextRole) || isAdminRole(nextRole))) { setMessage(`This page is for assigned video editors. Current role: ${nextRole}`); setLoading(false); return; }

    const result = await supabase.from("event_video_workflows").select("*, events(id,title,date,location)").order("priority", { ascending: true }).order("updated_at", { ascending: false });
    if (result.error) { setMessage(result.error.message); setWorkflows([]); } else {
      const rows = result.data || [];
      const visible = isAdminRole(nextRole) ? rows : rows.filter((row: any) => sameEmail(row.assigned_editor_email, currentUser.email));
      setWorkflows(visible);
    }

    const contentResult = await supabase.from("public_content_requests").select("*").order("updated_at", { ascending: false }).limit(200);
    if (contentResult.error) { setActionMessage(`Could not load public content assignments: ${contentResult.error.message}. Run supabase/public-content-requests.sql.`); setContentRows([]); }
    else { const rows = contentResult.data || []; const visible = isAdminRole(nextRole) ? rows : rows.filter((row: any) => sameEmail(row.assigned_editor_email, currentUser.email)); setContentRows(visible); }

    const total = (result.data || []).length + (contentResult.data || []).length;
    setMessage(total ? "Your event video and public content assignments are shown below." : "No video assignments assigned to you yet.");
    setLoading(false);
  }

  async function updateContent(row: any, payload: any, success: string) {
    setActionMessage("Updating content assignment...");
    const { error } = await supabase.from("public_content_requests").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) { setActionMessage(`Update failed: ${error.message}`); return; }
    setActionMessage(success);
    await load();
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: workflows.length,
    active: workflows.filter((w) => ACTIVE_STATUSES.includes(String(w.status || ""))).length,
    inEditing: workflows.filter((w) => String(w.status || "") === "in_editing").length,
    review: workflows.filter((w) => ["awaiting_crew_review", "awaiting_admin_approval", "review_requested"].includes(String(w.status || ""))).length,
    changes: workflows.filter((w) => String(w.status || "") === "changes_requested").length,
    p0: workflows.filter((w) => priorityValue(w.priority) <= 3 && ACTIVE_STATUSES.includes(String(w.status || ""))).length,
    published: workflows.filter((w) => String(w.status || "") === "published_complete").length,
  }), [workflows]);

  const filteredWorkflows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workflows.filter((workflow) => {
      const haystack = `${workflowTitle(workflow)} ${workflowLocation(workflow)} ${workflow.assigned_editor_email || ""} ${label(workflow.status)} ${workflow.crew_notes || ""}`.toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (statusFilter !== "all" && String(workflow.status || "") !== statusFilter) return false;
      return priorityMatches(workflow.priority, priorityFilter);
    });
  }, [workflows, search, statusFilter, priorityFilter]);

  const priorityQueue = useMemo(() => filteredWorkflows.filter((w) => ACTIVE_STATUSES.includes(String(w.status || ""))).slice(0, 8), [filteredWorkflows]);

  function WorkflowCard({ workflow }: { workflow: any }) {
    const event = workflow.events || {};
    const priority = priorityValue(workflow.priority);
    return <article className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl border"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black uppercase tracking-wide text-pink-600">{label(workflow.status)}</p><span className={`rounded-full border px-3 py-1 text-xs font-black ${priorityClass(priority)}`}>P{priority}</span></div><h2 className="text-2xl font-black mt-1">{event.title || "Untitled Event"}</h2><p className="text-gray-600 mt-1">{shortDate(event.date)}{event.location ? ` · ${event.location}` : ""}</p>{workflow.assigned_editor_email && <p className="text-sm text-gray-700 mt-3"><b>Editor:</b> {workflow.assigned_editor_email}</p>}<p className="text-sm text-gray-700 mt-2"><b>Priority:</b> P{priority} {priority === 0 ? "· Highest" : priority === 20 ? "· Lowest" : ""}</p>{workflow.crew_notes && <p className="text-sm text-gray-700 whitespace-pre-line mt-3 line-clamp-4"><b>Notes:</b> {workflow.crew_notes}</p>}<a href={`/studio/video-production/${workflow.id}`} className="inline-block bg-pink-600 text-white px-4 py-2 rounded-xl font-black mt-5">Open Workflow</a></article>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p><h1 className="text-4xl md:text-5xl font-black mt-2">My Video Assignments</h1><p className="text-slate-300 mt-2">Editor workspace for event videos and public content submissions.</p>{user?.email && <p className="text-slate-400 text-sm mt-1">Logged in as {user.email} · Role: {role}</p>}</div><button onClick={load} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button></div>

        {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold mb-5">{actionMessage}</div>}
        {loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && workflows.length === 0 && contentRows.length === 0 && <div className="bg-white text-slate-950 rounded-3xl p-8">{message}</div>}

        {!loading && workflows.length > 0 && <section className="space-y-6 mb-10"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"><StatCard title="Assigned" value={stats.total} /><StatCard title="Active" value={stats.active} /><StatCard title="P0-P3" value={stats.p0} helper="Highest priority" /><StatCard title="In Editing" value={stats.inEditing} /><StatCard title="Review" value={stats.review} /><StatCard title="Published" value={stats.published} /></div>

          <div className="rounded-3xl bg-white p-5 text-slate-950"><div className="flex flex-col gap-3 lg:flex-row lg:items-end"><label className="flex-1 text-sm font-black">Search<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search event, location, notes..." className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="text-sm font-black">Status<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal lg:w-56">{STATUS_ORDER.map((status) => <option key={status} value={status}>{status === "all" ? "All statuses" : label(status)}</option>)}</select></label><label className="text-sm font-black">Priority<select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)} className="mt-1 w-full rounded-xl border p-3 font-normal lg:w-44"><option value="all">All priorities</option><option value="p0_3">P0-P3</option><option value="p4_7">P4-P7</option><option value="p8_12">P8-P12</option><option value="p13_20">P13-P20</option></select></label><div className="flex gap-2"><button onClick={() => setViewMode("cards")} className={`rounded-xl px-4 py-3 font-black ${viewMode === "cards" ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-800"}`}>Cards</button><button onClick={() => setViewMode("list")} className={`rounded-xl px-4 py-3 font-black ${viewMode === "list" ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-800"}`}>List</button></div></div><p className="mt-3 text-sm text-slate-500">Showing {filteredWorkflows.length} of {workflows.length} assignment(s). Priority P0 is highest and P20 is lowest.</p></div>

          {priorityQueue.length > 0 && <div className="rounded-3xl bg-white p-5 text-slate-950"><h2 className="text-2xl font-black">Priority Queue</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-3">Priority</th><th>Event</th><th>Status</th><th>Date</th><th>Updated</th><th></th></tr></thead><tbody>{priorityQueue.map((workflow) => { const priority = priorityValue(workflow.priority); const event = workflow.events || {}; return <tr key={workflow.id} className="border-b last:border-0"><td className="py-3"><span className={`rounded-full border px-3 py-1 text-xs font-black ${priorityClass(priority)}`}>P{priority}</span></td><td className="font-bold">{event.title || "Untitled Event"}</td><td>{label(workflow.status)}</td><td>{shortDate(event.date)}</td><td>{dateText(workflow.updated_at)}</td><td><a href={`/studio/video-production/${workflow.id}`} className="font-black text-pink-600">Open</a></td></tr>; })}</tbody></table></div></div>}
        </section>}

        {!loading && contentRows.length > 0 && <section className="mb-10"><h2 className="text-3xl font-black mb-4">Public Content Assignments</h2><div className="grid lg:grid-cols-2 gap-6">{contentRows.map((row) => <article key={row.id} className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl border"><p className="text-xs font-black uppercase tracking-wide text-pink-600">{label(row.status)}</p><h3 className="text-2xl font-black mt-1">{row.title}</h3><p className="text-gray-600 mt-1">Submitted by {row.submitter_name} · {row.submitter_email}</p>{row.assigned_editor_email && <p className="text-sm text-gray-700 mt-3"><b>Editor:</b> {row.assigned_editor_email}</p>}{row.content_text && <p className="text-sm text-gray-700 whitespace-pre-line mt-3 rounded-xl bg-slate-50 p-3">{row.content_text}</p>}<div className="flex flex-wrap gap-2 mt-4 text-sm">{row.image_url && <a href={row.image_url} target="_blank" rel="noreferrer" className="bg-slate-100 text-pink-600 px-3 py-2 rounded-lg font-bold">Open image</a>}{row.video_url && <a href={row.video_url} target="_blank" rel="noreferrer" className="bg-slate-100 text-pink-600 px-3 py-2 rounded-lg font-bold">Open video</a>}{row.source_url && <a href={row.source_url} target="_blank" rel="noreferrer" className="bg-slate-100 text-pink-600 px-3 py-2 rounded-lg font-bold">Open source</a>}</div><div className="grid gap-3 mt-5"><input defaultValue={row.final_youtube_url || ""} onBlur={(event) => updateContent(row, { final_youtube_url: event.target.value }, "YouTube URL saved.")} placeholder="Final YouTube URL" className="border rounded-xl p-3" /><input defaultValue={row.final_instagram_url || ""} onBlur={(event) => updateContent(row, { final_instagram_url: event.target.value }, "Instagram URL saved.")} placeholder="Final Instagram URL" className="border rounded-xl p-3" /><input defaultValue={row.final_thumbnail_url || ""} onBlur={(event) => updateContent(row, { final_thumbnail_url: event.target.value }, "Thumbnail URL saved.")} placeholder="Final thumbnail URL" className="border rounded-xl p-3" /><textarea defaultValue={row.editor_notes || ""} onBlur={(event) => updateContent(row, { editor_notes: event.target.value }, "Editor notes saved.")} placeholder="Editor notes" className="border rounded-xl p-3 min-h-24" /></div><div className="flex flex-wrap gap-2 mt-5">{row.status === "assigned_to_editor" && <button onClick={() => updateContent(row, { status: "in_editing" }, "Content moved to editing.")} className="bg-slate-950 text-white px-4 py-2 rounded-xl font-black">Start Editing</button>}{["in_editing", "changes_requested"].includes(row.status) && <button onClick={() => updateContent(row, { status: "review_requested", review_requested_at: new Date().toISOString() }, "Content moved to Awaiting Review.")} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-black">Request Review</button>}{isAdminRole(role) && row.status === "review_requested" && <button onClick={() => updateContent(row, { status: "approved_for_publishing", approved_at: new Date().toISOString() }, "Approved for publishing.")} className="bg-green-700 text-white px-4 py-2 rounded-xl font-black">Approve Publishing</button>}{isAdminRole(role) && row.status === "review_requested" && <button onClick={() => updateContent(row, { status: "changes_requested" }, "Changes requested.")} className="bg-yellow-500 text-white px-4 py-2 rounded-xl font-black">Request Changes</button>}{row.status === "approved_for_publishing" && <button onClick={() => updateContent(row, { status: "published", published_at: new Date().toISOString() }, "Content marked published.")} className="bg-purple-700 text-white px-4 py-2 rounded-xl font-black">Mark Published</button>}</div><p className="text-xs text-gray-400 mt-4">Updated {dateText(row.updated_at || row.created_at)}</p></article>)}</div></section>}

        {!loading && workflows.length > 0 && <section><h2 className="text-3xl font-black mb-4">Event Video Assignments</h2>{filteredWorkflows.length === 0 ? <div className="rounded-3xl bg-white p-8 text-slate-950">No assignments match the current filters.</div> : viewMode === "list" ? <div className="overflow-x-auto rounded-3xl bg-white p-5 text-slate-950"><table className="w-full min-w-[820px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-3">Priority</th><th>Event</th><th>Status</th><th>Date</th><th>Location</th><th>Updated</th><th></th></tr></thead><tbody>{filteredWorkflows.map((workflow) => { const event = workflow.events || {}; const priority = priorityValue(workflow.priority); return <tr key={workflow.id} className="border-b last:border-0"><td className="py-3"><span className={`rounded-full border px-3 py-1 text-xs font-black ${priorityClass(priority)}`}>P{priority}</span></td><td className="font-bold">{event.title || "Untitled Event"}</td><td>{label(workflow.status)}</td><td>{shortDate(event.date)}</td><td>{event.location || "—"}</td><td>{dateText(workflow.updated_at)}</td><td><a href={`/studio/video-production/${workflow.id}`} className="font-black text-pink-600">Open</a></td></tr>; })}</tbody></table></div> : <div className="grid lg:grid-cols-2 gap-6">{filteredWorkflows.map((workflow) => <WorkflowCard key={workflow.id} workflow={workflow} />)}</div>}</section>}
      </section>
      <SiteFooter />
    </main>
  );
}

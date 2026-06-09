"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { canAccessVideoProduction, isAdminRole, isTeamRole, isVideoEditorRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

const STATUSES = [
  { key: "ready_for_editing", label: "Ready For Editing", note: "Crew has uploaded media and notes." },
  { key: "in_editing", label: "In Editing", note: "Editor is working on the draft." },
  { key: "awaiting_crew_review", label: "Awaiting Crew Review", note: "Editor draft is ready for crew review." },
  { key: "changes_requested", label: "Changes Requested", note: "Crew/admin feedback needs edits." },
  { key: "awaiting_admin_approval", label: "Awaiting Admin Approval", note: "Crew approved; admin must approve publishing." },
  { key: "approved_for_publishing", label: "Approved For Publishing", note: "Editor can publish." },
  { key: "published_complete", label: "Published Complete", note: "Publishing cycle is complete." },
];

function dateText(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function shortDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function statusLabel(status?: string | null) {
  return STATUSES.find((item) => item.key === status)?.label || String(status || "Ready For Editing").replaceAll("_", " ");
}

function emailMatches(a?: string | null, b?: string | null) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
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
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ raw_media_url: "", external_media_url: "", crew_notes: "", assigned_editor_email: "", crew_reviewer_email: "" });
  const canAccess = Boolean(user && canAccessVideoProduction(role));
  const admin = isAdminRole(role);
  const crew = isTeamRole(role);
  const editor = isVideoEditorRole(role);

  async function loadData(currentUser?: any, currentRole?: string) {
    const activeUser = currentUser || user;
    const activeRole = currentRole || role;
    const activeEmail = activeUser?.email || "";

    const workflowResult = await supabase
      .from("event_video_workflows")
      .select("*, events(id,title,date,location,image,image_urls)")
      .order("updated_at", { ascending: false });

    if (workflowResult.error) {
      setActionMessage(`Could not load video workflows: ${workflowResult.error.message}`);
      setWorkflows([]);
    } else {
      const rows = workflowResult.data || [];
      const visibleRows = isAdminRole(activeRole)
        ? rows
        : rows.filter((row: any) => emailMatches(row.assigned_editor_email, activeEmail) || emailMatches(row.crew_reviewer_email, activeEmail) || isTeamRole(activeRole));
      setWorkflows(visibleRows);
    }

    if (isAdminRole(activeRole) || isTeamRole(activeRole)) {
      const eventResult = await supabase
        .from("events")
        .select("id,title,date,location,status")
        .eq("status", "approved")
        .order("date", { ascending: false })
        .limit(100);
      if (!eventResult.error) setEvents(eventResult.data || []);
    }
  }

  async function init() {
    setLoading(true);
    setActionMessage("");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) {
      setRole("");
      setMessage("Please login to access Video Production.");
      setLoading(false);
      return;
    }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!canAccessVideoProduction(nextRole)) {
      setMessage("You are logged in, but this account does not have Video Production access.");
      setLoading(false);
      return;
    }
    await loadData(currentUser, nextRole);
    setMessage("");
    setLoading(false);
  }

  async function createWorkflow(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedEventId || !user?.id) return;
    setActionMessage("Creating video workflow...");
    const { error } = await supabase.from("event_video_workflows").insert({
      event_id: selectedEventId,
      status: "ready_for_editing",
      raw_media_url: form.raw_media_url || null,
      external_media_url: form.external_media_url || null,
      crew_notes: form.crew_notes || null,
      assigned_editor_email: form.assigned_editor_email || null,
      crew_reviewer_email: form.crew_reviewer_email || user.email || null,
      created_by: user.id,
      updated_by: user.id,
    });
    if (error) {
      setActionMessage(`Could not create workflow: ${error.message}`);
      return;
    }
    setActionMessage("Video workflow created and marked ready for editing.");
    setSelectedEventId("");
    setForm({ raw_media_url: "", external_media_url: "", crew_notes: "", assigned_editor_email: "", crew_reviewer_email: "" });
    await loadData();
  }

  async function updateWorkflow(workflow: any, payload: any, success: string) {
    setActionMessage("Updating workflow...");
    const { error } = await supabase
      .from("event_video_workflows")
      .update({ ...payload, updated_by: user?.id || null, updated_at: new Date().toISOString() })
      .eq("id", workflow.id);
    if (error) {
      setActionMessage(`Workflow update failed: ${error.message}`);
      return;
    }
    setActionMessage(success);
    await loadData();
  }

  async function sendAdminEmail(workflow: any) {
    const event = workflow.events || {};
    await fetch("/api/notify-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "video production approval",
        title: event.title || "Event video workflow",
        date: event.date || "",
        location: event.location || "",
        submittedBy: user?.email || "crew",
        reviewUrl: `${window.location.origin}/studio/video-production`,
      }),
    }).catch(() => null);
  }

  async function notifyAdminsInApp(workflow: any) {
    const event = workflow.events || {};
    const { data } = await supabase.from("admins").select("user_id,email");
    const admins = data || [];
    const notifications = admins.filter((admin: any) => admin.user_id).map((admin: any) => ({
      user_id: admin.user_id,
      title: "Video workflow awaiting final approval",
      message: `${event.title || "An event video"} was approved by crew and needs SDTV admin final approval before publishing.`,
      link: "/studio/video-production",
      read: false,
    }));
    if (!notifications.length) return;
    await supabase.from("notifications").insert(notifications);
  }

  async function markCrewApproved(workflow: any) {
    await updateWorkflow(workflow, { status: "awaiting_admin_approval", crew_reviewer_email: workflow.crew_reviewer_email || user?.email || null, crew_approved_at: new Date().toISOString() }, "Crew approved. Admin has been notified for final approval.");
    await sendAdminEmail(workflow);
    await notifyAdminsInApp(workflow);
  }

  const filteredWorkflows = useMemo(() => filter === "all" ? workflows : workflows.filter((workflow) => workflow.status === filter), [workflows, filter]);
  const grouped = useMemo(() => Object.fromEntries(STATUSES.map((status) => [status.key, filteredWorkflows.filter((workflow) => workflow.status === status.key)])), [filteredWorkflows]);
  const existingEventIds = useMemo(() => new Set(workflows.map((workflow) => workflow.event_id)), [workflows]);
  const availableEvents = events.filter((event) => !existingEventIds.has(event.id));

  function WorkflowCard({ workflow }: { workflow: any }) {
    const event = workflow.events || {};
    const mediaUrl = workflow.raw_media_url || workflow.external_media_url;
    const canCrewReview = crew && (workflow.status === "awaiting_crew_review" || workflow.status === "changes_requested");
    const canAdminApprove = admin && workflow.status === "awaiting_admin_approval";
    const canEditorPublish = editor && workflow.status === "approved_for_publishing";

    return (
      <article className="bg-white text-slate-950 rounded-2xl p-5 shadow-sm border space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-pink-600">{statusLabel(workflow.status)}</p>
          <h3 className="text-xl font-black mt-1">{event.title || "Untitled event"}</h3>
          <p className="text-sm text-gray-600 mt-1">{shortDate(event.date)}{event.location ? ` · ${event.location}` : ""}</p>
        </div>
        <div className="text-sm text-gray-700 space-y-1">
          {workflow.assigned_editor_email && <p><b>Editor:</b> {workflow.assigned_editor_email}</p>}
          {workflow.crew_reviewer_email && <p><b>Crew Reviewer:</b> {workflow.crew_reviewer_email}</p>}
          {workflow.crew_notes && <p className="whitespace-pre-line"><b>Crew Notes:</b> {workflow.crew_notes}</p>}
          {workflow.editor_notes && <p className="whitespace-pre-line"><b>Editor Notes:</b> {workflow.editor_notes}</p>}
          {mediaUrl && <p><a href={mediaUrl} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Open media source</a></p>}
          {workflow.youtube_url && <p><a href={workflow.youtube_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">YouTube video</a></p>}
          {workflow.instagram_url && <p><a href={workflow.instagram_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Instagram post</a></p>}
          <p className="text-xs text-gray-400">Updated {dateText(workflow.updated_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/studio/video-production/${workflow.id}`} className="bg-pink-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Open Workflow</a>
          {workflow.status === "ready_for_editing" && editor && <button onClick={() => updateWorkflow(workflow, { status: "in_editing", assigned_editor_email: workflow.assigned_editor_email || user?.email || null }, "Workflow moved to editing.")} className="bg-slate-950 text-white px-3 py-2 rounded-lg font-bold text-sm">Start Editing</button>}
          {workflow.status === "in_editing" && editor && <button onClick={() => updateWorkflow(workflow, { status: "awaiting_crew_review" }, "Draft marked ready for crew review.")} className="bg-pink-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Submit For Crew Review</button>}
          {canCrewReview && <button onClick={() => markCrewApproved(workflow)} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Crew Approve</button>}
          {canCrewReview && <button onClick={() => updateWorkflow(workflow, { status: "changes_requested" }, "Changes requested from editor.")} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">Request Changes</button>}
          {canAdminApprove && <button onClick={() => updateWorkflow(workflow, { status: "approved_for_publishing", admin_approver_email: user?.email || null, admin_approved_at: new Date().toISOString() }, "Admin approved. Editor can publish.")} className="bg-green-700 text-white px-3 py-2 rounded-lg font-bold text-sm">Admin Final Approve</button>}
          {canAdminApprove && <button onClick={() => updateWorkflow(workflow, { status: "changes_requested" }, "Admin requested changes.")} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">Send Back</button>}
          {canEditorPublish && <button onClick={() => updateWorkflow(workflow, { status: "published_complete", published_at: new Date().toISOString() }, "Video publishing cycle marked complete.")} className="bg-purple-700 text-white px-3 py-2 rounded-lg font-bold text-sm">Mark Published Complete</button>}
        </div>
      </article>
    );
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const requestedStatus = new URLSearchParams(window.location.search).get("status") || "";
      if (STATUSES.some((status) => status.key === requestedStatus)) setFilter(requestedStatus);
    }
    init();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black">Video Production</h1>
            <p className="text-slate-300 mt-2">Crew → Editor → Crew Review → Admin Approval → Publish Complete</p>
            {user?.email && <p className="text-slate-400 text-sm mt-1">Logged in as {user.email} · Role: {role}</p>}
          </div>
          <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
        </div>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Access Required</h2><p className="text-gray-600 mt-3">{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}

        {!loading && canAccess && <div className="space-y-8">
          {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}

          {(admin || crew) && <section className="bg-white text-slate-950 rounded-3xl p-6">
            <h2 className="text-2xl font-black">Create Video Workflow</h2>
            <p className="text-gray-600 mt-1">Crew can mark an approved event ready for editing after media and notes are available.</p>
            <form onSubmit={createWorkflow} className="grid lg:grid-cols-2 gap-4 mt-5">
              <select required value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)} className="border rounded-xl p-3 lg:col-span-2">
                <option value="">Select approved event without a video workflow</option>
                {availableEvents.map((event) => <option key={event.id} value={event.id}>{event.title} — {shortDate(event.date)} — {event.location}</option>)}
              </select>
              <input value={form.raw_media_url} onChange={(event) => setForm({ ...form, raw_media_url: event.target.value })} placeholder="SDTV upload folder URL" className="border rounded-xl p-3" />
              <input value={form.external_media_url} onChange={(event) => setForm({ ...form, external_media_url: event.target.value })} placeholder="External shared media URL" className="border rounded-xl p-3" />
              <input value={form.assigned_editor_email} onChange={(event) => setForm({ ...form, assigned_editor_email: event.target.value })} placeholder="Assigned editor email" className="border rounded-xl p-3" />
              <input value={form.crew_reviewer_email} onChange={(event) => setForm({ ...form, crew_reviewer_email: event.target.value })} placeholder="Crew reviewer email" className="border rounded-xl p-3" />
              <textarea value={form.crew_notes} onChange={(event) => setForm({ ...form, crew_notes: event.target.value })} placeholder="Crew notes: location, important moments, sponsor mentions, interviews, credits..." className="border rounded-xl p-3 lg:col-span-2 min-h-28" />
              <button className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black lg:col-span-2">Mark Ready For Editing</button>
            </form>
          </section>}

          <section>
            <div className="flex flex-wrap gap-3 mb-5">
              <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-xl font-bold ${filter === "all" ? "bg-pink-600" : "bg-white/10"}`}>All ({workflows.length})</button>
              {STATUSES.map((status) => <button key={status.key} onClick={() => setFilter(status.key)} className={`px-4 py-2 rounded-xl font-bold ${filter === status.key ? "bg-pink-600" : "bg-white/10"}`}>{status.label} ({workflows.filter((workflow) => workflow.status === status.key).length})</button>)}
            </div>

            <div className="grid xl:grid-cols-3 gap-5">
              {STATUSES.map((status) => <div key={status.key} className="bg-white/10 border border-white/10 rounded-3xl p-4 min-h-40"><div className="mb-4"><h2 className="text-xl font-black">{status.label}</h2><p className="text-slate-300 text-sm">{status.note}</p></div><div className="space-y-4">{(grouped[status.key] || []).map((workflow: any) => <WorkflowCard key={workflow.id} workflow={workflow} />)}{(grouped[status.key] || []).length === 0 && <div className="border border-dashed border-white/20 rounded-2xl p-5 text-slate-400 text-sm">No workflows in this stage.</div>}</div></div>)}
            </div>
          </section>
        </div>}
      </section>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isVideoEditorRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

const EDITOR_STATUSES = [
  { key: "ready_for_editing", label: "Ready for Editing", note: "Crew has shared media and notes. Start here." },
  { key: "in_editing", label: "Currently Editing", note: "Draft work is in progress." },
  { key: "awaiting_crew_review", label: "Awaiting Crew Review", note: "Draft has been submitted for review." },
  { key: "changes_requested", label: "Changes Requested", note: "Crew or admin feedback needs updates." },
  { key: "approved_for_publishing", label: "Approved for Publishing", note: "Final approval is complete. Publish and close." },
  { key: "published_complete", label: "Published Complete", note: "Completed editing workflow." },
];

function shortDate(value?: string | null) { if (!value) return ""; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
function dateText(value?: string | null) { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString(); }
function statusLabel(value?: string | null) { return EDITOR_STATUSES.find((status) => status.key === value)?.label || String(value || "ready_for_editing").replaceAll("_", " "); }
function emailMatches(a?: string | null, b?: string | null) { return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase(); }
function isUnassignedReady(row: any) { return row.status === "ready_for_editing" && !String(row.assigned_editor_email || "").trim(); }

export default function MyEditingPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading editing queue...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [filter, setFilter] = useState("open");

  const canAccess = Boolean(user && (isVideoEditorRole(role) || isAdminRole(role)));

  async function loadQueue(currentUser?: any, currentRole?: string) {
    const activeUser = currentUser || user;
    const activeRole = currentRole || role;
    const activeEmail = activeUser?.email || "";
    const { data, error } = await supabase.from("event_video_workflows").select("*, events(id,title,date,location,image,image_urls)").order("updated_at", { ascending: false });
    if (error) { setActionMessage(`Could not load editing queue: ${error.message}`); setWorkflows([]); return; }
    const rows = data || [];
    const visibleRows = isAdminRole(activeRole) ? rows : rows.filter((row: any) => emailMatches(row.assigned_editor_email, activeEmail) || isUnassignedReady(row));
    setWorkflows(visibleRows);
  }

  async function init() {
    setLoading(true);
    setActionMessage("");
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setRole("general_public"); setMessage("Please login to access your editing queue."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isVideoEditorRole(nextRole) && !isAdminRole(nextRole)) { setMessage("Your account does not have video editor access yet."); setLoading(false); return; }
    await loadQueue(currentUser, nextRole);
    setMessage("");
    setLoading(false);
  }

  async function updateWorkflow(workflow: any, payload: any, success: string) {
    setActionMessage("Updating workflow...");
    const { error } = await supabase.from("event_video_workflows").update({ ...payload, updated_by: user?.id || null, updated_at: new Date().toISOString() }).eq("id", workflow.id);
    if (error) { setActionMessage(`Workflow update failed: ${error.message}`); return; }
    setWorkflows((current) => current.map((item) => item.id === workflow.id ? { ...item, ...payload } : item));
    setActionMessage(success);
    await loadQueue();
  }

  const openStatuses = ["ready_for_editing", "in_editing", "changes_requested", "approved_for_publishing"];
  const filteredWorkflows = useMemo(() => {
    if (filter === "all") return workflows;
    if (filter === "open") return workflows.filter((workflow) => openStatuses.includes(workflow.status));
    return workflows.filter((workflow) => workflow.status === filter);
  }, [workflows, filter]);

  const stats = [
    { title: "Assigned Videos", value: workflows.length },
    { title: "In Progress", value: workflows.filter((workflow) => workflow.status === "in_editing").length },
    { title: "Awaiting Review", value: workflows.filter((workflow) => workflow.status === "awaiting_crew_review").length },
    { title: "Approved for Publishing", value: workflows.filter((workflow) => workflow.status === "approved_for_publishing").length },
  ];

  function WorkflowCard({ workflow }: { workflow: any }) {
    const event = workflow.events || {};
    const flyer = Array.isArray(event.image_urls) ? event.image_urls[0] : event.image;
    const sourceUrl = workflow.raw_media_url || workflow.external_media_url;
    return <article className="bg-white text-slate-950 rounded-3xl p-5 shadow-xl border"><div className="flex gap-4">{flyer && <img src={flyer} alt={event.title || "Event flyer"} className="w-20 h-24 object-cover rounded-2xl border shrink-0" />}<div className="min-w-0"><p className="text-xs font-black uppercase tracking-wide text-pink-600">{statusLabel(workflow.status)}</p><h3 className="text-xl font-black mt-1">{event.title || "Untitled event"}</h3><p className="text-sm text-gray-600 mt-1">{shortDate(event.date)}{event.location ? ` · ${event.location}` : ""}</p>{!workflow.assigned_editor_email && workflow.status === "ready_for_editing" && <p className="text-xs text-yellow-700 bg-yellow-50 rounded-full px-3 py-1 inline-block mt-2 font-bold">Unassigned - first editor to start will claim it</p>}<p className="text-xs text-gray-400 mt-2">Updated {dateText(workflow.updated_at)}</p></div></div><div className="text-sm text-gray-700 space-y-2 mt-4">{workflow.crew_notes && <p className="whitespace-pre-line"><b>Crew notes:</b><br />{workflow.crew_notes}</p>}{workflow.editor_notes && <p className="whitespace-pre-line"><b>Latest feedback / notes:</b><br />{workflow.editor_notes}</p>}{sourceUrl && <p><a href={sourceUrl} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Open source media</a></p>}</div><div className="flex flex-wrap gap-2 mt-5"><a href={`/studio/video-production/${workflow.id}`} className="bg-slate-950 text-white px-4 py-2 rounded-xl font-black text-sm">Open Workflow</a>{workflow.status === "ready_for_editing" && <button onClick={() => updateWorkflow(workflow, { status: "in_editing", assigned_editor_email: workflow.assigned_editor_email || user?.email || null }, "Editing started and assigned to you.")} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-black text-sm">Start Editing</button>}{workflow.status === "in_editing" && <a href={`/studio/video-production/${workflow.id}`} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-black text-sm">Upload Draft</a>}{workflow.status === "changes_requested" && <a href={`/studio/video-production/${workflow.id}`} className="bg-yellow-500 text-white px-4 py-2 rounded-xl font-black text-sm">Upload Updated Draft</a>}{workflow.status === "approved_for_publishing" && <a href={`/studio/video-production/${workflow.id}`} className="bg-purple-700 text-white px-4 py-2 rounded-xl font-black text-sm">Publish / Mark Complete</a>}</div></article>;
  }

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader /><section className="max-w-7xl mx-auto px-6 py-10"><a href="/my-hub" className="text-pink-300 font-bold">← Back to My Hub</a><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-5 mb-8"><div><p className="text-pink-300 font-black uppercase tracking-wide">Editor Workspace</p><h1 className="text-4xl md:text-5xl font-black mt-2">My Editing Queue</h1><p className="text-slate-300 mt-2">Ready for editing → draft upload → crew review → changes → publishing complete.</p>{user?.email && <p className="text-slate-400 text-sm mt-1">{user.email} · {role}</p>}</div><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold w-fit">Refresh</button></div>{loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-3xl p-8 max-w-xl"><h2 className="text-2xl font-black">Video Editor Access Required</h2><p className="text-gray-600 mt-3">{message}</p><a href="/my-role-requests" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Request Access</a></div>}{!loading && canAccess && <div className="space-y-8">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<div className="grid md:grid-cols-4 gap-4">{stats.map((stat) => <div key={stat.title} className="bg-white text-slate-950 rounded-2xl p-5"><p className="text-sm text-gray-500 font-black uppercase">{stat.title}</p><p className="text-4xl font-black text-pink-600 mt-2">{stat.value}</p></div>)}</div><div className="flex flex-wrap gap-3"><button onClick={() => setFilter("open")} className={`px-4 py-2 rounded-xl font-bold ${filter === "open" ? "bg-pink-600" : "bg-white/10"}`}>Open ({workflows.filter((workflow) => openStatuses.includes(workflow.status)).length})</button><button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-xl font-bold ${filter === "all" ? "bg-pink-600" : "bg-white/10"}`}>All ({workflows.length})</button>{EDITOR_STATUSES.map((status) => <button key={status.key} onClick={() => setFilter(status.key)} className={`px-4 py-2 rounded-xl font-bold ${filter === status.key ? "bg-pink-600" : "bg-white/10"}`}>{status.label} ({workflows.filter((workflow) => workflow.status === status.key).length})</button>)}</div><div className="grid lg:grid-cols-2 gap-5">{filteredWorkflows.map((workflow) => <WorkflowCard key={workflow.id} workflow={workflow} />)}{filteredWorkflows.length === 0 && <div className="bg-white/10 border border-dashed border-white/20 rounded-3xl p-8 text-slate-300">No editor workflows in this view.</div>}</div></div>}</section><SiteFooter /></main>;
}

"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../../lib/supabaseBrowser";
import { canAccessVideoProduction, isAdminRole, isTeamRole, isVideoEditorRole, resolveUserRole } from "../../../lib/roles";

const supabase = getSupabaseBrowserClient();

function getWorkflowIdFromPath() {
  if (typeof window === "undefined") return "";
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("video-production");
  return idx >= 0 ? parts[idx + 1] || "" : "";
}

function niceDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function niceStatus(value?: string | null) {
  return String(value || "ready_for_editing").replaceAll("_", " ");
}

export default function VideoWorkflowDetailPage() {
  const [workflowId, setWorkflowId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading workflow...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [workflow, setWorkflow] = useState<any>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [draft, setDraft] = useState({ full_video_url: "", reel_url: "", youtube_title: "", instagram_caption: "", notes: "" });
  const [feedback, setFeedback] = useState("");
  const [publish, setPublish] = useState({ youtube_url: "", instagram_url: "", facebook_url: "", publish_notes: "" });

  const admin = isAdminRole(role);
  const crew = isTeamRole(role);
  const editor = isVideoEditorRole(role);
  const canAccess = Boolean(user && canAccessVideoProduction(role));
  const event = workflow?.events || {};

  async function loadWorkflow(id: string) {
    if (!id) { setMessage("Workflow ID is missing from the URL."); return; }
    const { data, error } = await supabase.from("event_video_workflows").select("*, events(id,title,date,location,coverage_brief,required_shots,interview_targets,sponsor_requirements,special_instructions)").eq("id", id).maybeSingle();
    if (error) { setWorkflow(null); setMessage(`Could not load workflow: ${error.message}`); return; }
    if (!data) { setWorkflow(null); setMessage(`Workflow not found for ID: ${id}`); return; }
    setWorkflow(data);
    setPublish({ youtube_url: data.youtube_url || "", instagram_url: data.instagram_url || "", facebook_url: data.facebook_url || "", publish_notes: data.publish_notes || "" });
    setMessage("");
  }

  async function loadRevisions(id: string) {
    if (!id) return;
    const { data } = await supabase.from("event_video_revisions").select("*").eq("workflow_id", id).order("revision_number", { ascending: false }).order("created_at", { ascending: false });
    setRevisions(data || []);
  }

  async function init() {
    setLoading(true);
    setActionMessage("");
    const id = getWorkflowIdFromPath();
    setWorkflowId(id);
    const session = await supabase.auth.getSession();
    const currentUser = session.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access Video Production."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!canAccessVideoProduction(nextRole)) { setMessage("You do not have Video Production access."); setLoading(false); return; }
    await loadWorkflow(id);
    await loadRevisions(id);
    setLoading(false);
  }

  async function updateWorkflow(payload: any, success: string) {
    if (!workflow?.id) return;
    const { error } = await supabase.from("event_video_workflows").update({ ...payload, updated_by: user?.id || null, updated_at: new Date().toISOString() }).eq("id", workflow.id);
    if (error) { setActionMessage(`Update failed: ${error.message}`); return; }
    setActionMessage(success);
    await loadWorkflow(workflow.id);
  }

  async function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!workflow?.id || !user?.id) return;
    const nextRevision = Math.max(0, ...revisions.map((r) => Number(r.revision_number || 0))) + 1;
    const { error } = await supabase.from("event_video_revisions").insert({ workflow_id: workflow.id, revision_number: nextRevision, full_video_url: draft.full_video_url || null, reel_url: draft.reel_url || null, youtube_title: draft.youtube_title || null, instagram_caption: draft.instagram_caption || null, feedback: draft.notes || null, submitted_by: user.id, submitted_by_email: user.email || null });
    if (error) { setActionMessage(`Draft failed: ${error.message}`); return; }
    setDraft({ full_video_url: "", reel_url: "", youtube_title: "", instagram_caption: "", notes: "" });
    await updateWorkflow({ status: "awaiting_crew_review", editor_notes: draft.notes || null }, `Revision ${nextRevision} submitted for crew review.`);
    await loadRevisions(workflow.id);
  }

  async function requestChanges() {
    if (!workflow?.id || !feedback.trim() || !user?.id) return;
    const nextRevision = Math.max(0, ...revisions.map((r) => Number(r.revision_number || 0))) + 1;
    await supabase.from("event_video_revisions").insert({ workflow_id: workflow.id, revision_number: nextRevision, feedback, submitted_by: user.id, submitted_by_email: user.email || null });
    setFeedback("");
    await updateWorkflow({ status: "changes_requested", editor_notes: feedback }, "Feedback saved. Changes requested.");
    await loadRevisions(workflow.id);
  }

  async function markPublished(e: React.FormEvent) {
    e.preventDefault();
    await updateWorkflow({ status: "published_complete", youtube_url: publish.youtube_url || null, instagram_url: publish.instagram_url || null, facebook_url: publish.facebook_url || null, publish_notes: publish.publish_notes || null, published_at: new Date().toISOString() }, "Publishing cycle marked complete.");
  }

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="max-w-6xl mx-auto px-6 py-10"><a href="/studio/video-production" className="text-pink-300 font-bold">← Back to Video Production</a><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mt-5 mb-8"><div><p className="text-pink-300 font-black uppercase tracking-wide">Video Workflow</p><h1 className="text-4xl md:text-5xl font-black mt-2">{event.title || "Video Production"}</h1><p className="text-slate-300 mt-2">{event.location || ""}</p>{workflow?.status && <p className="inline-block bg-white/10 px-3 py-1 rounded-full mt-3 font-bold capitalize">{niceStatus(workflow.status)}</p>}<p className="text-xs text-slate-500 mt-2">Workflow ID: {workflowId}</p></div><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button></div>{loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}{!loading && canAccess && !workflow && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}{!loading && canAccess && workflow && <div className="space-y-8">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<section className="grid lg:grid-cols-2 gap-5"><div className="bg-white text-slate-950 rounded-3xl p-6"><h2 className="text-xl font-black">Media Sources</h2>{workflow.raw_media_url && <p className="mt-3"><a href={workflow.raw_media_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">SDTV upload folder</a></p>}{workflow.external_media_url && <p className="mt-3"><a href={workflow.external_media_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">External shared folder</a></p>}<p className="text-sm text-gray-500 mt-4">Editor: {workflow.assigned_editor_email || "Not assigned"}<br />Crew: {workflow.crew_reviewer_email || "Not assigned"}</p></div><div className="bg-white text-slate-950 rounded-3xl p-6"><h2 className="text-xl font-black">Coverage Brief</h2><p className="whitespace-pre-line mt-3 text-sm"><b>Brief:</b><br />{event.coverage_brief || "No brief yet."}</p><p className="whitespace-pre-line mt-3 text-sm"><b>Required Shots:</b><br />{event.required_shots || "None listed."}</p><p className="whitespace-pre-line mt-3 text-sm"><b>Interview Targets:</b><br />{event.interview_targets || "None listed."}</p><p className="whitespace-pre-line mt-3 text-sm"><b>Sponsor Requirements:</b><br />{event.sponsor_requirements || "None listed."}</p></div></section>{editor && <section className="bg-white text-slate-950 rounded-3xl p-6"><h2 className="text-2xl font-black">Submit Draft / Revision</h2><form onSubmit={submitDraft} className="grid lg:grid-cols-2 gap-4 mt-5"><input value={draft.full_video_url} onChange={(e) => setDraft({ ...draft, full_video_url: e.target.value })} placeholder="Full video review URL" className="border rounded-xl p-3" /><input value={draft.reel_url} onChange={(e) => setDraft({ ...draft, reel_url: e.target.value })} placeholder="Reel review URL" className="border rounded-xl p-3" /><input value={draft.youtube_title} onChange={(e) => setDraft({ ...draft, youtube_title: e.target.value })} placeholder="YouTube title draft" className="border rounded-xl p-3" /><textarea value={draft.instagram_caption} onChange={(e) => setDraft({ ...draft, instagram_caption: e.target.value })} placeholder="Instagram caption / hashtags" className="border rounded-xl p-3 min-h-24" /><textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Editor notes" className="border rounded-xl p-3 lg:col-span-2 min-h-24" /><button className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black lg:col-span-2">Submit For Crew Review</button></form></section>}{(crew || admin) && <section className="bg-white text-slate-950 rounded-3xl p-6"><h2 className="text-2xl font-black">Review</h2><textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback if changes are needed..." className="border rounded-xl p-3 w-full min-h-28 mt-4" /><div className="flex flex-wrap gap-3 mt-4"><button onClick={requestChanges} className="bg-yellow-500 text-white px-5 py-3 rounded-xl font-black">Request Changes</button>{crew && <button onClick={() => updateWorkflow({ status: "awaiting_admin_approval", crew_reviewer_email: workflow.crew_reviewer_email || user?.email || null, crew_approved_at: new Date().toISOString() }, "Crew approved. Awaiting admin approval.")} className="bg-green-600 text-white px-5 py-3 rounded-xl font-black">Crew Approve</button>}{admin && <button onClick={() => updateWorkflow({ status: "approved_for_publishing", admin_approver_email: user?.email || null, admin_approved_at: new Date().toISOString() }, "Admin approved. Editor can publish.")} className="bg-green-700 text-white px-5 py-3 rounded-xl font-black">Admin Final Approve</button>}</div></section>}{editor && workflow.status === "approved_for_publishing" && <section className="bg-white text-slate-950 rounded-3xl p-6"><h2 className="text-2xl font-black">Publishing Confirmation</h2><form onSubmit={markPublished} className="grid lg:grid-cols-2 gap-4 mt-5"><input value={publish.youtube_url} onChange={(e) => setPublish({ ...publish, youtube_url: e.target.value })} placeholder="Final YouTube URL" className="border rounded-xl p-3" /><input value={publish.instagram_url} onChange={(e) => setPublish({ ...publish, instagram_url: e.target.value })} placeholder="Final Instagram URL" className="border rounded-xl p-3" /><input value={publish.facebook_url} onChange={(e) => setPublish({ ...publish, facebook_url: e.target.value })} placeholder="Final Facebook URL" className="border rounded-xl p-3 lg:col-span-2" /><textarea value={publish.publish_notes} onChange={(e) => setPublish({ ...publish, publish_notes: e.target.value })} placeholder="Publishing notes" className="border rounded-xl p-3 lg:col-span-2 min-h-24" /><button className="bg-purple-700 text-white px-5 py-3 rounded-xl font-black lg:col-span-2">Mark Published Complete</button></form></section>}<section className="bg-white text-slate-950 rounded-3xl p-6"><h2 className="text-2xl font-black">Revision History</h2><div className="grid gap-4 mt-5">{revisions.length === 0 && <div className="border rounded-2xl p-5 text-gray-500">No revisions or feedback yet.</div>}{revisions.map((revision) => <article key={revision.id} className="border rounded-2xl p-5"><h3 className="font-black text-lg">Revision {revision.revision_number}</h3><p className="text-sm text-gray-500">{revision.submitted_by_email || "Unknown"} · {niceDate(revision.created_at)}</p>{revision.full_video_url && <p className="mt-2"><a href={revision.full_video_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Full video draft</a></p>}{revision.reel_url && <p><a href={revision.reel_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Reel draft</a></p>}{revision.feedback && <p className="mt-3 whitespace-pre-line bg-yellow-50 text-yellow-900 rounded-xl p-3">{revision.feedback}</p>}</article>)}</div></section></div>}</section></main>;
}

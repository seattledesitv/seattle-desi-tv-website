"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../../lib/supabaseBrowser";
import { canAccessVideoProduction, isAdminRole, isTeamRole, isVideoEditorRole, resolveUserRole } from "../../../lib/roles";

const supabase = getSupabaseBrowserClient();

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
  return String(status || "ready_for_editing").replaceAll("_", " ");
}

export default function VideoWorkflowDetailPage({ params }: { params: { id: string } }) {
  const workflowId = params.id;
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading workflow...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [workflow, setWorkflow] = useState<any>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [draftForm, setDraftForm] = useState({ full_video_url: "", reel_url: "", thumbnail_url: "", youtube_title: "", youtube_description: "", instagram_caption: "", editor_notes: "" });
  const [feedback, setFeedback] = useState("");
  const [publishForm, setPublishForm] = useState({ youtube_url: "", instagram_url: "", facebook_url: "", publish_notes: "" });

  const admin = isAdminRole(role);
  const crew = isTeamRole(role);
  const editor = isVideoEditorRole(role);
  const canAccess = Boolean(user && canAccessVideoProduction(role));
  const event = workflow?.events || {};
  const latestRevisionNumber = useMemo(() => revisions.reduce((max, row) => Math.max(max, Number(row.revision_number || 0)), 0), [revisions]);

  async function loadWorkflow() {
    const { data, error } = await supabase
      .from("event_video_workflows")
      .select("*, events(id,title,date,location,description)")
      .eq("id", workflowId)
      .maybeSingle();
    if (error) {
      setWorkflow(null);
      setMessage(`Could not load workflow: ${error.message}`);
      return;
    }
    if (!data) {
      setWorkflow(null);
      setMessage("Workflow not found.");
      return;
    }
    setWorkflow(data);
    setPublishForm({
      youtube_url: data.youtube_url || "",
      instagram_url: data.instagram_url || "",
      facebook_url: data.facebook_url || "",
      publish_notes: data.publish_notes || "",
    });
  }

  async function loadRevisions() {
    const { data, error } = await supabase
      .from("event_video_revisions")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("revision_number", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      setActionMessage(`Could not load revisions: ${error.message}`);
      setRevisions([]);
      return;
    }
    setRevisions(data || []);
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
    await loadWorkflow();
    await loadRevisions();
    setMessage("");
    setLoading(false);
  }

  async function updateWorkflow(payload: any, success: string) {
    if (!workflow?.id) return;
    setActionMessage("Updating workflow...");
    const { error } = await supabase
      .from("event_video_workflows")
      .update({ ...payload, updated_by: user?.id || null, updated_at: new Date().toISOString() })
      .eq("id", workflow.id);
    if (error) {
      setActionMessage(`Workflow update failed: ${error.message}`);
      return false;
    }
    setActionMessage(success);
    await loadWorkflow();
    return true;
  }

  async function submitDraft(event: React.FormEvent) {
    event.preventDefault();
    if (!workflow?.id || !user?.id) return;
    const nextRevision = latestRevisionNumber + 1;
    setActionMessage("Submitting revision for crew review...");
    const { error } = await supabase.from("event_video_revisions").insert({
      workflow_id: workflow.id,
      revision_number: nextRevision,
      full_video_url: draftForm.full_video_url || null,
      reel_url: draftForm.reel_url || null,
      thumbnail_url: draftForm.thumbnail_url || null,
      youtube_title: draftForm.youtube_title || null,
      youtube_description: draftForm.youtube_description || null,
      instagram_caption: draftForm.instagram_caption || null,
      feedback: draftForm.editor_notes || null,
      submitted_by: user.id,
      submitted_by_email: user.email || null,
    });
    if (error) {
      setActionMessage(`Could not submit revision: ${error.message}`);
      return;
    }
    await updateWorkflow({ status: "awaiting_crew_review", editor_notes: draftForm.editor_notes || null }, `Revision ${nextRevision} submitted for crew review.`);
    setDraftForm({ full_video_url: "", reel_url: "", thumbnail_url: "", youtube_title: "", youtube_description: "", instagram_caption: "", editor_notes: "" });
    await loadRevisions();
  }

  async function requestChanges() {
    if (!workflow?.id || !feedback.trim() || !user?.id) return;
    const nextRevision = latestRevisionNumber + 1;
    setActionMessage("Saving feedback and requesting changes...");
    const { error } = await supabase.from("event_video_revisions").insert({
      workflow_id: workflow.id,
      revision_number: nextRevision,
      feedback,
      submitted_by: user.id,
      submitted_by_email: user.email || null,
    });
    if (error) {
      setActionMessage(`Could not save feedback: ${error.message}`);
      return;
    }
    await updateWorkflow({ status: "changes_requested", editor_notes: feedback }, "Feedback saved. Changes requested from editor.");
    setFeedback("");
    await loadRevisions();
  }

  async function crewApprove() {
    await updateWorkflow({ status: "awaiting_admin_approval", crew_reviewer_email: workflow?.crew_reviewer_email || user?.email || null, crew_approved_at: new Date().toISOString() }, "Crew approved. Workflow is awaiting admin final approval.");
  }

  async function adminApprove() {
    await updateWorkflow({ status: "approved_for_publishing", admin_approver_email: user?.email || null, admin_approved_at: new Date().toISOString() }, "Admin approved. Editor can publish.");
  }

  async function markPublished(event: React.FormEvent) {
    event.preventDefault();
    await updateWorkflow({
      status: "published_complete",
      youtube_url: publishForm.youtube_url || null,
      instagram_url: publishForm.instagram_url || null,
      facebook_url: publishForm.facebook_url || null,
      publish_notes: publishForm.publish_notes || null,
      published_at: new Date().toISOString(),
    }, "Publishing cycle marked complete.");
  }

  useEffect(() => { init(); }, [workflowId]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <section className="max-w-6xl mx-auto px-6 py-10">
        <a href="/studio/video-production" className="text-pink-300 font-bold">← Back to Video Production</a>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mt-5 mb-8">
          <div>
            <p className="text-pink-300 font-black uppercase tracking-wide">Video Workflow</p>
            <h1 className="text-4xl md:text-5xl font-black mt-2">{event.title || "Video Production"}</h1>
            <p className="text-slate-300 mt-2">{shortDate(event.date)}{event.location ? ` · ${event.location}` : ""}</p>
            {workflow?.status && <p className="inline-block bg-white/10 px-3 py-1 rounded-full mt-3 font-bold capitalize">{statusLabel(workflow.status)}</p>}
          </div>
          <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
        </div>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Access Required</h2><p className="text-gray-600 mt-3">{message}</p></div>}
        {!loading && canAccess && !workflow && <div className="bg-white text-slate-950 rounded-2xl p-8">{message || "Workflow not found."}</div>}

        {!loading && canAccess && workflow && <div className="space-y-8">
          {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}

          <section className="grid lg:grid-cols-3 gap-5">
            <div className="bg-white text-slate-950 rounded-3xl p-6">
              <h2 className="text-xl font-black">Media Sources</h2>
              {workflow.raw_media_url ? <p className="mt-3"><a href={workflow.raw_media_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">SDTV upload folder</a></p> : <p className="text-gray-500 mt-3">No SDTV upload folder yet.</p>}
              {workflow.external_media_url ? <p className="mt-2"><a href={workflow.external_media_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">External shared folder</a></p> : <p className="text-gray-500 mt-2">No external media URL.</p>}
            </div>
            <div className="bg-white text-slate-950 rounded-3xl p-6 lg:col-span-2">
              <h2 className="text-xl font-black">Crew Handoff Notes</h2>
              <p className="text-gray-700 mt-3 whitespace-pre-line">{workflow.crew_notes || "No crew notes yet."}</p>
              <p className="text-xs text-gray-400 mt-4">Editor: {workflow.assigned_editor_email || "Not assigned"} · Crew Reviewer: {workflow.crew_reviewer_email || "Not assigned"}</p>
            </div>
          </section>

          {editor && <section className="bg-white text-slate-950 rounded-3xl p-6">
            <h2 className="text-2xl font-black">Submit Draft / Revision</h2>
            <form onSubmit={submitDraft} className="grid lg:grid-cols-2 gap-4 mt-5">
              <input value={draftForm.full_video_url} onChange={(e) => setDraftForm({ ...draftForm, full_video_url: e.target.value })} placeholder="Full video review URL" className="border rounded-xl p-3" />
              <input value={draftForm.reel_url} onChange={(e) => setDraftForm({ ...draftForm, reel_url: e.target.value })} placeholder="Instagram reel/highlight review URL" className="border rounded-xl p-3" />
              <input value={draftForm.thumbnail_url} onChange={(e) => setDraftForm({ ...draftForm, thumbnail_url: e.target.value })} placeholder="Thumbnail URL" className="border rounded-xl p-3" />
              <input value={draftForm.youtube_title} onChange={(e) => setDraftForm({ ...draftForm, youtube_title: e.target.value })} placeholder="YouTube title draft" className="border rounded-xl p-3" />
              <textarea value={draftForm.youtube_description} onChange={(e) => setDraftForm({ ...draftForm, youtube_description: e.target.value })} placeholder="YouTube description draft" className="border rounded-xl p-3 min-h-28" />
              <textarea value={draftForm.instagram_caption} onChange={(e) => setDraftForm({ ...draftForm, instagram_caption: e.target.value })} placeholder="Instagram caption / hashtags" className="border rounded-xl p-3 min-h-28" />
              <textarea value={draftForm.editor_notes} onChange={(e) => setDraftForm({ ...draftForm, editor_notes: e.target.value })} placeholder="Editor notes for reviewer" className="border rounded-xl p-3 lg:col-span-2 min-h-24" />
              <button className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black lg:col-span-2">Submit Revision For Crew Review</button>
            </form>
          </section>}

          {(crew || admin) && <section className="bg-white text-slate-950 rounded-3xl p-6">
            <h2 className="text-2xl font-black">Review Feedback</h2>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Add feedback if changes are needed..." className="border rounded-xl p-3 w-full min-h-28 mt-4" />
            <div className="flex flex-wrap gap-3 mt-4">
              <button onClick={requestChanges} className="bg-yellow-500 text-white px-5 py-3 rounded-xl font-black">Request Changes</button>
              {crew && <button onClick={crewApprove} className="bg-green-600 text-white px-5 py-3 rounded-xl font-black">Crew Approve For Admin</button>}
              {admin && <button onClick={adminApprove} className="bg-green-700 text-white px-5 py-3 rounded-xl font-black">Admin Final Approve</button>}
            </div>
          </section>}

          {editor && workflow.status === "approved_for_publishing" && <section className="bg-white text-slate-950 rounded-3xl p-6">
            <h2 className="text-2xl font-black">Publishing Confirmation</h2>
            <form onSubmit={markPublished} className="grid lg:grid-cols-2 gap-4 mt-5">
              <input value={publishForm.youtube_url} onChange={(e) => setPublishForm({ ...publishForm, youtube_url: e.target.value })} placeholder="Final YouTube URL" className="border rounded-xl p-3" />
              <input value={publishForm.instagram_url} onChange={(e) => setPublishForm({ ...publishForm, instagram_url: e.target.value })} placeholder="Final Instagram URL" className="border rounded-xl p-3" />
              <input value={publishForm.facebook_url} onChange={(e) => setPublishForm({ ...publishForm, facebook_url: e.target.value })} placeholder="Final Facebook URL optional" className="border rounded-xl p-3 lg:col-span-2" />
              <textarea value={publishForm.publish_notes} onChange={(e) => setPublishForm({ ...publishForm, publish_notes: e.target.value })} placeholder="Publishing notes / caption used" className="border rounded-xl p-3 lg:col-span-2 min-h-24" />
              <button className="bg-purple-700 text-white px-5 py-3 rounded-xl font-black lg:col-span-2">Mark Publishing Complete</button>
            </form>
          </section>}

          <section className="bg-white text-slate-950 rounded-3xl p-6">
            <h2 className="text-2xl font-black">Revision History</h2>
            <div className="grid gap-4 mt-5">
              {revisions.length === 0 && <div className="border rounded-2xl p-5 text-gray-500">No revisions or feedback yet.</div>}
              {revisions.map((revision) => <article key={revision.id} className="border rounded-2xl p-5"><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3"><div><h3 className="font-black text-lg">Revision {revision.revision_number}</h3><p className="text-sm text-gray-500">{revision.submitted_by_email || "Unknown"} · {dateText(revision.created_at)}</p></div></div><div className="grid md:grid-cols-2 gap-3 mt-4 text-sm">{revision.full_video_url && <a href={revision.full_video_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Full video draft</a>}{revision.reel_url && <a href={revision.reel_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Reel/highlight draft</a>}{revision.thumbnail_url && <a href={revision.thumbnail_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Thumbnail</a>}</div>{revision.youtube_title && <p className="mt-3"><b>YouTube Title:</b> {revision.youtube_title}</p>}{revision.youtube_description && <p className="mt-3 whitespace-pre-line"><b>YouTube Description:</b><br />{revision.youtube_description}</p>}{revision.instagram_caption && <p className="mt-3 whitespace-pre-line"><b>Instagram Caption:</b><br />{revision.instagram_caption}</p>}{revision.feedback && <p className="mt-3 whitespace-pre-line bg-yellow-50 text-yellow-900 rounded-xl p-3"><b>Notes / Feedback:</b><br />{revision.feedback}</p>}</article>)}
            </div>
          </section>
        </div>}
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../../components/MyHubHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

function label(value?: string | null) {
  return String(value || "").replaceAll("_", " ") || "—";
}

export default function CrewReviewPage({ params }: { params: { eventId: string } }) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading review...");
  const [workflow, setWorkflow] = useState<any>(null);
  const [revision, setRevision] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [user, setUser] = useState<any>(null);

  async function load() {
    setLoading(true);
    const auth = await supabase.auth.getUser();
    const currentUser = auth.data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to review the draft."); setLoading(false); return; }
    const wf = await supabase.from("event_video_workflows").select("*, events(title,date,location)").eq("event_id", params.eventId).maybeSingle();
    if (wf.error || !wf.data) { setMessage("No video workflow found for this event yet."); setLoading(false); return; }
    setWorkflow(wf.data);
    const rev = await supabase.from("event_video_revisions").select("*").eq("workflow_id", wf.data.id).order("revision_number", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!rev.error) setRevision(rev.data || null);
    setMessage("");
    setLoading(false);
  }

  async function approve() {
    if (!workflow?.id) return;
    const note = approveNote.trim() || "Looks good.";
    const crewNotes = [workflow.crew_notes, `Crew approved draft (${user?.email || "crew"}):\n${note}`].filter(Boolean).join("\n\n---\n\n");
    const result = await supabase.from("event_video_workflows").update({ status: "awaiting_admin_approval", crew_notes: crewNotes, crew_approved_at: new Date().toISOString(), updated_by: user?.id || null, updated_at: new Date().toISOString() }).eq("id", workflow.id);
    setMessage(result.error ? result.error.message : "Draft approved and sent for admin review.");
    await load();
  }

  async function requestChanges() {
    if (!workflow?.id) return;
    if (!feedback.trim()) { setMessage("Please describe what needs to change."); return; }
    const crewNotes = [workflow.crew_notes, `Crew requested changes (${user?.email || "crew"}):\n${feedback.trim()}`].filter(Boolean).join("\n\n---\n\n");
    const result = await supabase.from("event_video_workflows").update({ status: "changes_requested", crew_notes: crewNotes, updated_by: user?.id || null, updated_at: new Date().toISOString() }).eq("id", workflow.id);
    setMessage(result.error ? result.error.message : "Feedback sent to the editor.");
    await load();
  }

  useEffect(() => { load(); }, [params.eventId]);

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader /><section className="mx-auto max-w-4xl px-6 py-10">{loading ? <div className="rounded-2xl bg-white/10 p-6">{message}</div> : <div className="rounded-3xl bg-white p-6 text-slate-950"><p className="text-xs font-black uppercase tracking-wide text-pink-600">Crew Video Review</p><h1 className="mt-2 text-4xl font-black">{workflow?.events?.title || "Video Draft Review"}</h1><p className="mt-2 text-slate-600">Current status: <b>{label(workflow?.status)}</b></p>{message && <div className="mt-4 rounded-xl bg-yellow-100 p-3 font-bold text-yellow-900">{message}</div>}<div className="mt-6 flex flex-wrap gap-2">{revision?.full_video_url && <a href={revision.full_video_url} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Watch Full Draft</a>}{revision?.reel_url && <a href={revision.reel_url} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-100 px-5 py-3 font-black text-slate-700">Watch Reel</a>}{revision?.thumbnail_url && <a href={revision.thumbnail_url} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-100 px-5 py-3 font-black text-slate-700">View Thumbnail</a>}</div><div className="mt-6 grid gap-4"><textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={6} placeholder="If changes are needed, describe them clearly here..." className="rounded-xl border p-4" /><textarea value={approveNote} onChange={(e) => setApproveNote(e.target.value)} rows={3} placeholder="Optional approval note..." className="rounded-xl border p-4" /><div className="flex flex-wrap gap-2"><button onClick={approve} className="rounded-xl bg-green-600 px-5 py-3 font-black text-white">Approve Draft</button><button onClick={requestChanges} className="rounded-xl bg-yellow-500 px-5 py-3 font-black text-slate-950">Request Changes</button><a href="/my-assignments" className="rounded-xl bg-slate-100 px-5 py-3 font-black text-slate-700">Back to Assignments</a></div></div><section className="mt-6 rounded-2xl bg-slate-50 p-4"><h2 className="font-black">Workflow Notes</h2><p className="mt-2 whitespace-pre-line text-sm text-slate-600">{workflow?.crew_notes || "No notes yet."}</p></section></div>}</section><SiteFooter /></main>;
}

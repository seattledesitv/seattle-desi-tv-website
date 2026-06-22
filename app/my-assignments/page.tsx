"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isTeamRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
const REVIEW_READY_STATUSES = ["awaiting_crew_review", "changes_requested"];
const VIDEO_STATUSES = ["ready_for_editing", "in_editing", "awaiting_crew_review", "changes_requested", "awaiting_admin_approval", "approved_for_publishing", "published_complete"];

function firstImage(event: any) { return Array.isArray(event?.image_urls) && event.image_urls.length > 0 ? event.image_urls[0] : event?.image || ""; }
function dateText(value?: string) { if (!value) return ""; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
function statusText(value?: string | null) { return String(value || "").replaceAll("_", " ") || "—"; }
function workflowLabel(a: any, videoWorkflow?: any) {
  if (videoWorkflow?.status === "awaiting_crew_review") return "Draft Ready for Crew Review";
  if (videoWorkflow?.status === "changes_requested") return "Changes Requested";
  if (videoWorkflow?.status === "awaiting_admin_approval") return "Crew Approved - Awaiting Admin";
  if (videoWorkflow?.status === "approved_for_publishing") return "Approved for Publishing";
  if (videoWorkflow?.status === "published_complete") return "Published Complete";
  if (videoWorkflow?.status === "in_editing") return "Editor Working";
  if (videoWorkflow?.status === "ready_for_editing") return "Submitted to Editor";
  if (a.coverage_completed) return "Submitted to Editor";
  if (a.crew_confirmed) return "Confirmed";
  return "Assigned - Awaiting Confirmation";
}
function workflowClass(a: any, videoWorkflow?: any) {
  if (["awaiting_crew_review", "awaiting_admin_approval"].includes(videoWorkflow?.status)) return "bg-purple-100 text-purple-800";
  if (["approved_for_publishing", "published_complete", "ready_for_editing"].includes(videoWorkflow?.status) || a.coverage_completed) return "bg-green-100 text-green-800";
  if (videoWorkflow?.status === "changes_requested") return "bg-yellow-100 text-yellow-800";
  if (videoWorkflow?.status === "in_editing" || a.crew_confirmed) return "bg-blue-100 text-blue-800";
  return "bg-yellow-100 text-yellow-800";
}
function hasVideoProgress(videoWorkflow?: any) { return Boolean(videoWorkflow?.id && VIDEO_STATUSES.includes(videoWorkflow.status)); }
function isReviewReady(videoWorkflow?: any) { return Boolean(videoWorkflow?.id && REVIEW_READY_STATUSES.includes(videoWorkflow.status)); }

export default function MyAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking assignments...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [eventsById, setEventsById] = useState<Record<string, any>>({});
  const [videoWorkflowsByEventId, setVideoWorkflowsByEventId] = useState<Record<string, any>>({});
  const [forms, setForms] = useState<Record<string, any>>({});
  const canViewAssignments = Boolean(user && isTeamRole(role));

  async function loadAssignments(currentUser: any) {
    if (!currentUser?.id) { setAssignments([]); setEventsById({}); setVideoWorkflowsByEventId({}); return; }
    const { data, error } = await supabase.from("event_crew_assignments").select("id,event_id,user_id,user_email,assignment_type,status,created_at,crew_confirmed,coverage_completed,coverage_notes,completed_at,event_title").eq("user_id", currentUser.id).eq("status", "approved").order("created_at", { ascending: false });
    if (error) { setMessage(`Could not load assignments: ${error.message}`); setAssignments([]); return; }
    const rows = data || [];
    setAssignments(rows);
    const ids = Array.from(new Set(rows.map((row: any) => row.event_id).filter(Boolean)));
    if (ids.length) {
      const eventsResult = await supabase.from("events").select("id,title,date,location,description,image,image_urls,ticket_url,poc_email,poc_phone,status").in("id", ids).order("date", { ascending: true });
      if (!eventsResult.error) { const map: Record<string, any> = {}; (eventsResult.data || []).forEach((event: any) => { map[event.id] = event; }); setEventsById(map); }
      const workflowResult = await supabase.from("event_video_workflows").select("id,event_id,status,assigned_editor_email,crew_reviewer_email,crew_notes,editor_notes,updated_at").in("event_id", ids).order("updated_at", { ascending: false });
      if (!workflowResult.error) { const workflowMap: Record<string, any> = {}; (workflowResult.data || []).forEach((workflow: any) => { if (!workflowMap[workflow.event_id]) workflowMap[workflow.event_id] = workflow; }); setVideoWorkflowsByEventId(workflowMap); }
      else setVideoWorkflowsByEventId({});
    } else { setEventsById({}); setVideoWorkflowsByEventId({}); }
    const nextForms: Record<string, any> = {}; rows.forEach((row: any) => { nextForms[row.id] = { has_content: true, media_url: "", notes: row.coverage_notes || "" }; }); setForms(nextForms);
    setMessage(rows.length ? `You have ${rows.length} assignment(s).` : "You do not have any approved assignments yet.");
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to see your SDTV assignments."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isTeamRole(nextRole)) { setMessage(`This page is for approved SDTV team members. Current role: ${nextRole}`); setLoading(false); return; }
    await loadAssignments(currentUser);
    setLoading(false);
  }

  async function updateAssignment(id: string, payload: any, success: string) {
    setActionMessage("Updating assignment...");
    const { data, error } = await supabase.from("event_crew_assignments").update(payload).eq("id", id).select("id,event_id,user_id,user_email,assignment_type,status,created_at,crew_confirmed,coverage_completed,coverage_notes,completed_at,event_title").maybeSingle();
    if (error) { setActionMessage(`Update failed: ${error.message}`); return false; }
    if (!data) { setActionMessage("Update did not save. Supabase RLS is likely blocking crew self-updates. Please run the crew assignment SQL policy fix."); if (user?.id) await loadAssignments(user); return false; }
    setAssignments((current) => current.map((item) => item.id === id ? { ...item, ...data } : item));
    setActionMessage(success);
    if (user?.id) await loadAssignments(user);
    return true;
  }

  async function confirmAssignment(id: string) { await updateAssignment(id, { crew_confirmed: true }, "Assignment confirmed."); }
  async function updateForm(id: string, patch: any) { setForms((current) => ({ ...current, [id]: { ...(current[id] || {}), ...patch } })); }

  async function createOrUpdateVideoWorkflow(assignment: any, coverageNotes: string, mediaUrl: string) {
    if (!assignment?.event_id || !user?.id) return true;
    const event = eventsById[assignment.event_id] || {};
    const existing = await supabase.from("event_video_workflows").select("id,crew_notes,raw_media_url,external_media_url,status").eq("event_id", assignment.event_id).maybeSingle();
    if (existing.error) { setActionMessage(`Could not check editor workflow: ${existing.error.message}`); return false; }
    const nextNotes = [existing.data?.crew_notes, `Crew submission from ${user.email || assignment.user_email || "crew"}${event.title ? ` for ${event.title}` : ""}:\n${coverageNotes}`].filter(Boolean).join("\n\n---\n\n");
    const payload = { event_id: assignment.event_id, status: existing.data?.status && existing.data.status !== "published_complete" ? existing.data.status : "ready_for_editing", raw_media_url: existing.data?.raw_media_url || mediaUrl || null, external_media_url: existing.data?.external_media_url || null, crew_reviewer_email: user.email || assignment.user_email || null, crew_notes: nextNotes, created_by: existing.data?.id ? undefined : user.id, updated_by: user.id, updated_at: new Date().toISOString() } as any;
    if (existing.data?.id) { delete payload.event_id; delete payload.created_by; const { error } = await supabase.from("event_video_workflows").update(payload).eq("id", existing.data.id); if (error) { setActionMessage(`Could not update editor workflow: ${error.message}`); return false; } return true; }
    const { error } = await supabase.from("event_video_workflows").insert(payload);
    if (error) { setActionMessage(`Could not create editor workflow: ${error.message}`); return false; }
    return true;
  }

  async function submitAssignment(assignment: any) {
    if (assignment.coverage_completed) { setActionMessage("This assignment was already submitted to the editor."); return; }
    const form = forms[assignment.id] || {};
    if (form.has_content !== false && !String(form.media_url || "").trim()) { setActionMessage("Add a media link, or choose no media content."); return; }
    const coverageNotes = `${form.has_content === false ? "No media content from this crew member." : `Media link: ${form.media_url}`}${form.notes ? `\n\nNotes: ${form.notes}` : ""}`;
    if (form.has_content !== false) { const workflowOk = await createOrUpdateVideoWorkflow(assignment, coverageNotes, String(form.media_url || "").trim()); if (!workflowOk) return; }
    await updateAssignment(assignment.id, { coverage_completed: true, crew_confirmed: true, coverage_notes: coverageNotes, completed_at: new Date().toISOString() }, form.has_content === false ? "Marked complete with no media content." : "Submitted to editor and added to the editing queue.");
  }

  async function signOut() { await supabase.auth.signOut(); setUser(null); setRole("general_public"); setAssignments([]); setEventsById({}); setVideoWorkflowsByEventId({}); setMessage("Logged out."); }
  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader /><div className="max-w-6xl mx-auto px-6 py-10"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p><h1 className="text-4xl md:text-5xl font-black mt-3">My Assignments</h1><p className="text-slate-300 mt-2">Confirm your assignment and submit content details when event coverage is done.</p>{user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role}</p>}</div><div className="flex gap-3"><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>{user && <button onClick={signOut} className="border border-red-400 text-red-300 px-5 py-3 rounded-xl font-bold">Logout</button>}</div></div>{loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canViewAssignments && <div className="bg-white text-slate-950 rounded-2xl p-8"><p>{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}{!loading && canViewAssignments && <div className="space-y-5">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<div className="bg-white/10 rounded-2xl p-5"><p className="text-slate-300">Approved Assignments</p><p className="text-4xl font-black">{assignments.length}</p></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{assignments.map((assignment) => { const event = eventsById[assignment.event_id] || {}; const videoWorkflow = videoWorkflowsByEventId[assignment.event_id]; const image = firstImage(event); const form = forms[assignment.id] || {}; const videoProgress = hasVideoProgress(videoWorkflow); const reviewReady = isReviewReady(videoWorkflow); const showSubmitForm = !assignment.coverage_completed && !videoProgress; return <article key={assignment.id} className="bg-white text-slate-950 rounded-2xl overflow-hidden shadow-xl">{image ? <img src={image} alt={event.title || assignment.event_title} className="w-full h-52 object-cover" /> : <div className="w-full h-52 bg-pink-50 grid place-items-center text-pink-600 font-black">Seattle Desi TV</div>}<div className="p-5"><p className={`inline-block text-xs font-black uppercase tracking-wide rounded-full px-3 py-1 ${workflowClass(assignment, videoWorkflow)}`}>{workflowLabel(assignment, videoWorkflow)}</p><h2 className="text-xl font-black mt-3">{event.title || assignment.event_title || "Assigned Event"}</h2><p className="text-gray-600 mt-1">{dateText(event.date)} · {event.location || "Location TBD"}</p>{event.description && <p className="text-sm text-gray-600 mt-3 line-clamp-3">{event.description}</p>}<div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">{event.poc_email && <p><b>POC Email:</b> {event.poc_email}</p>}{event.poc_phone && <p><b>POC Phone:</b> {event.poc_phone}</p>}{assignment.completed_at && <p><b>Submitted:</b> {new Date(assignment.completed_at).toLocaleString()}</p>}{videoWorkflow?.id && <p><b>Video Status:</b> {statusText(videoWorkflow.status)}</p>}{videoWorkflow?.assigned_editor_email && <p><b>Editor:</b> {videoWorkflow.assigned_editor_email}</p>}{videoWorkflow?.updated_at && <p><b>Video Updated:</b> {new Date(videoWorkflow.updated_at).toLocaleString()}</p>}<p className="text-xs text-gray-400 mt-2">Event ID: {assignment.event_id || "missing"}{videoWorkflow?.id ? ` · Workflow ID: ${videoWorkflow.id}` : ""}</p></div>{showSubmitForm && <div className="mt-4 border rounded-xl p-3"><p className="font-black text-sm">Submit to editor</p><label className="flex gap-2 items-center text-sm mt-3"><input type="radio" checked={form.has_content !== false} onChange={() => updateForm(assignment.id, { has_content: true })} /> I have content to share</label><label className="flex gap-2 items-center text-sm mt-2"><input type="radio" checked={form.has_content === false} onChange={() => updateForm(assignment.id, { has_content: false })} /> No media content from me</label>{form.has_content !== false && <input className="w-full border rounded-lg p-3 mt-3 text-sm" placeholder="Media folder/link" value={form.media_url || ""} onChange={(e) => updateForm(assignment.id, { media_url: e.target.value })} />}<textarea className="w-full border rounded-lg p-3 mt-3 text-sm" placeholder="Notes for editor" value={form.notes || ""} onChange={(e) => updateForm(assignment.id, { notes: e.target.value })} /></div>}{!showSubmitForm && <div className="mt-4 border rounded-xl p-3 bg-green-50 text-green-900 text-sm"><b>{reviewReady ? "Editor draft is ready for crew review." : `Video workflow is in progress: ${statusText(videoWorkflow?.status)}`}</b>{assignment.coverage_notes && <p className="whitespace-pre-line mt-2">{assignment.coverage_notes}</p>}{videoWorkflow?.editor_notes && <p className="whitespace-pre-line mt-2"><b>Editor notes:</b><br />{videoWorkflow.editor_notes}</p>}</div>}<div className="flex flex-wrap gap-3 mt-4">{event.ticket_url && <a href={event.ticket_url} target="_blank" rel="noreferrer" className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Tickets / Info</a>}{event.location && <a href={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}`} target="_blank" rel="noreferrer" className="border px-4 py-2 rounded-lg font-bold text-sm">Map</a>}<a href={`/events/${assignment.event_id}`} className="border px-4 py-2 rounded-lg font-bold text-sm">Event Page</a>{reviewReady && <a href={`/studio/video-production/${videoWorkflow.id}`} className="bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm">Review Video</a>}{!assignment.crew_confirmed && !assignment.coverage_completed && !videoProgress && <button onClick={() => confirmAssignment(assignment.id)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Confirm</button>}{showSubmitForm && <button onClick={() => submitAssignment(assignment)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Submit to Editor</button>}</div></div></article>; })}</div>{assignments.length === 0 && <div className="bg-white text-slate-950 rounded-2xl p-8">No approved assignments yet.</div>}</div>}</div><SiteFooter /></main>;
}

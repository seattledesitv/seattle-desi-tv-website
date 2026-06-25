"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isVideoEditorRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

function label(value?: string | null) {
  return String(value || "").replaceAll("_", " ") || "—";
}

function sameEmail(a?: string | null, b?: string | null) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function dateText(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function MyVideoAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading video assignments...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [contentRows, setContentRows] = useState<any[]>([]);

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

    const result = await supabase.from("event_video_workflows").select("*, events(id,title,date,location)").order("updated_at", { ascending: false });
    if (result.error) { setMessage(result.error.message); setWorkflows([]); } else {
      const rows = result.data || [];
      const visible = isAdminRole(nextRole) ? rows : rows.filter((row: any) => sameEmail(row.assigned_editor_email, currentUser.email));
      setWorkflows(visible);
    }

    const contentResult = await supabase.from("public_content_requests").select("*").order("updated_at", { ascending: false }).limit(200);
    if (contentResult.error) {
      setActionMessage(`Could not load public content assignments: ${contentResult.error.message}. Run supabase/public-content-requests.sql.`);
      setContentRows([]);
    } else {
      const rows = contentResult.data || [];
      const visible = isAdminRole(nextRole) ? rows : rows.filter((row: any) => sameEmail(row.assigned_editor_email, currentUser.email));
      setContentRows(visible);
    }

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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p>
            <h1 className="text-4xl md:text-5xl font-black mt-2">My Video Assignments</h1>
            <p className="text-slate-300 mt-2">Editor workspace for event videos and public content submissions.</p>
            {user?.email && <p className="text-slate-400 text-sm mt-1">Logged in as {user.email} · Role: {role}</p>}
          </div>
          <button onClick={load} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
        </div>

        {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold mb-5">{actionMessage}</div>}
        {loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && workflows.length === 0 && contentRows.length === 0 && <div className="bg-white text-slate-950 rounded-3xl p-8">{message}</div>}

        {!loading && contentRows.length > 0 && <section className="mb-10">
          <h2 className="text-3xl font-black mb-4">Public Content Assignments</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {contentRows.map((row) => <article key={row.id} className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl border">
              <p className="text-xs font-black uppercase tracking-wide text-pink-600">{label(row.status)}</p>
              <h3 className="text-2xl font-black mt-1">{row.title}</h3>
              <p className="text-gray-600 mt-1">Submitted by {row.submitter_name} · {row.submitter_email}</p>
              {row.assigned_editor_email && <p className="text-sm text-gray-700 mt-3"><b>Editor:</b> {row.assigned_editor_email}</p>}
              {row.content_text && <p className="text-sm text-gray-700 whitespace-pre-line mt-3 rounded-xl bg-slate-50 p-3">{row.content_text}</p>}
              <div className="flex flex-wrap gap-2 mt-4 text-sm">
                {row.image_url && <a href={row.image_url} target="_blank" rel="noreferrer" className="bg-slate-100 text-pink-600 px-3 py-2 rounded-lg font-bold">Open image</a>}
                {row.video_url && <a href={row.video_url} target="_blank" rel="noreferrer" className="bg-slate-100 text-pink-600 px-3 py-2 rounded-lg font-bold">Open video</a>}
                {row.source_url && <a href={row.source_url} target="_blank" rel="noreferrer" className="bg-slate-100 text-pink-600 px-3 py-2 rounded-lg font-bold">Open source</a>}
              </div>
              <div className="grid gap-3 mt-5">
                <input defaultValue={row.final_youtube_url || ""} onBlur={(event) => updateContent(row, { final_youtube_url: event.target.value }, "YouTube URL saved.")} placeholder="Final YouTube URL" className="border rounded-xl p-3" />
                <input defaultValue={row.final_instagram_url || ""} onBlur={(event) => updateContent(row, { final_instagram_url: event.target.value }, "Instagram URL saved.")} placeholder="Final Instagram URL" className="border rounded-xl p-3" />
                <input defaultValue={row.final_thumbnail_url || ""} onBlur={(event) => updateContent(row, { final_thumbnail_url: event.target.value }, "Thumbnail URL saved.")} placeholder="Final thumbnail URL" className="border rounded-xl p-3" />
                <textarea defaultValue={row.editor_notes || ""} onBlur={(event) => updateContent(row, { editor_notes: event.target.value }, "Editor notes saved.")} placeholder="Editor notes" className="border rounded-xl p-3 min-h-24" />
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {row.status === "assigned_to_editor" && <button onClick={() => updateContent(row, { status: "in_editing" }, "Content moved to editing.")} className="bg-slate-950 text-white px-4 py-2 rounded-xl font-black">Start Editing</button>}
                {["in_editing", "changes_requested"].includes(row.status) && <button onClick={() => updateContent(row, { status: "review_requested", review_requested_at: new Date().toISOString() }, "Review requested.")} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-black">Request Review</button>}
                {isAdminRole(role) && row.status === "review_requested" && <button onClick={() => updateContent(row, { status: "approved_for_publishing", approved_at: new Date().toISOString() }, "Approved for publishing.")} className="bg-green-700 text-white px-4 py-2 rounded-xl font-black">Approve Publishing</button>}
                {isAdminRole(role) && row.status === "review_requested" && <button onClick={() => updateContent(row, { status: "changes_requested" }, "Changes requested.")} className="bg-yellow-500 text-white px-4 py-2 rounded-xl font-black">Request Changes</button>}
                {row.status === "approved_for_publishing" && <button onClick={() => updateContent(row, { status: "published", published_at: new Date().toISOString() }, "Content marked published.")} className="bg-purple-700 text-white px-4 py-2 rounded-xl font-black">Mark Published</button>}
              </div>
              <p className="text-xs text-gray-400 mt-4">Updated {dateText(row.updated_at || row.created_at)}</p>
            </article>)}
          </div>
        </section>}

        {!loading && workflows.length > 0 && <section>
          <h2 className="text-3xl font-black mb-4">Event Video Assignments</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {workflows.map((workflow) => {
              const event = workflow.events || {};
              return <article key={workflow.id} className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl border">
                <p className="text-xs font-black uppercase tracking-wide text-pink-600">{label(workflow.status)}</p>
                <h2 className="text-2xl font-black mt-1">{event.title || "Untitled Event"}</h2>
                <p className="text-gray-600 mt-1">{event.date || "Date TBD"}{event.location ? ` · ${event.location}` : ""}</p>
                {workflow.assigned_editor_email && <p className="text-sm text-gray-700 mt-3"><b>Editor:</b> {workflow.assigned_editor_email}</p>}
                {workflow.crew_notes && <p className="text-sm text-gray-700 whitespace-pre-line mt-3"><b>Notes:</b> {workflow.crew_notes}</p>}
                <a href={`/studio/video-production/${workflow.id}`} className="inline-block bg-pink-600 text-white px-4 py-2 rounded-xl font-black mt-5">Open Workflow</a>
              </article>;
            })}
          </div>
        </section>}
      </section>
      <SiteFooter />
    </main>
  );
}

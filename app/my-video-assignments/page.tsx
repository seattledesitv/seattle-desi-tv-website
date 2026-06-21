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

export default function MyVideoAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading video assignments...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [workflows, setWorkflows] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to view video assignments."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!(isVideoEditorRole(nextRole) || isAdminRole(nextRole))) { setMessage(`This page is for assigned video editors. Current role: ${nextRole}`); setLoading(false); return; }
    const result = await supabase.from("event_video_workflows").select("*, events(id,title,date,location)").order("updated_at", { ascending: false });
    if (result.error) { setMessage(result.error.message); setWorkflows([]); setLoading(false); return; }
    const rows = result.data || [];
    const visible = isAdminRole(nextRole) ? rows : rows.filter((row: any) => sameEmail(row.assigned_editor_email, currentUser.email));
    setWorkflows(visible);
    setMessage(visible.length ? `You have ${visible.length} video assignment(s).` : "No video assignments assigned to you yet.");
    setLoading(false);
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
            <p className="text-slate-300 mt-2">Editor workspace for assigned SDTV video work.</p>
            {user?.email && <p className="text-slate-400 text-sm mt-1">Logged in as {user.email} · Role: {role}</p>}
          </div>
          <button onClick={load} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
        </div>
        {loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && workflows.length === 0 && <div className="bg-white text-slate-950 rounded-3xl p-8">{message}</div>}
        {!loading && workflows.length > 0 && <div className="grid lg:grid-cols-2 gap-6">
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
        </div>}
      </section>
      <SiteFooter />
    </main>
  );
}

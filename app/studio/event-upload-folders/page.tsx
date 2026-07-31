"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
function dateText(v?: string | null) { if (!v) return "Date TBD"; const d = new Date(`${String(v).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString(); }

export default function EventUploadFoldersPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<Record<string, any>>({});
  const [selectedEventId, setSelectedEventId] = useState("");
  const [search, setSearch] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const canAccess = Boolean(user && isAdminRole(role));
  const selectedEvent = events.find((event) => event.id === selectedEventId) || null;

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((event) => !q || `${event.title || ""} ${event.location || ""} ${event.poc_email || ""}`.toLowerCase().includes(q));
  }, [events, search]);

  async function load() {
    setLoading(true);
    const auth = await supabase.auth.getUser();
    const currentUser = auth.data?.user || null;
    setUser(currentUser);
    const nextRole = currentUser ? await resolveUserRole(supabase, currentUser) : "";
    setRole(nextRole);
    if (!currentUser || !isAdminRole(nextRole)) {
      setMessage("Studio admin access required.");
      setLoading(false);
      return;
    }
    const [eventsResult, workflowResult] = await Promise.all([
      supabase.from("events").select("id,title,date,location,status,poc_email,created_at").order("date", { ascending: false }).limit(500),
      supabase.from("event_video_workflows").select("id,event_id,status,upload_destination_url,crew_shared_folder_url,assigned_editor_email,updated_at"),
    ]);
    if (eventsResult.error) setMessage(eventsResult.error.message);
    const workflowMap: Record<string, any> = {};
    (workflowResult.data || []).forEach((workflow: any) => { workflowMap[workflow.event_id] = workflow; });
    setEvents(eventsResult.data || []);
    setWorkflows(workflowMap);
    setSelectedEventId((current) => current || eventsResult.data?.[0]?.id || "");
    setMessage(workflowResult.error ? "Run supabase/video-workflow-crew-review.sql first, then refresh." : "");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (!selectedEventId) return; setUrl(workflows[selectedEventId]?.upload_destination_url || ""); }, [selectedEventId, workflows]);

  async function save() {
    if (!selectedEventId) return;
    setSaving(true);
    setMessage("Saving upload folder...");
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || "";
    const response = await fetch("/api/studio/event-upload-folder", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" }, body: JSON.stringify({ event_id: selectedEventId, upload_destination_url: url }) });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) setMessage(result.error || "Could not save upload folder.");
    else { setMessage(result.message || "Saved."); await load(); }
  }

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-black uppercase tracking-wide text-pink-300">Studio Operations</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Coverage Upload Folders</h1><p className="mt-2 text-slate-300">Set the SDTV upload folder crew members will see in My Coverage Assignments.</p></div><button onClick={load} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button></div>{loading && <div className="rounded-2xl bg-white/10 p-6">{message}</div>}{!loading && !canAccess && <div className="rounded-3xl bg-white p-8 text-slate-950">{message}</div>}{!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[420px_1fr]"><aside className="rounded-3xl bg-white p-4 text-slate-950"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events..." className="w-full rounded-xl border p-3 font-bold" /><div className="mt-4 grid max-h-[72vh] gap-3 overflow-y-auto pr-1">{filteredEvents.map((event) => { const workflow = workflows[event.id]; return <button key={event.id} onClick={() => setSelectedEventId(event.id)} className={`rounded-2xl border p-4 text-left ${selectedEventId === event.id ? "border-pink-500 bg-pink-50 ring-2 ring-pink-100" : "bg-white hover:bg-slate-50"}`}><p className="font-black">{event.title}</p><p className="mt-1 text-sm text-slate-600">{dateText(event.date)} · {event.location || "No location"}</p><p className={`mt-2 rounded-full px-3 py-1 text-xs font-black ${workflow?.upload_destination_url ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-800"}`}>{workflow?.upload_destination_url ? "Upload folder configured" : "Upload folder missing"}</p></button>; })}</div></aside><section className="rounded-3xl bg-white p-6 text-slate-950">{!selectedEvent ? <p>No event selected.</p> : <><p className="text-xs font-black uppercase tracking-wide text-pink-600">Selected Event</p><h2 className="mt-1 text-3xl font-black">{selectedEvent.title}</h2><p className="mt-1 text-slate-600">{dateText(selectedEvent.date)} · {selectedEvent.location || "No location"}</p><div className="mt-6 rounded-3xl bg-slate-50 p-5"><label className="grid gap-2 font-black">SDTV Upload Folder URL<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." className="rounded-xl border bg-white p-3 font-normal" /></label><p className="mt-3 text-sm text-slate-600">Crew will see this as <b>Open SDTV Upload Folder</b>. If they cannot use this folder, they can select their own location and paste their shared folder URL.</p><div className="mt-4 flex flex-wrap gap-3"><button onClick={save} disabled={saving} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Upload Folder"}</button>{url && <a href={url} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-900 px-5 py-3 font-black text-white">Open Folder</a>}<button onClick={() => setUrl("")} className="rounded-xl bg-slate-100 px-5 py-3 font-black text-slate-950">Clear</button></div></div><div className="mt-6 rounded-3xl border p-5"><h3 className="text-xl font-black">Crew View Preview</h3><p className="mt-2 text-sm text-slate-600">In My Coverage Assignments, crew will see:</p><div className="mt-4 rounded-2xl bg-pink-50 p-4"><p className="font-black">Submit Coverage Media</p>{url ? <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-xl bg-slate-950 px-4 py-3 font-black text-white">Open SDTV Upload Folder</a> : <p className="mt-3 rounded-xl bg-yellow-100 p-3 font-bold text-yellow-900">Admin upload folder: Not configured yet</p>}<p className="mt-3 text-sm">If crew cannot upload there, they can use their own Google Drive, Dropbox, OneDrive, iCloud, or other shared folder.</p></div></div></>}</section>{message && <div className="lg:col-span-2 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}</div>}</section></main>;
}

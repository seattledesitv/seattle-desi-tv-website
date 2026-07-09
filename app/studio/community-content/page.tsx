"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const CONTENT_STATUSES = ["new", "reviewing", "assigned_to_editor", "approved_for_publishing", "published", "rejected", "closed"];

function dateText(value?: string | null) { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString(); }
function label(value?: string | null) { return String(value || "").replaceAll("_", " ") || "—"; }
function contentStatusClass(status?: string | null) { const value = String(status || "new").toLowerCase(); if (value === "new") return "bg-pink-50 text-pink-700"; if (value.includes("review") || value.includes("assigned")) return "bg-yellow-50 text-yellow-800"; if (value.includes("approved") || value.includes("published")) return "bg-green-50 text-green-700"; if (value.includes("reject")) return "bg-red-50 text-red-700"; return "bg-slate-100 text-slate-700"; }

export default function CommunityContentPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [editors, setEditors] = useState<any[]>([]);
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadContent() {
    const contentResult = await supabase.from("public_content_requests").select("*").order("created_at", { ascending: false }).limit(300);
    if (contentResult.error) { setActionMessage(`Could not load public content requests: ${contentResult.error.message}. Run supabase/public-content-requests.sql.`); setRows([]); }
    else setRows(contentResult.data || []);
    const adminResult = await supabase.from("admins").select("email,name,role").order("created_at", { ascending: false });
    if (!adminResult.error) setEditors((adminResult.data || []).filter((item: any) => { const value = String(item.role || "").toLowerCase(); return value.includes("admin") || value.includes("editor") || value.includes("production"); }));
  }

  async function init() {
    setLoading(true); setActionMessage("");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setRole(""); setMessage("Please login to access Community Content."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("Admin access required for Community Content."); setLoading(false); return; }
    await loadContent(); setMessage(""); setLoading(false);
  }

  async function updateContentRequest(row: any, payload: any, success = "Content request updated.") {
    setActionMessage("Updating content request...");
    const { error } = await supabase.from("public_content_requests").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) { setActionMessage(`Content request update failed: ${error.message}`); return; }
    setActionMessage(success); await loadContent();
  }

  async function assignContentRequest(row: any, email: string) {
    await updateContentRequest(row, { assigned_editor_email: email || null, assigned_at: email ? new Date().toISOString() : null, status: email ? "assigned_to_editor" : row.status }, email ? "Submission assigned to editor." : "Editor assignment cleared.");
  }

  const visibleRows = rows.filter((row) => {
    const status = String(row.status || "new");
    if (filter === "open" && ["published", "rejected", "closed"].includes(status)) return false;
    if (filter !== "open" && filter !== "all" && status !== filter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${row.title || ""} ${row.submitter_name || ""} ${row.submitter_email || ""} ${row.content_text || ""} ${row.assigned_editor_email || ""}`.toLowerCase().includes(q);
  });

  function ContentRequestCard({ row }: { row: any }) {
    return <article className="bg-white text-slate-950 rounded-2xl p-5 shadow-sm border space-y-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Community Submission</p><h3 className="text-xl font-black mt-1">{row.title}</h3><p className="text-sm text-gray-600 mt-1">{row.submitter_name} · {row.submitter_email}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${contentStatusClass(row.status)}`}>{label(row.status || "new")}</span></div>{row.content_text && <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-gray-700">{row.content_text}</p>}<div className="flex flex-wrap gap-2 text-sm">{row.image_url && <a href={row.image_url} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-pink-600">Open image</a>}{row.video_url && <a href={row.video_url} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-pink-600">Open video</a>}{row.source_url && <a href={row.source_url} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-pink-600">Open source</a>}</div>{row.assigned_editor_email && <p className="text-sm text-gray-600"><b>Assigned:</b> {row.assigned_editor_email}</p>}<div className="flex flex-wrap gap-2"><select value={row.assigned_editor_email || ""} onChange={(event) => assignContentRequest(row, event.target.value)} className="rounded-lg border px-3 py-2 text-sm font-bold"><option value="">Assign editor...</option>{editors.map((item) => <option key={item.email} value={item.email}>{item.name || item.email}</option>)}</select><select value={row.status || "new"} onChange={(event) => updateContentRequest(row, { status: event.target.value, published_at: event.target.value === "published" ? new Date().toISOString() : row.published_at }, "Content request status updated.")} className="rounded-lg border px-3 py-2 text-sm font-bold">{CONTENT_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div><p className="text-xs text-gray-400">Submitted {dateText(row.created_at)}</p></article>;
  }

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="max-w-7xl mx-auto px-6 py-10"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><p className="text-pink-300 font-black uppercase tracking-wide">Studio</p><h1 className="text-4xl md:text-5xl font-black mt-2">Community Content</h1><p className="text-slate-300 mt-2">Review public submissions, assign editors, approve, publish, reject or close community content.</p>{user?.email && <p className="text-slate-400 text-sm mt-1">Logged in as {user.email} · Role: {role}</p>}</div><div className="flex gap-3"><a href="/studio/video-production" className="rounded-xl bg-white/10 px-5 py-3 font-bold text-white">Video Production</a><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button></div></div>{loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Access Required</h2><p className="text-gray-600 mt-3">{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}{!loading && canAccess && <div className="space-y-6">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<section className="rounded-3xl bg-white/10 border border-white/10 p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-pink-300 font-black uppercase tracking-wide text-sm">Public submissions</p><h2 className="text-2xl font-black mt-1">Submission Queue</h2><p className="text-slate-300 text-sm mt-1">Community stories, photos, videos and article ideas from public submitters.</p></div><div className="flex flex-col gap-2 md:flex-row"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search submissions..." className="rounded-xl border border-white/20 bg-white p-3 text-sm text-slate-950 md:w-72" /><select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-white/20 bg-white p-3 text-sm text-slate-950"><option value="open">Open</option><option value="all">All</option>{CONTENT_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">{visibleRows.map((row) => <ContentRequestCard key={row.id} row={row} />)}{visibleRows.length === 0 && <div className="border border-dashed border-white/20 rounded-2xl p-5 text-slate-400 text-sm">No public content submissions in this view.</div>}</div></section></div>}</section></main>;
}

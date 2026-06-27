"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import CheckedExternalLink from "../components/CheckedExternalLink";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
function label(v?: string | null) { return String(v || "pending").replaceAll("_", " "); }
function fmt(v?: string | null) { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleString(); }
function statusClass(status?: string | null) { const s = String(status || "pending"); if (s === "approved") return "bg-green-100 text-green-800"; if (s === "rejected") return "bg-red-100 text-red-800"; if (s === "on_hold") return "bg-yellow-100 text-yellow-800"; return "bg-slate-100 text-slate-800"; }
function readOnly(name: string, value: any) { return <div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label(name)}</p><p className="mt-1 break-words text-sm font-bold text-slate-700">{value === null || value === undefined || value === "" ? "—" : String(value)}</p></div>; }
function kindConfig(kind: string) { return kind === "group" ? { table: "community_groups", title: "Community Group", urlField: "group_url", typeField: "platform", publicHref: "/community-groups" } : { table: "community_organizations", title: "Community Organization", urlField: "website", typeField: "organization_type", publicHref: "/community-organizations" }; }

export default function MyCommunitySubmissionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading community submissions...");
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [edit, setEdit] = useState<any>({});
  const [filter, setFilter] = useState("all");

  const items = useMemo(() => [...groups.map((x) => ({ ...x, kind: "group" })), ...orgs.map((x) => ({ ...x, kind: "organization" }))].sort((a,b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""))), [groups, orgs]);
  const filtered = items.filter((item) => filter === "all" || item.status === filter);

  async function load() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser?.id) { setMessage("Please login to view your community submissions."); setLoading(false); return; }
    const [groupResult, orgResult] = await Promise.all([
      supabase.from("community_groups").select("*").eq("submitted_by", currentUser.id).order("created_at", { ascending: false }),
      supabase.from("community_organizations").select("*").eq("submitted_by", currentUser.id).order("created_at", { ascending: false }),
    ]);
    setGroups(groupResult.data || []);
    setOrgs(orgResult.data || []);
    const errors = [groupResult.error, orgResult.error].filter(Boolean);
    setMessage(errors.length ? `Some submissions could not load: ${errors.map((e: any) => e.message).join(" | ")}` : "");
    setLoading(false);
  }
  function choose(item: any) { setSelected(item); setEdit({ ...item }); }
  function setField(k: string, v: string) { setEdit((c: any) => ({ ...c, [k]: v })); }
  async function save() {
    if (!selected?.id || !user?.id) return;
    setSaving(true);
    const cfg = kindConfig(selected.kind);
    const payload: any = { ...edit, status: "pending", approved: false, updated_at: new Date().toISOString() };
    delete payload.id; delete payload.kind; delete payload.approved_at; delete payload.approved_by;
    const { error } = await supabase.from(cfg.table).update(payload).eq("id", selected.id).eq("submitted_by", user.id);
    setSaving(false);
    if (error) { setMessage(`Save failed: ${error.message}`); return; }
    setMessage("Updated and moved back to pending admin review.");
    await load();
    setSelected({ ...selected, ...payload, status: "pending", approved: false });
  }
  useEffect(() => { load(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader /><section className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8"><a href="/my-hub" className="font-black text-pink-300">← Back to My Hub</a><h1 className="mt-3 text-4xl font-black md:text-5xl">My Community Submissions</h1><p className="mt-2 text-slate-300">Track and update community groups and organizations you submitted. Updates go back to pending approval.</p></div>{message && <div className="mb-5 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}{loading && <div className="rounded-3xl bg-white/10 p-6">Loading...</div>}{!loading && !user?.id && <div className="rounded-3xl bg-white p-8 text-slate-950"><p className="font-bold">Please login to view submissions.</p><a href="/login?next=/my-community-submissions" className="mt-5 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Login</a></div>}{!loading && user?.id && <div className="grid gap-6 lg:grid-cols-[420px_1fr]"><aside className="rounded-3xl bg-white p-5 text-slate-950"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">Submissions</h2><select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border p-2 text-sm font-bold"><option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="on_hold">On Hold</option><option value="rejected">Rejected</option></select></div><div className="mt-4 grid gap-3">{filtered.map((item) => <button key={`${item.kind}-${item.id}`} onClick={() => choose(item)} className={`rounded-2xl border p-4 text-left ${selected?.id === item.id && selected?.kind === item.kind ? "border-pink-500 bg-pink-50" : "bg-white"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-black">{item.name}</p><p className="text-xs font-bold text-slate-500">{kindConfig(item.kind).title} · {item.category || "Uncategorized"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(item.status)}`}>{label(item.status)}</span></div></button>)}{filtered.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No submissions yet.</p>}</div><div className="mt-5 flex flex-wrap gap-2"><a href="/community-groups" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Add Group</a><a href="/community-organizations" className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-black text-white">Add Organization</a></div></aside><section className="rounded-3xl bg-white p-6 text-slate-950">{!selected && <p className="font-bold text-slate-500">Select a submission to edit.</p>}{selected && <div><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">{kindConfig(selected.kind).title}</p><h2 className="text-3xl font-black">{selected.name}</h2></div><span className={`rounded-full px-3 py-1 text-sm font-black ${statusClass(selected.status)}`}>{label(selected.status)}</span></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-sm font-black">Name<input value={edit.name || ""} onChange={(e) => setField("name", e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">{selected.kind === "group" ? "Platform" : "Organization Type"}<input value={edit[kindConfig(selected.kind).typeField] || ""} onChange={(e) => setField(kindConfig(selected.kind).typeField, e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">Category<input value={edit.category || ""} onChange={(e) => setField("category", e.target.value)} className="rounded-xl border p-3 font-normal" /></label>{selected.kind === "group" && <label className="grid gap-1 text-sm font-black">Language<input value={edit.language || ""} onChange={(e) => setField("language", e.target.value)} className="rounded-xl border p-3 font-normal" /></label>}<label className="grid gap-1 text-sm font-black">Location<input value={edit.location || ""} onChange={(e) => setField("location", e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">Link<input value={edit[kindConfig(selected.kind).urlField] || ""} onChange={(e) => setField(kindConfig(selected.kind).urlField, e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">Contact Name<input value={edit.contact_name || ""} onChange={(e) => setField("contact_name", e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">Contact Email<input value={edit.contact_email || ""} onChange={(e) => setField("contact_email", e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black md:col-span-2">Description<textarea value={edit.description || ""} onChange={(e) => setField("description", e.target.value)} className="min-h-28 rounded-xl border p-3 font-normal" /></label></div>{edit[kindConfig(selected.kind).urlField] && <CheckedExternalLink href={edit[kindConfig(selected.kind).urlField]} notFoundMessage="This community link is not available." className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-60">Check / Open Link</CheckedExternalLink>}<div className="mt-5 grid gap-3 md:grid-cols-3">{readOnly("Created", fmt(selected.created_at))}{readOnly("Updated", fmt(selected.updated_at))}{readOnly("Approved At", fmt(selected.approved_at))}{readOnly("Approved By", selected.approved_by)}{readOnly("Record ID", selected.id)}{readOnly("Public Status", selected.approved ? "Published" : "Not published")}</div><button onClick={save} disabled={saving} className="mt-6 rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Updates for Review"}</button></div>}</section></div>}</section><SiteFooter /></main>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "./StudioHeader";
import CheckedExternalLink from "./CheckedExternalLink";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
type Kind = "groups" | "organizations";
const configs = {
  groups: { table: "community_groups", title: "Community Groups", publicHref: "/community-groups", urlField: "group_url", typeField: "platform" },
  organizations: { table: "community_organizations", title: "Community Organizations", publicHref: "/community-organizations", urlField: "website", typeField: "organization_type" },
};
function label(v?: string | null) { return String(v || "pending").replaceAll("_", " "); }
function norm(v?: string | null) { return String(v || "").toLowerCase(); }
function fmt(v?: string | null) { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleString(); }
function statusClass(status?: string | null) { const s = String(status || "pending"); if (s === "approved") return "bg-green-100 text-green-800"; if (s === "rejected") return "bg-red-100 text-red-800"; if (s === "on_hold") return "bg-yellow-100 text-yellow-800"; return "bg-slate-100 text-slate-800"; }
function readOnly(name: string, value: any) { return <div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label(name)}</p><p className="mt-1 break-words text-sm font-bold text-slate-700">{value === null || value === undefined || value === "" ? "—" : String(value)}</p></div>; }

export default function StudioCommunityManagePage({ kind }: { kind: Kind }) {
  const config = configs[kind];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [edit, setEdit] = useState<any>({});
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const canAccess = Boolean(user && isAdminRole(role));

  const filtered = useMemo(() => { const q = norm(searchText); return items.filter((item) => { if (statusFilter !== "all" && item.status !== statusFilter) return false; if (!q) return true; return norm(`${item.name || ""} ${item.category || ""} ${item.location || ""} ${item.submitted_email || ""} ${item[config.typeField] || ""}`).includes(q); }); }, [items, searchText, statusFilter, config.typeField]);
  const counts = useMemo(() => ({ total: items.length, pending: items.filter((i) => i.status === "pending" || !i.status).length, approved: items.filter((i) => i.status === "approved").length, rejected: items.filter((i) => i.status === "rejected").length }), [items]);

  async function loadItems() {
    const { data, error } = await supabase.from(config.table).select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) { setMessage(`Could not load ${config.title}: ${error.message}`); return; }
    setItems(data || []);
  }
  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access Studio."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("Admin access required."); setLoading(false); return; }
    await loadItems(); setMessage(""); setLoading(false);
  }
  function choose(item: any) { setSelected(item); setEdit({ ...item }); }
  function setField(k: string, v: any) { setEdit((c: any) => ({ ...c, [k]: v })); }
  async function save(statusOverride?: string) {
    if (!selected?.id) return;
    setSaving(true);
    const nextStatus = statusOverride || edit.status || "pending";
    const payload: any = { ...edit, status: nextStatus, approved: nextStatus === "approved", updated_at: new Date().toISOString() };
    if (nextStatus === "approved") { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    delete payload.id;
    const { error } = await supabase.from(config.table).update(payload).eq("id", selected.id);
    setSaving(false);
    if (error) { setMessage(`Save failed: ${error.message}`); return; }
    setMessage(`Saved ${edit.name || "listing"}.`);
    await loadItems();
    setSelected({ ...selected, ...payload, id: selected.id });
  }
  async function deleteItem(item: any) {
    const ok = window.confirm(`Delete ${item.name}? This cannot be undone.`);
    if (!ok) return;
    const { error } = await supabase.from(config.table).delete().eq("id", item.id);
    if (error) { setMessage(`Delete failed: ${error.message}`); return; }
    setMessage("Deleted listing."); setSelected(null); setEdit({}); await loadItems();
  }
  useEffect(() => { init(); }, [kind]);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><a href="/studio" className="font-black text-pink-300">← Back to Studio</a><h1 className="mt-3 text-4xl font-black md:text-5xl">{config.title}</h1><p className="mt-2 text-slate-300">Review, edit, approve, hold, reject, or delete public community listings.</p>{user?.email && <p className="mt-1 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}</div><div className="flex flex-wrap gap-3"><a href={config.publicHref} className="rounded-xl bg-white/10 px-5 py-3 font-black text-white">Public Page</a><button onClick={init} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button></div></div>{loading && <div className="rounded-3xl bg-white/10 p-6">{message}</div>}{!loading && !canAccess && <div className="rounded-3xl bg-white p-8 text-slate-950">{message}</div>}{!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[420px_1fr]">{message && <div className="lg:col-span-2 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}<aside className="rounded-3xl bg-white p-5 text-slate-950"><div className="grid grid-cols-4 gap-2 text-center"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black">{counts.total}</p><p className="text-xs font-bold text-slate-500">All</p></div><div className="rounded-2xl bg-yellow-50 p-3"><p className="text-2xl font-black">{counts.pending}</p><p className="text-xs font-bold text-slate-500">Pending</p></div><div className="rounded-2xl bg-green-50 p-3"><p className="text-2xl font-black">{counts.approved}</p><p className="text-xs font-bold text-slate-500">Approved</p></div><div className="rounded-2xl bg-red-50 p-3"><p className="text-2xl font-black">{counts.rejected}</p><p className="text-xs font-bold text-slate-500">Rejected</p></div></div><div className="mt-4 grid gap-2"><input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search name, category, submitter..." className="rounded-xl border p-3 font-bold" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border p-3 font-bold"><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="on_hold">On hold</option><option value="rejected">Rejected</option></select></div><div className="mt-4 grid max-h-[720px] gap-3 overflow-y-auto pr-1">{filtered.map((item) => <button key={item.id} onClick={() => choose(item)} className={`rounded-2xl border p-4 text-left ${selected?.id === item.id ? "border-pink-500 bg-pink-50" : "bg-white"}`}><p className="font-black">{item.name}</p><p className="text-xs font-bold text-slate-500">{item.category || "Uncategorized"} · {item.location || "No location"}</p><span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black ${statusClass(item.status)}`}>{label(item.status)}</span></button>)}{filtered.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No matching listings.</p>}</div></aside><section className="rounded-3xl bg-white p-6 text-slate-950">{!selected && <p className="font-bold text-slate-500">Select a listing to review.</p>}{selected && <div><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Selected Listing</p><h2 className="text-3xl font-black">{selected.name}</h2><p className="mt-1 text-sm font-bold text-slate-500">Submitted by {selected.submitted_email || "—"}</p></div><span className={`rounded-full px-3 py-1 text-sm font-black ${statusClass(selected.status)}`}>{label(selected.status)}</span></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-sm font-black">Name<input value={edit.name || ""} onChange={(e) => setField("name", e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">{kind === "groups" ? "Platform" : "Organization Type"}<input value={edit[config.typeField] || ""} onChange={(e) => setField(config.typeField, e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">Category<input value={edit.category || ""} onChange={(e) => setField("category", e.target.value)} className="rounded-xl border p-3 font-normal" /></label>{kind === "groups" && <label className="grid gap-1 text-sm font-black">Language<input value={edit.language || ""} onChange={(e) => setField("language", e.target.value)} className="rounded-xl border p-3 font-normal" /></label>}<label className="grid gap-1 text-sm font-black">Location<input value={edit.location || ""} onChange={(e) => setField("location", e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">Link<input value={edit[config.urlField] || ""} onChange={(e) => setField(config.urlField, e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">Contact Name<input value={edit.contact_name || ""} onChange={(e) => setField("contact_name", e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">Contact Email<input value={edit.contact_email || ""} onChange={(e) => setField("contact_email", e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black md:col-span-2">Description<textarea value={edit.description || ""} onChange={(e) => setField("description", e.target.value)} className="min-h-28 rounded-xl border p-3 font-normal" /></label></div>{edit[config.urlField] && <CheckedExternalLink href={edit[config.urlField]} notFoundMessage="This community link is not available." className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-60">Check / Open Link</CheckedExternalLink>}<div className="mt-5 grid gap-3 md:grid-cols-3">{readOnly("Created", fmt(selected.created_at))}{readOnly("Updated", fmt(selected.updated_at))}{readOnly("Approved At", fmt(selected.approved_at))}{readOnly("Approved By", selected.approved_by)}{readOnly("Submitted Email", selected.submitted_email)}{readOnly("Record ID", selected.id)}</div><div className="mt-6 flex flex-wrap gap-3"><button onClick={() => save()} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-60">Save Edits</button><button onClick={() => save("approved")} disabled={saving} className="rounded-xl bg-green-600 px-5 py-3 font-black text-white disabled:opacity-60">Approve</button><button onClick={() => save("on_hold")} disabled={saving} className="rounded-xl bg-yellow-500 px-5 py-3 font-black text-white disabled:opacity-60">On Hold</button><button onClick={() => save("rejected")} disabled={saving} className="rounded-xl bg-red-600 px-5 py-3 font-black text-white disabled:opacity-60">Reject</button><button onClick={() => deleteItem(selected)} className="rounded-xl border border-red-600 px-5 py-3 font-black text-red-600">Delete</button></div></div>}</section></div>}</section></main>;
}

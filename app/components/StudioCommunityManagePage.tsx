"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "./StudioHeader";
import CheckedExternalLink from "./CheckedExternalLink";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
type Kind = "groups" | "organizations";
type Candidate = { url: string; source: string };
const configs = {
  groups: { table: "community_groups", title: "Community Groups", publicHref: "/community-groups", urlField: "group_url", typeField: "platform" },
  organizations: { table: "community_organizations", title: "Community Organizations", publicHref: "/community-organizations", urlField: "website", typeField: "organization_type" },
};
function label(v?: string | null) { return String(v || "pending").replaceAll("_", " "); }
function norm(v?: string | null) { return String(v || "").toLowerCase(); }
function fmt(v?: string | null) { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleString(); }
function statusClass(status?: string | null) { const s = String(status || "pending"); if (s === "approved") return "bg-green-100 text-green-800"; if (s === "rejected") return "bg-red-100 text-red-800"; if (s === "on_hold") return "bg-yellow-100 text-yellow-800"; return "bg-slate-100 text-slate-800"; }
function readOnly(name: string, value: any) { return <div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label(name)}</p><p className="mt-1 break-words text-sm font-bold text-slate-700">{value === null || value === undefined || value === "" ? "—" : String(value)}</p></div>; }
function normalizeWebsite(value: string) { const v = String(value || "").trim(); return !v ? "" : /^https?:\/\//i.test(v) ? v : `https://${v}`; }
function fallbackSearch(item: any, mode: string) { const phrase = mode === "website" ? `official website ${item.name} ${item.location || "Seattle Washington"}` : mode === "email" ? `${item.name} ${item.location || "Seattle Washington"} contact email` : mode === "phone" ? `${item.name} ${item.location || "Seattle Washington"} phone number` : `${item.name} ${item.location || "Seattle Washington"} official logo`; return `https://www.google.com/search?q=${encodeURIComponent(phrase)}`; }

export default function StudioCommunityManagePage({ kind }: { kind: Kind }) {
  const config = configs[kind];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Checking access...");
  const [researchMessage, setResearchMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [edit, setEdit] = useState<any>({});
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const canAccess = Boolean(user && isAdminRole(role));

  const filtered = useMemo(() => { const q = norm(searchText); return items.filter((item) => { if (statusFilter !== "all" && item.status !== statusFilter) return false; if (!q) return true; return norm(`${item.name || ""} ${item.category || ""} ${item.location || ""} ${item.submitted_email || ""} ${item[config.typeField] || ""}`).includes(q); }); }, [items, searchText, statusFilter, config.typeField]);
  const counts = useMemo(() => ({ total: items.length, pending: items.filter((i) => i.status === "pending" || !i.status).length, approved: items.filter((i) => i.status === "approved").length, rejected: items.filter((i) => i.status === "rejected").length }), [items]);

  async function loadItems() {
    const { data, error } = await supabase.from(config.table).select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) { setMessage(`Could not load ${config.title}: ${error.message}`); return; }
    setItems(data || []);
    if (selected?.id) { const refreshed = (data || []).find((row: any) => row.id === selected.id); if (refreshed) { setSelected(refreshed); setEdit({ ...refreshed }); } }
  }
  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser(); const currentUser = data?.user || null; setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access Studio."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser); setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("Admin access required."); setLoading(false); return; }
    await loadItems(); setMessage(""); setLoading(false);
  }
  function choose(item: any) { setSelected(item); setEdit({ ...item }); setCandidates([]); setResearchMessage(""); }
  function setField(k: string, v: any) { setEdit((c: any) => ({ ...c, [k]: v })); }
  async function authToken() { return (await supabase.auth.getSession()).data.session?.access_token || ""; }

  async function discover(mode: "website" | "email" | "phone") {
    if (!selected) return; setBusy(mode); setResearchMessage(`Looking for ${mode}...`);
    try {
      const response = await fetch("/api/studio/business-contact-discovery", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await authToken()}` }, body: JSON.stringify({ mode, name: edit.name, address: edit.location, website: normalizeWebsite(edit.website || ""), sourceUrl: edit.website || "" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Could not find ${mode}.`);
      if (result.found && result.value) { setField(mode === "website" ? "website" : mode === "email" ? "contact_email" : "contact_phone", result.value); setResearchMessage(`Found ${mode}: ${result.value}. Review and save before approving.`); }
      else setResearchMessage(`No reliable ${mode} was found automatically. Use the manual search link if needed.`);
    } catch (error: any) { setResearchMessage(error?.message || `Could not find ${mode}.`); }
    finally { setBusy(""); }
  }

  async function discoverImages() {
    const website = normalizeWebsite(edit.website || "");
    if (!website) { setResearchMessage("Add or find the official website first."); return; }
    setBusy("images"); setResearchMessage("Checking the official website for organization images...");
    try {
      const response = await fetch("/api/studio/business-image-candidates", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await authToken()}` }, body: JSON.stringify({ website }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not find images.");
      const found = result.candidates || []; setCandidates(found);
      if (found[0]?.url) setField("image", found[0].url);
      setResearchMessage(found.length ? `Found ${found.length} image candidates. Review the selected image, save, then adjust its public crop.` : "No reliable image was found automatically.");
    } catch (error: any) { setResearchMessage(error?.message || "Could not find images."); }
    finally { setBusy(""); }
  }

  async function researchAll() {
    if (!selected) return;
    setBusy("all"); setResearchMessage("Researching website, email, phone and image candidates...");
    try {
      let website = normalizeWebsite(edit.website || ""); const token = await authToken();
      async function find(mode: "website" | "email" | "phone", currentWebsite: string) { const response = await fetch("/api/studio/business-contact-discovery", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ mode, name: edit.name, address: edit.location, website: currentWebsite, sourceUrl: edit.website || "" }) }); if (!response.ok) return ""; const result = await response.json(); return result.found ? String(result.value || "") : ""; }
      if (!website) website = await find("website", "");
      const [email, phone] = website ? await Promise.all([find("email", website), find("phone", website)]) : ["", ""];
      let found: Candidate[] = [];
      if (website) { const imageResponse = await fetch("/api/studio/business-image-candidates", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ website }) }); if (imageResponse.ok) found = (await imageResponse.json()).candidates || []; }
      setEdit((current: any) => ({ ...current, website: website || current.website, contact_email: email || current.contact_email, contact_phone: phone || current.contact_phone, image: found[0]?.url || current.image }));
      setCandidates(found); const count = [website, email || edit.contact_email, phone || edit.contact_phone, found[0]?.url || edit.image].filter(Boolean).length;
      setResearchMessage(`Research complete: ${count} of 4 core details available. Review all fields and save before approving.`);
    } catch (error: any) { setResearchMessage(error?.message || "Organization research failed."); }
    finally { setBusy(""); }
  }

  async function save(statusOverride?: string) {
    if (!selected?.id) return; setSaving(true);
    const nextStatus = statusOverride || edit.status || "pending";
    const payload: any = { ...edit, website: kind === "organizations" ? normalizeWebsite(edit.website || "") || null : edit.website, status: nextStatus, approved: nextStatus === "approved", updated_at: new Date().toISOString() };
    if (nextStatus === "approved") { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    delete payload.id;
    const { error } = await supabase.from(config.table).update(payload).eq("id", selected.id); setSaving(false);
    if (error) { setMessage(`Save failed: ${error.message}`); return; }
    setMessage(`Saved ${edit.name || "listing"}.`); await loadItems(); setSelected({ ...selected, ...payload, id: selected.id });
  }
  async function deleteItem(item: any) { if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return; const { error } = await supabase.from(config.table).delete().eq("id", item.id); if (error) { setMessage(`Delete failed: ${error.message}`); return; } setMessage("Deleted listing."); setSelected(null); setEdit({}); await loadItems(); }
  useEffect(() => { void init(); }, [kind]);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><section className="mx-auto max-w-7xl px-6 py-10">
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><a href="/studio" className="font-black text-pink-300">← Back to Studio</a><h1 className="mt-3 text-4xl font-black md:text-5xl">{config.title}</h1><p className="mt-2 text-slate-300">Review, research, enrich, approve, hold, reject, or delete public community listings.</p></div><div className="flex gap-3"><a href={config.publicHref} className="rounded-xl bg-white/10 px-5 py-3 font-black">Public Page</a><button onClick={init} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button></div></div>
    {loading && <div className="rounded-3xl bg-white/10 p-6">{message}</div>}
    {!loading && !canAccess && <div className="rounded-3xl bg-white p-8 text-slate-950">{message}</div>}
    {!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[420px_1fr]">{message && <div className="lg:col-span-2 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}
      <aside className="rounded-3xl bg-white p-5 text-slate-950"><div className="grid grid-cols-4 gap-2 text-center">{[["All",counts.total],["Pending",counts.pending],["Approved",counts.approved],["Rejected",counts.rejected]].map(([n,v])=><div key={String(n)} className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black">{v}</p><p className="text-xs font-bold text-slate-500">{n}</p></div>)}</div><div className="mt-4 grid gap-2"><input value={searchText} onChange={(e)=>setSearchText(e.target.value)} placeholder="Search name, category, submitter..." className="rounded-xl border p-3 font-bold"/><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="rounded-xl border p-3 font-bold"><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="on_hold">On hold</option><option value="rejected">Rejected</option></select></div><div className="mt-4 grid max-h-[720px] gap-3 overflow-y-auto pr-1">{filtered.map((item)=><button key={item.id} onClick={()=>choose(item)} className={`rounded-2xl border p-4 text-left ${selected?.id===item.id?"border-pink-500 bg-pink-50":"bg-white"}`}><p className="font-black">{item.name}</p><p className="text-xs font-bold text-slate-500">{item.category||"Uncategorized"} · {item.location||"No location"}</p><div className="mt-2 flex gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(item.status)}`}>{label(item.status)}</span>{kind==="organizations"&&<span className={`rounded-full px-3 py-1 text-xs font-black ${item.image?"bg-green-50 text-green-700":"bg-amber-50 text-amber-700"}`}>{item.image?"Image ready":"No image"}</span>}</div></button>)}</div></aside>
      <section className="rounded-3xl bg-white p-6 text-slate-950">{!selected?<p className="font-bold text-slate-500">Select a listing to review.</p>:<div><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Selected listing</p><h2 className="text-3xl font-black">{selected.name}</h2></div><span className={`rounded-full px-3 py-1 text-sm font-black ${statusClass(selected.status)}`}>{label(selected.status)}</span></div>
        {kind==="organizations"&&<section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">Organization research</h3><p className="text-xs text-slate-600">Find details from the official website, review them, then save once.</p></div><button disabled={Boolean(busy)} onClick={researchAll} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy==="all"?"Researching...":"Research Organization"}</button></div><div className="mt-3 flex flex-wrap gap-2"><button disabled={Boolean(busy)} onClick={()=>discover("website")} className="rounded-lg border bg-white px-3 py-2 text-xs font-black">Find website</button><button disabled={Boolean(busy)} onClick={()=>discover("email")} className="rounded-lg border bg-white px-3 py-2 text-xs font-black">Find email</button><button disabled={Boolean(busy)} onClick={()=>discover("phone")} className="rounded-lg border bg-white px-3 py-2 text-xs font-black">Find phone</button><button disabled={Boolean(busy)} onClick={discoverImages} className="rounded-lg border bg-white px-3 py-2 text-xs font-black">Find images</button>{["website","email","phone","image"].map((mode)=><a key={mode} href={fallbackSearch(edit,mode)} target="_blank" rel="noreferrer" className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-black text-blue-700">Search {mode}</a>)}</div>{researchMessage&&<p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-blue-900">{researchMessage}</p>}</section>}
        <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-sm font-black">Name<input value={edit.name||""} onChange={(e)=>setField("name",e.target.value)} className="rounded-xl border p-3 font-normal"/></label><label className="grid gap-1 text-sm font-black">{kind==="groups"?"Platform":"Organization Type"}<input value={edit[config.typeField]||""} onChange={(e)=>setField(config.typeField,e.target.value)} className="rounded-xl border p-3 font-normal"/></label><label className="grid gap-1 text-sm font-black">Category<input value={edit.category||""} onChange={(e)=>setField("category",e.target.value)} className="rounded-xl border p-3 font-normal"/></label>{kind==="groups"&&<label className="grid gap-1 text-sm font-black">Language<input value={edit.language||""} onChange={(e)=>setField("language",e.target.value)} className="rounded-xl border p-3 font-normal"/></label>}<label className="grid gap-1 text-sm font-black">Location<input value={edit.location||""} onChange={(e)=>setField("location",e.target.value)} className="rounded-xl border p-3 font-normal"/></label><label className="grid gap-1 text-sm font-black">Website / Link<input value={edit[config.urlField]||""} onChange={(e)=>setField(config.urlField,e.target.value)} className="rounded-xl border p-3 font-normal"/></label><label className="grid gap-1 text-sm font-black">Contact Name<input value={edit.contact_name||""} onChange={(e)=>setField("contact_name",e.target.value)} className="rounded-xl border p-3 font-normal"/></label><label className="grid gap-1 text-sm font-black">Contact Email<input value={edit.contact_email||""} onChange={(e)=>setField("contact_email",e.target.value)} className="rounded-xl border p-3 font-normal"/></label><label className="grid gap-1 text-sm font-black">Contact Phone<input value={edit.contact_phone||""} onChange={(e)=>setField("contact_phone",e.target.value)} className="rounded-xl border p-3 font-normal"/></label>{kind==="organizations"&&<label className="grid gap-1 text-sm font-black md:col-span-2">Image URL<input value={edit.image||""} onChange={(e)=>setField("image",e.target.value)} className="rounded-xl border p-3 font-normal"/></label>}<label className="grid gap-1 text-sm font-black md:col-span-2">Description<textarea value={edit.description||""} onChange={(e)=>setField("description",e.target.value)} className="min-h-28 rounded-xl border p-3 font-normal"/></label></div>
        {kind==="organizations"&&edit.image&&<div className="mt-4 overflow-hidden rounded-2xl border bg-slate-100"><img src={edit.image} alt={edit.name} className="h-52 w-full object-contain p-3"/></div>}
        {candidates.length>0&&<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{candidates.map((candidate)=><button key={candidate.url} onClick={()=>setField("image",candidate.url)} className="rounded-xl border p-3 text-left"><img src={candidate.url} alt={candidate.source} className="h-32 w-full object-contain"/><p className="mt-2 text-xs text-slate-500">{candidate.source}</p><p className="font-black text-pink-600">Use this image</p></button>)}</div>}
        <div className="mt-4 flex flex-wrap gap-3">{edit[config.urlField]&&<CheckedExternalLink href={edit[config.urlField]} notFoundMessage="This community link is not available." className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Open website</CheckedExternalLink>}{kind==="organizations"&&selected.id&&<a href={`/studio/directory-image-editor?type=organization&id=${selected.id}`} className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-black text-white">Adjust Image Area & Display</a>}</div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">{readOnly("Created",fmt(selected.created_at))}{readOnly("Updated",fmt(selected.updated_at))}{readOnly("Approved At",fmt(selected.approved_at))}</div>
        <div className="mt-6 flex flex-wrap gap-3"><button onClick={()=>save()} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-60">Save Edits</button><button onClick={()=>save("approved")} disabled={saving} className="rounded-xl bg-green-600 px-5 py-3 font-black text-white">Approve</button><button onClick={()=>save("on_hold")} disabled={saving} className="rounded-xl bg-yellow-500 px-5 py-3 font-black">On Hold</button><button onClick={()=>save("rejected")} disabled={saving} className="rounded-xl bg-red-600 px-5 py-3 font-black text-white">Reject</button><button onClick={()=>deleteItem(selected)} className="rounded-xl border border-red-600 px-5 py-3 font-black text-red-600">Delete</button></div>
      </div>}</section>
    </div>}
  </section></main>;
}

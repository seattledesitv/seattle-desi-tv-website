"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

export default function OrganizationEventLinksPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string,string>>({});
  const [message, setMessage] = useState("Checking access...");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [user, setUser] = useState<any>(null);

  async function load(preserveMessage=false) {
    setLoading(true);
    const auth = await supabase.auth.getUser();
    const current = auth.data.user || null;
    setUser(current);
    if (!current) { setMessage("Please log in to review event link requests."); setLoading(false); return; }
    const role = await resolveUserRole(supabase, current);
    if (!isAdminRole(role)) { setMessage("Studio admin access is required."); setLoading(false); return; }
    const result = await supabase.from("organization_event_link_requests").select("id,organization_id,event_id,requested_by,relationship,request_notes,status,admin_notes,created_at,community_organizations(id,name,location),events(id,title,date,location,status)").order("created_at", { ascending: false });
    if (result.error) { setMessage(result.error.message); setLoading(false); return; }
    setRows(result.data || []);
    if (!preserveMessage) setMessage("");
    setLoading(false);
  }

  useEffect(()=>{void load();},[]);

  async function decide(row:any, status:"approved"|"rejected"|"pending") {
    setWorking(row.id);
    setMessage("");
    if (status === "approved") {
      const existing = await supabase.from("event_organizations").select("id").eq("event_id", row.event_id).eq("organization_id", row.organization_id).maybeSingle();
      if (existing.error) { setMessage(existing.error.message); setWorking(""); return; }
      if (!existing.data) {
        const insert = await supabase.from("event_organizations").insert({ event_id: row.event_id, organization_id: row.organization_id, relationship: row.relationship, is_primary: false, display_order: 99, created_by: row.requested_by });
        if (insert.error) { setMessage(`Could not create event relationship: ${insert.error.message}`); setWorking(""); return; }
      }
    }
    const result = await supabase.from("organization_event_link_requests").update({ status, admin_notes: notes[row.id]?.trim() || row.admin_notes || null, reviewed_by: user?.id || null, reviewed_at: status === "pending" ? null : new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", row.id);
    setWorking("");
    if (result.error) { setMessage(result.error.message); return; }
    setMessage(status === "approved" ? "Event relationship approved and linked." : `Request marked ${status}.`);
    await load(true);
  }

  const filtered = useMemo(()=>rows.filter((row)=>{
    const q=search.trim().toLowerCase();
    return (statusFilter==="all"||row.status===statusFilter)&&(!q||[row.community_organizations?.name,row.community_organizations?.location,row.events?.title,row.events?.location,row.relationship,row.request_notes].some((value)=>String(value||"").toLowerCase().includes(q)));
  }),[rows,search,statusFilter]);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><section className="mx-auto max-w-6xl px-6 py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-widest text-pink-300">Community Operations</p><h1 className="mt-2 text-4xl font-black">Organization Event Link Requests</h1><p className="mt-2 text-slate-300">Approve relationships requested by organization managers before they appear on public event and organization profiles.</p></div><button onClick={()=>load()} className="rounded-xl bg-white px-4 py-3 font-black text-slate-950">Refresh</button></div>
    {message&&<div className="mt-6 rounded-xl bg-amber-100 p-4 font-bold text-amber-900">{message}</div>}
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4"><div className="grid gap-3 md:grid-cols-[1fr_220px]"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search organization, event, relationship..." className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white"/><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3"><option value="pending">Pending</option><option value="all">All statuses</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div></section>
    {loading?<div className="mt-6 rounded-2xl bg-white/10 p-6">Loading...</div>:<div className="mt-6 space-y-5">{filtered.length===0?<div className="rounded-2xl bg-white/10 p-8 text-center text-slate-300">No requests match the filters.</div>:filtered.map((row)=><article key={row.id} className="rounded-2xl border border-white/10 bg-white/10 p-5"><div className="grid gap-5 lg:grid-cols-[1fr_330px]"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-pink-500/20 px-3 py-1 text-xs font-black uppercase text-pink-200">{row.relationship}</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase">{row.status}</span></div><h2 className="mt-3 text-2xl font-black">{row.community_organizations?.name || "Organization"}</h2><p className="text-slate-300">{row.community_organizations?.location || "Seattle Area"}</p><div className="mt-4 rounded-xl bg-slate-900 p-4"><p className="text-xs font-black uppercase text-pink-300">Existing event</p><h3 className="mt-1 text-xl font-black">{row.events?.title || "Event"}</h3><p className="mt-1 text-sm text-slate-300">{row.events?.date || "No date"} · {row.events?.location || "No location"}</p></div>{row.request_notes&&<p className="mt-4 whitespace-pre-line rounded-xl bg-slate-900 p-4 text-slate-100"><b>Manager note:</b><br/>{row.request_notes}</p>}</div><div><textarea value={notes[row.id]??row.admin_notes??""} onChange={(e)=>setNotes({...notes,[row.id]:e.target.value})} placeholder="Admin notes" className="min-h-28 w-full rounded-xl border border-white/15 bg-slate-900 p-3"/><div className="mt-3 grid grid-cols-3 gap-2"><button disabled={working===row.id} onClick={()=>decide(row,"approved")} className="rounded-xl bg-emerald-500 px-3 py-2 font-black text-slate-950">Approve</button><button disabled={working===row.id} onClick={()=>decide(row,"rejected")} className="rounded-xl bg-red-500 px-3 py-2 font-black">Reject</button><button disabled={working===row.id} onClick={()=>decide(row,"pending")} className="rounded-xl border border-white/20 px-3 py-2 font-black">Pending</button></div></div></div></article>)}</div>}
  </section></main>;
}

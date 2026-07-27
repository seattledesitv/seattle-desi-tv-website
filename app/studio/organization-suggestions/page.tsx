"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type Suggestion = { id:string; organization_id:string; submitter_name?:string|null; submitter_email?:string|null; correction_type:string; suggestion:string; status:string; admin_notes?:string|null; created_at:string; community_organizations?:{name?:string;location?:string}|null };

export default function OrganizationSuggestionsPage() {
  const [rows,setRows]=useState<Suggestion[]>([]),[notes,setNotes]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("Checking access..."),[loading,setLoading]=useState(true),[working,setWorking]=useState(""),[search,setSearch]=useState(""),[statusFilter,setStatusFilter]=useState("pending");
  const [user,setUser]=useState<any>(null);

  async function load(preserveMessage=false){
    setLoading(true); const auth=await supabase.auth.getUser(); const current=auth.data.user||null; setUser(current);
    if(!current){setMessage("Please log in to review organization suggestions.");setLoading(false);return;}
    const admin=await supabase.from("admins").select("role").or(`user_id.eq.${current.id},email.eq.${current.email}`).maybeSingle();
    if(!String(admin.data?.role||"").toLowerCase().includes("admin")){setMessage("Studio admin access is required.");setLoading(false);return;}
    const result=await supabase.from("organization_edit_suggestions").select("id,organization_id,submitter_name,submitter_email,correction_type,suggestion,status,admin_notes,created_at,community_organizations(name,location)").order("created_at",{ascending:false});
    if(result.error){setMessage(result.error.message);setLoading(false);return;}
    setRows((result.data||[]) as unknown as Suggestion[]); if(!preserveMessage)setMessage(""); setLoading(false);
  }
  useEffect(()=>{void load();},[]);

  async function update(row:Suggestion,status:"approved"|"rejected"|"pending"){
    setWorking(row.id); const result=await supabase.from("organization_edit_suggestions").update({status,admin_notes:notes[row.id]?.trim()||row.admin_notes||null,reviewed_by:user.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",row.id); setWorking("");
    if(result.error){setMessage(result.error.message);return;}
    setMessage(status==="approved"?"Suggestion marked approved. Apply the verified correction from Community Organizations management.":`Suggestion marked ${status}.`); await load(true);
  }

  const filtered=useMemo(()=>rows.filter((row)=>{const q=search.trim().toLowerCase();return(statusFilter==="all"||row.status===statusFilter)&&(!q||[row.community_organizations?.name,row.community_organizations?.location,row.submitter_name,row.submitter_email,row.correction_type,row.suggestion].some(v=>String(v||"").toLowerCase().includes(q)))}),[rows,search,statusFilter]);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><div className="mx-auto max-w-6xl px-6 py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-widest text-pink-300">Community Accuracy</p><h1 className="mt-2 text-4xl font-black">Organization Update Suggestions</h1><p className="mt-2 text-slate-300">Review public corrections before applying them to organization profiles.</p></div><button onClick={()=>load()} className="rounded-xl bg-white px-4 py-3 font-black text-slate-950">Refresh</button></div>
    {message&&<div className="mt-6 rounded-xl bg-amber-100 p-4 font-bold text-amber-900">{message}</div>}
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4"><div className="grid gap-3 md:grid-cols-[1fr_220px]"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search organization, submitter or correction..." className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white"/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3"><option value="pending">Pending</option><option value="all">All statuses</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div></section>
    {loading?<div className="mt-6 rounded-2xl bg-white/10 p-6">Loading...</div>:<div className="mt-6 space-y-5">{filtered.length===0?<div className="rounded-2xl bg-white/10 p-8 text-center text-slate-300">No suggestions match the filters.</div>:filtered.map(row=><article key={row.id} className="rounded-2xl border border-white/10 bg-white/10 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-pink-500/20 px-3 py-1 text-xs font-black uppercase text-pink-200">{row.correction_type}</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase">{row.status}</span></div><h2 className="mt-3 text-2xl font-black">{row.community_organizations?.name||"Organization"}</h2><p className="text-slate-300">{row.community_organizations?.location}</p><p className="mt-3 text-sm text-slate-300">From {row.submitter_name||"Anonymous"}{row.submitter_email?` · ${row.submitter_email}`:""}</p><p className="mt-3 whitespace-pre-line rounded-xl bg-slate-900 p-4 text-slate-100">{row.suggestion}</p></div><div className="lg:w-80"><textarea value={notes[row.id]??row.admin_notes??""} onChange={e=>setNotes({...notes,[row.id]:e.target.value})} placeholder="Admin notes" className="min-h-24 w-full rounded-xl border border-white/15 bg-slate-900 p-3"/><div className="mt-3 grid gap-2"><a href="/studio/community-orgs" className="rounded-xl bg-white px-3 py-2 text-center font-black text-slate-950">Open Organization Management</a><div className="grid grid-cols-3 gap-2"><button disabled={working===row.id} onClick={()=>update(row,"approved")} className="rounded-xl bg-emerald-500 px-3 py-2 font-black text-slate-950">Applied</button><button disabled={working===row.id} onClick={()=>update(row,"rejected")} className="rounded-xl bg-red-500 px-3 py-2 font-black">Reject</button><button disabled={working===row.id} onClick={()=>update(row,"pending")} className="rounded-xl border border-white/20 px-3 py-2 font-black">Pending</button></div></div></div></div></article>)}</div>}
  </div></main>;
}

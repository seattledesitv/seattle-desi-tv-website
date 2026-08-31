"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import MyHubHeader from "../../components/MyHubHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { useCurrentSite } from "../../lib/sites/SiteContext";
import { forSite } from "../../lib/sites/query";

const supabase = getSupabaseBrowserClient();

type Suggestion = { id:string; organization_id:string; submitter_user_id?:string|null; submitter_name?:string|null; submitter_email?:string|null; correction_type:string; suggestion:string; status:string; admin_notes?:string|null; created_at:string; reviewed_at?:string|null; community_organizations?:{name?:string;location?:string}|null };

function prettyStatus(value?: string | null) {
  const text = String(value || "pending").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function statusClass(value?: string | null) {
  if (value === "approved") return "bg-emerald-100 text-emerald-800";
  if (value === "rejected") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-900";
}

export default function OrganizationSuggestionsPage() {
  const site = useCurrentSite();
  const [rows,setRows]=useState<Suggestion[]>([]),[notes,setNotes]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("Checking access..."),[loading,setLoading]=useState(true),[working,setWorking]=useState(""),[search,setSearch]=useState(""),[statusFilter,setStatusFilter]=useState("all");
  const [user,setUser]=useState<any>(null),[isAdmin,setIsAdmin]=useState(false);

  async function load(preserveMessage=false){
    setLoading(true);
    const auth=await supabase.auth.getUser();
    const current=auth.data.user||null;
    setUser(current);
    if(!current){setMessage("Please log in to view organization suggestions.");setLoading(false);return;}

    const admin=await supabase.from("admins").select("role").or(`user_id.eq.${current.id},email.eq.${current.email}`).maybeSingle();
    const adminAccess=String(admin.data?.role||"").toLowerCase().includes("admin");
    setIsAdmin(adminAccess);

    let query=forSite(supabase.from("organization_edit_suggestions").select("id,organization_id,submitter_user_id,submitter_name,submitter_email,correction_type,suggestion,status,admin_notes,created_at,reviewed_at,community_organizations(name,location)"),site.id).order("created_at",{ascending:false});
    if(!adminAccess) query=query.eq("submitter_user_id",current.id);
    const result=await query;
    if(result.error){setMessage(result.error.message);setLoading(false);return;}
    setRows((result.data||[]) as unknown as Suggestion[]);
    if(!preserveMessage)setMessage(adminAccess?"Review public corrections before applying them to organization profiles.":"Track the status of update suggestions you submitted.");
    setLoading(false);
  }

  useEffect(()=>{void load();},[]);

  async function update(row:Suggestion,status:"approved"|"rejected"|"pending"){
    if(!isAdmin||!user?.id)return;
    setWorking(row.id);
    const result=await forSite(supabase.from("organization_edit_suggestions").update({status,admin_notes:notes[row.id]?.trim()||row.admin_notes||null,reviewed_by:user.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}),site.id).eq("id",row.id);
    setWorking("");
    if(result.error){setMessage(result.error.message);return;}
    setMessage(status==="approved"?"Suggestion marked approved. Apply the verified correction from Community Organizations management.":`Suggestion marked ${status}.`);
    await load(true);
  }

  const filtered=useMemo(()=>rows.filter((row)=>{const q=search.trim().toLowerCase();return(statusFilter==="all"||row.status===statusFilter)&&(!q||[row.community_organizations?.name,row.community_organizations?.location,row.submitter_name,row.submitter_email,row.correction_type,row.suggestion].some(v=>String(v||"").toLowerCase().includes(q)))}),[rows,search,statusFilter]);
  const Header=isAdmin?StudioHeader:MyHubHeader;

  return <main className={isAdmin?"min-h-screen bg-slate-950 text-white":"min-h-screen bg-slate-50 text-slate-950"}><Header/><div className="mx-auto max-w-6xl px-6 py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className={`text-sm font-black uppercase tracking-widest ${isAdmin?"text-pink-300":"text-pink-600"}`}>{isAdmin?"Community Accuracy":"My Hub"}</p><h1 className="mt-2 text-4xl font-black">{isAdmin?"Organization Update Suggestions":"My Organization Suggestions"}</h1><p className={`mt-2 ${isAdmin?"text-slate-300":"text-slate-600"}`}>{message}</p></div><button onClick={()=>load()} className={`rounded-xl px-4 py-3 font-black ${isAdmin?"bg-white text-slate-950":"bg-slate-950 text-white"}`}>Refresh</button></div>
    <section className={`mt-6 rounded-2xl border p-4 ${isAdmin?"border-white/10 bg-white/10":"border-slate-200 bg-white"}`}><div className="grid gap-3 md:grid-cols-[1fr_220px]"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search organization or correction..." className={`rounded-xl border px-4 py-3 ${isAdmin?"border-white/15 bg-slate-900 text-white":"border-slate-200 bg-white"}`}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className={`rounded-xl border px-4 py-3 ${isAdmin?"border-white/15 bg-slate-900":"border-slate-200 bg-white"}`}><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div></section>
    {loading?<div className={`mt-6 rounded-2xl p-6 ${isAdmin?"bg-white/10":"bg-white"}`}>Loading...</div>:<div className="mt-6 space-y-5">{filtered.length===0?<div className={`rounded-2xl p-8 text-center ${isAdmin?"bg-white/10 text-slate-300":"border bg-white text-slate-500"}`}>{isAdmin?"No suggestions match the filters.":"You have not submitted any matching suggestions yet."}</div>:filtered.map(row=><article key={row.id} className={`rounded-2xl border p-5 ${isAdmin?"border-white/10 bg-white/10":"border-slate-200 bg-white shadow-sm"}`}><div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-black uppercase text-pink-700">{row.correction_type}</span><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(row.status)}`}>{prettyStatus(row.status)}</span></div><h2 className="mt-3 text-2xl font-black">{row.community_organizations?.name||"Organization"}</h2><p className={isAdmin?"text-slate-300":"text-slate-500"}>{row.community_organizations?.location}</p>{isAdmin&&<p className="mt-3 text-sm text-slate-300">From {row.submitter_name||"Anonymous"}{row.submitter_email?` · ${row.submitter_email}`:""}</p>}<p className={`mt-3 whitespace-pre-line rounded-xl p-4 ${isAdmin?"bg-slate-900 text-slate-100":"bg-slate-50 text-slate-700"}`}>{row.suggestion}</p><p className={`mt-3 text-sm ${isAdmin?"text-slate-300":"text-slate-500"}`}>Submitted {new Date(row.created_at).toLocaleString()}</p>{!isAdmin&&row.admin_notes&&<div className="mt-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-900"><b>SDTV note:</b> {row.admin_notes}</div>}</div>{isAdmin?<div className="lg:w-80"><textarea value={notes[row.id]??row.admin_notes??""} onChange={e=>setNotes({...notes,[row.id]:e.target.value})} placeholder="Admin notes" className="min-h-24 w-full rounded-xl border border-white/15 bg-slate-900 p-3"/><div className="mt-3 grid gap-2"><a href="/studio/community-orgs" className="rounded-xl bg-white px-3 py-2 text-center font-black text-slate-950">Open Organization Management</a><div className="grid grid-cols-3 gap-2"><button disabled={working===row.id} onClick={()=>update(row,"approved")} className="rounded-xl bg-emerald-500 px-3 py-2 font-black text-slate-950">Applied</button><button disabled={working===row.id} onClick={()=>update(row,"rejected")} className="rounded-xl bg-red-500 px-3 py-2 font-black">Reject</button><button disabled={working===row.id} onClick={()=>update(row,"pending")} className="rounded-xl border border-white/20 px-3 py-2 font-black">Pending</button></div></div></div>:<div className="lg:w-64"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">Current status</p><p className="mt-1 text-xl font-black">{prettyStatus(row.status)}</p><p className="mt-2 text-sm text-slate-500">{row.status==="pending"?"SDTV has received your suggestion and it is awaiting review.":row.status==="approved"?"The suggestion was accepted or applied.":"The suggestion was not applied."}</p></div></div>}</div></article>)}</div>}
  </div>{!isAdmin&&<SiteFooter/>}</main>;
}

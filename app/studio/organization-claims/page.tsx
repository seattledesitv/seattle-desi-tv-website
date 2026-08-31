"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { useCurrentSite } from "../../lib/sites/SiteContext";
import { forSite } from "../../lib/sites/query";

const supabase = getSupabaseBrowserClient();

type Claim = { id:string; organization_id:string; requester_user_id?:string|null; requester_name:string; requester_email:string; requester_phone?:string|null; relationship?:string|null; verification_details?:string|null; status:string; admin_notes?:string|null; created_at:string; community_organizations?:{name?:string;location?:string}|null };

export default function OrganizationClaimsPage() {
  const site = useCurrentSite();
  const [claims,setClaims]=useState<Claim[]>([]),[notes,setNotes]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("Checking access..."),[loading,setLoading]=useState(true),[working,setWorking]=useState(""),[search,setSearch]=useState(""),[statusFilter,setStatusFilter]=useState("pending");
  const [currentUser,setCurrentUser]=useState<any>(null);

  async function load(preserveMessage=false){
    setLoading(true);
    const auth=await supabase.auth.getUser(); const user=auth.data.user||null; setCurrentUser(user);
    if(!user){setMessage("Please log in to review organization manager requests.");setLoading(false);return;}
    const admin=await supabase.from("admins").select("role").or(`user_id.eq.${user.id},email.eq.${user.email}`).maybeSingle();
    if(!String(admin.data?.role||"").toLowerCase().includes("admin")){setMessage("Studio admin access is required.");setLoading(false);return;}
    const result=await forSite(supabase.from("organization_claim_requests").select("id,organization_id,requester_user_id,requester_name,requester_email,requester_phone,relationship,verification_details,status,admin_notes,created_at,community_organizations(name,location)"),site.id).order("created_at",{ascending:false});
    if(result.error){setMessage(result.error.message);setLoading(false);return;}
    setClaims((result.data||[]) as unknown as Claim[]); if(!preserveMessage)setMessage(""); setLoading(false);
  }

  useEffect(()=>{void load();},[]);

  async function updateClaim(claim:Claim,status:"approved"|"rejected"|"needs_information"|"pending"){
    setWorking(claim.id); setMessage("");
    const now=new Date().toISOString(); const adminNotes=notes[claim.id]?.trim()||claim.admin_notes?.trim()||null;
    if(status==="needs_information"&&!adminNotes){setMessage("Add the exact information you need before clicking Need info.");setWorking("");return;}
    if(status==="approved"){
      if(!claim.requester_user_id){setMessage("This request is not connected to a user account.");setWorking("");return;}
      const manager=await supabase.from("organization_managers").upsert({site_id:site.id,organization_id:claim.organization_id,user_id:claim.requester_user_id,role:claim.relationship||"authorized_representative",is_primary:true,approved_by:currentUser.id,approved_at:now,active:true},{onConflict:"organization_id,user_id"});
      if(manager.error){setMessage(manager.error.message);setWorking("");return;}
      const organization=await forSite(supabase.from("community_organizations").update({manager_verified_at:now,manager_verified_by:currentUser.id}),site.id).eq("id",claim.organization_id);
      if(organization.error){setMessage(organization.error.message);setWorking("");return;}
    }
    const result=await forSite(supabase.from("organization_claim_requests").update({status,admin_notes:adminNotes,reviewed_by:currentUser.id,reviewed_at:now,updated_at:now}),site.id).eq("id",claim.id);
    setWorking(""); if(result.error){setMessage(result.error.message);return;}
    if(status==="needs_information"){
      const subject=`More information needed for ${claim.community_organizations?.name||"your SDTV organization request"}`;
      const body=[`Hello ${claim.requester_name},`,``,`SDTV needs additional information before approving your manager request for ${claim.community_organizations?.name||"this organization"}.`,``,adminNotes||"Please provide more verification details.",``,`Return to your request: ${window.location.origin}/community-organizations/manage?organization=${claim.organization_id}`].join("\n");
      window.open(`mailto:${claim.requester_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,"_blank");
      setStatusFilter("needs_information"); setMessage("The request was marked Needs information and an email window was opened.");
    } else setMessage(status==="approved"?`${claim.community_organizations?.name||"Organization"} now has a verified manager.`:`Request marked ${status.replace("_"," ")}.`);
    await load(true);
  }

  const filtered=useMemo(()=>claims.filter((claim)=>{const q=search.trim().toLowerCase();return(!q||[claim.community_organizations?.name,claim.community_organizations?.location,claim.requester_name,claim.requester_email,claim.relationship,claim.verification_details].some(v=>String(v||"").toLowerCase().includes(q)))&&(statusFilter==="all"||claim.status===statusFilter)}),[claims,search,statusFilter]);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><div className="mx-auto max-w-6xl px-6 py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-widest text-pink-300">Ownership & Access</p><h1 className="mt-2 text-4xl font-black">Organization Manager Requests</h1><p className="mt-2 text-slate-300">Verify authorized representatives before granting organization-management access.</p></div><button onClick={()=>load()} className="rounded-xl bg-white px-4 py-3 font-black text-slate-950">Refresh</button></div>
    {message&&<div className="mt-6 rounded-xl bg-amber-100 p-4 font-bold text-amber-900">{message}</div>}
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4"><div className="grid gap-3 md:grid-cols-[1fr_220px]"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search organization, requester, email or details..." className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white"/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3"><option value="pending">Pending</option><option value="all">All statuses</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="needs_information">Needs information</option></select></div></section>
    {loading?<div className="mt-6 rounded-2xl bg-white/10 p-6">Loading...</div>:<div className="mt-6 space-y-5">{filtered.length===0?<div className="rounded-2xl bg-white/10 p-8 text-center text-slate-300">No manager requests match the filters.</div>:filtered.map(claim=><article key={claim.id} className="rounded-2xl border border-white/10 bg-white/10 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div><p className="text-xs font-black uppercase text-pink-300">{claim.status}</p><h2 className="mt-1 text-2xl font-black">{claim.community_organizations?.name||"Organization"}</h2><p className="text-slate-300">{claim.community_organizations?.location}</p><p className="mt-4 font-bold">{claim.requester_name} · {claim.requester_email}</p><p className="text-sm text-slate-300">{claim.relationship||"Role not provided"}{claim.requester_phone?` · ${claim.requester_phone}`:""}</p>{claim.verification_details&&<p className="mt-3 whitespace-pre-line rounded-xl bg-slate-900 p-4 text-sm text-slate-200">{claim.verification_details}</p>}</div><div className="lg:w-80"><textarea value={notes[claim.id]??claim.admin_notes??""} onChange={e=>setNotes({...notes,[claim.id]:e.target.value})} placeholder="Admin verification notes" className="min-h-24 w-full rounded-xl border border-white/15 bg-slate-900 p-3"/><div className="mt-3 grid grid-cols-2 gap-2"><button disabled={working===claim.id} onClick={()=>updateClaim(claim,"approved")} className="rounded-xl bg-emerald-500 px-3 py-2 font-black text-slate-950">Approve</button><button disabled={working===claim.id} onClick={()=>updateClaim(claim,"needs_information")} className="rounded-xl bg-amber-400 px-3 py-2 font-black text-slate-950">Need info</button><button disabled={working===claim.id} onClick={()=>updateClaim(claim,"rejected")} className="rounded-xl bg-red-500 px-3 py-2 font-black">Reject</button><button disabled={working===claim.id} onClick={()=>updateClaim(claim,"pending")} className="rounded-xl border border-white/20 px-3 py-2 font-black">Pending</button></div></div></div></article>)}</div>}
  </div></main>;
}

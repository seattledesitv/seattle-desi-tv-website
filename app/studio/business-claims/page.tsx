"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type Claim = {
  id: string;
  business_id: string;
  requester_user_id?: string | null;
  requester_name: string;
  requester_email: string;
  requester_phone?: string | null;
  relationship?: string | null;
  verification_details?: string | null;
  status: string;
  admin_notes?: string | null;
  created_at: string;
  local_businesses?: { name?: string; address?: string } | null;
};

type Suggestion = {
  id: string;
  business_id: string;
  submitter_name?: string | null;
  submitter_email?: string | null;
  suggestion: string;
  status: string;
  created_at: string;
  local_businesses?: { name?: string; address?: string } | null;
};

export default function BusinessClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Checking access...");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [tab, setTab] = useState<"claims" | "suggestions">("claims");
  const [currentUser, setCurrentUser] = useState<any>(null);

  async function load() {
    setLoading(true);
    const auth = await supabase.auth.getUser();
    const user = auth.data.user || null;
    setCurrentUser(user);
    if (!user) { setMessage("Please log in to review business claims."); setLoading(false); return; }
    const admin = await supabase.from("admins").select("role").or(`user_id.eq.${user.id},email.eq.${user.email}`).maybeSingle();
    if (!String(admin.data?.role || "").toLowerCase().includes("admin")) { setMessage("Studio admin access is required."); setLoading(false); return; }

    const [claimResult, suggestionResult] = await Promise.all([
      supabase.from("business_claim_requests").select("id,business_id,requester_user_id,requester_name,requester_email,requester_phone,relationship,verification_details,status,admin_notes,created_at,local_businesses(name,address)").order("created_at", { ascending: false }),
      supabase.from("business_edit_suggestions").select("id,business_id,submitter_name,submitter_email,suggestion,status,created_at,local_businesses(name,address)").order("created_at", { ascending: false }),
    ]);
    if (claimResult.error || suggestionResult.error) {
      const error = claimResult.error || suggestionResult.error;
      setMessage(error?.message?.includes("business_claim_requests") ? "Run the public business claims migration before using this page." : error?.message || "Could not load claim data.");
      setLoading(false);
      return;
    }
    setClaims((claimResult.data || []) as unknown as Claim[]);
    setSuggestions((suggestionResult.data || []) as unknown as Suggestion[]);
    setMessage("");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateClaim(claim: Claim, status: "approved" | "rejected" | "needs_information" | "pending") {
    setWorking(claim.id);
    setMessage("");
    const now = new Date().toISOString();
    const adminNotes = notes[claim.id]?.trim() || null;
    if (status === "approved") {
      if (!claim.requester_user_id) { setMessage("This claim is not connected to a user account and cannot be approved yet."); setWorking(""); return; }
      const managerResult = await supabase.from("business_managers").upsert({ business_id: claim.business_id, user_id: claim.requester_user_id, role: "owner", is_primary: true, approved_by: currentUser.id, approved_at: now, active: true }, { onConflict: "business_id,user_id" });
      if (managerResult.error) { setMessage(managerResult.error.message); setWorking(""); return; }
      const businessResult = await supabase.from("local_businesses").update({ owner_verified_at: now, owner_verified_by: currentUser.id }).eq("id", claim.business_id);
      if (businessResult.error) { setMessage(businessResult.error.message); setWorking(""); return; }
    }
    const result = await supabase.from("business_claim_requests").update({ status, admin_notes: adminNotes, reviewed_by: currentUser.id, reviewed_at: now, updated_at: now }).eq("id", claim.id);
    setWorking("");
    if (result.error) { setMessage(result.error.message); return; }
    setMessage(status === "approved" ? `${claim.local_businesses?.name || "Business"} is now owner verified.` : `Claim marked ${status.replace("_", " ")}.`);
    await load();
  }

  async function updateSuggestion(suggestion: Suggestion, status: "approved" | "rejected" | "pending") {
    setWorking(suggestion.id);
    const result = await supabase.from("business_edit_suggestions").update({ status, admin_notes: notes[suggestion.id]?.trim() || null, reviewed_at: new Date().toISOString() }).eq("id", suggestion.id);
    setWorking("");
    if (result.error) { setMessage(result.error.message); return; }
    setMessage(`Suggestion marked ${status}. Apply approved corrections from Business Management.`);
    await load();
  }

  const filteredClaims = useMemo(() => claims.filter((claim) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [claim.local_businesses?.name, claim.local_businesses?.address, claim.requester_name, claim.requester_email, claim.relationship, claim.verification_details].some((value) => String(value || "").toLowerCase().includes(q));
    return matchesSearch && (statusFilter === "all" || claim.status === statusFilter);
  }), [claims, search, statusFilter]);

  const filteredSuggestions = useMemo(() => suggestions.filter((suggestion) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [suggestion.local_businesses?.name, suggestion.local_businesses?.address, suggestion.submitter_name, suggestion.submitter_email, suggestion.suggestion].some((value) => String(value || "").toLowerCase().includes(q));
    return matchesSearch && (statusFilter === "all" || suggestion.status === statusFilter);
  }), [suggestions, search, statusFilter]);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><div className="mx-auto max-w-6xl px-6 py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-widest text-pink-300">Ownership & Corrections</p><h1 className="mt-2 text-4xl font-black">Business Claims</h1><p className="mt-2 text-slate-300">Verify ownership before granting profile-management access.</p></div><button onClick={load} className="rounded-xl bg-white px-4 py-3 font-black text-slate-950">Refresh</button></div>
    {message&&<div className="mt-6 rounded-xl bg-amber-100 p-4 font-bold text-amber-900">{message}</div>}
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4"><div className="flex flex-wrap gap-2"><button onClick={()=>setTab("claims")} className={`rounded-xl px-4 py-3 font-black ${tab==="claims"?"bg-pink-600":"bg-white/10"}`}>Claims ({claims.filter((c)=>c.status==="pending").length} pending)</button><button onClick={()=>setTab("suggestions")} className={`rounded-xl px-4 py-3 font-black ${tab==="suggestions"?"bg-pink-600":"bg-white/10"}`}>Edit Suggestions ({suggestions.filter((s)=>s.status==="pending").length} pending)</button></div><div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search business, requester, email or details..." className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white"/><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3"><option value="pending">Pending</option><option value="all">All statuses</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="needs_information">Needs information</option></select></div></section>
    {loading?<div className="mt-6 rounded-2xl bg-white/10 p-6">Loading...</div>:tab==="claims"?<div className="mt-6 space-y-5">{filteredClaims.length===0?<div className="rounded-2xl bg-white/10 p-8 text-center text-slate-300">No claim requests match the filters.</div>:filteredClaims.map((claim)=><article key={claim.id} className="rounded-2xl border border-white/10 bg-white/10 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div><p className="text-xs font-black uppercase text-pink-300">{claim.status}</p><h2 className="mt-1 text-2xl font-black">{claim.local_businesses?.name || "Business"}</h2><p className="text-slate-300">{claim.local_businesses?.address}</p><p className="mt-4 font-bold">{claim.requester_name} · {claim.requester_email}</p><p className="text-sm text-slate-300">{claim.relationship || "Relationship not provided"}{claim.requester_phone?` · ${claim.requester_phone}`:""}</p>{claim.verification_details&&<p className="mt-3 whitespace-pre-line rounded-xl bg-slate-900 p-4 text-sm text-slate-200">{claim.verification_details}</p>}</div><div className="lg:w-80"><textarea value={notes[claim.id] ?? claim.admin_notes ?? ""} onChange={(e)=>setNotes({...notes,[claim.id]:e.target.value})} placeholder="Admin verification notes" className="min-h-24 w-full rounded-xl border border-white/15 bg-slate-900 p-3"/><div className="mt-3 grid grid-cols-2 gap-2"><button disabled={working===claim.id} onClick={()=>updateClaim(claim,"approved")} className="rounded-xl bg-emerald-500 px-3 py-2 font-black text-slate-950">Approve</button><button disabled={working===claim.id} onClick={()=>updateClaim(claim,"needs_information")} className="rounded-xl bg-amber-400 px-3 py-2 font-black text-slate-950">Need info</button><button disabled={working===claim.id} onClick={()=>updateClaim(claim,"rejected")} className="rounded-xl bg-red-500 px-3 py-2 font-black">Reject</button><button disabled={working===claim.id} onClick={()=>updateClaim(claim,"pending")} className="rounded-xl border border-white/20 px-3 py-2 font-black">Pending</button></div></div></div></article>)}</div>:<div className="mt-6 space-y-5">{filteredSuggestions.length===0?<div className="rounded-2xl bg-white/10 p-8 text-center text-slate-300">No edit suggestions match the filters.</div>:filteredSuggestions.map((suggestion)=><article key={suggestion.id} className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-xs font-black uppercase text-pink-300">{suggestion.status}</p><h2 className="mt-1 text-2xl font-black">{suggestion.local_businesses?.name || "Business"}</h2><p className="text-slate-300">{suggestion.local_businesses?.address}</p><p className="mt-3 text-sm text-slate-300">From {suggestion.submitter_name || "Anonymous"}{suggestion.submitter_email?` · ${suggestion.submitter_email}`:""}</p><p className="mt-3 whitespace-pre-line rounded-xl bg-slate-900 p-4">{suggestion.suggestion}</p><textarea value={notes[suggestion.id]||""} onChange={(e)=>setNotes({...notes,[suggestion.id]:e.target.value})} placeholder="Admin notes" className="mt-3 min-h-20 w-full rounded-xl border border-white/15 bg-slate-900 p-3"/><div className="mt-3 flex flex-wrap gap-2"><a href="/studio/businesses" className="rounded-xl bg-white px-4 py-2 font-black text-slate-950">Open Business Management</a><button disabled={working===suggestion.id} onClick={()=>updateSuggestion(suggestion,"approved")} className="rounded-xl bg-emerald-500 px-4 py-2 font-black text-slate-950">Mark applied</button><button disabled={working===suggestion.id} onClick={()=>updateSuggestion(suggestion,"rejected")} className="rounded-xl bg-red-500 px-4 py-2 font-black">Reject</button></div></article>)}</div>}
  </div></main>;
}

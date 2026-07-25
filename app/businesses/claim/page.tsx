"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function ClaimBusinessPage() {
  const [business, setBusiness] = useState<any>(null), [user, setUser] = useState<any>(null), [message, setMessage] = useState("Loading business...");
  const [businessId, setBusinessId] = useState("");
  const [existingClaim, setExistingClaim] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", relationship: "Owner", details: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    const id = new URLSearchParams(window.location.search).get("business") || ""; setBusinessId(id);
    const auth = await supabase.auth.getUser(); const currentUser = auth.data.user || null; setUser(currentUser);
    if (currentUser) setForm((v) => ({ ...v, name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "", email: currentUser.email || "" }));
    if (!id) return setMessage("Business not specified.");
    let result = await supabase.from("local_businesses").select("id,name,address,category,owner_verified_at").eq("id", id).eq("status", "approved").maybeSingle();
    if (result.error && /owner_verified_at/i.test(result.error.message || "")) result = await supabase.from("local_businesses").select("id,name,address,category").eq("id", id).eq("status", "approved").maybeSingle();
    if (result.error || !result.data) return setMessage("Business not found.");
    setBusiness(result.data);
    if (currentUser) {
      const claimResult = await supabase.from("business_claim_requests").select("id,status,admin_notes,verification_details,updated_at").eq("business_id", id).eq("requester_user_id", currentUser.id).in("status", ["pending","needs_information","approved"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!claimResult.error && claimResult.data) { setExistingClaim(claimResult.data); setForm((v)=>({...v,details:claimResult.data.verification_details||v.details})); }
    }
    setMessage("");
  })(); }, []);

  async function submit() {
    if (!user || !business) return;
    if (!form.name.trim() || !form.email.trim()) return setMessage("Name and email are required.");
    setSaving(true); setMessage("");
    const payload = { requester_name: form.name.trim(), requester_email: form.email.trim().toLowerCase(), requester_phone: form.phone.trim() || null, relationship: form.relationship, verification_details: form.details.trim() || null, status: "pending", updated_at: new Date().toISOString() };
    const result = existingClaim?.id
      ? await supabase.from("business_claim_requests").update(payload).eq("id", existingClaim.id).eq("requester_user_id", user.id).select("id,status,admin_notes,verification_details,updated_at").maybeSingle()
      : await supabase.from("business_claim_requests").insert({ ...payload, business_id: business.id, requester_user_id: user.id }).select("id,status,admin_notes,verification_details,updated_at").single();
    setSaving(false);
    if (result.error) {
      if (result.error.code === "23505") { setMessage("You already have an open claim for this business. Refresh this page to view its status or provide the requested information."); return; }
      if (/business_claim_requests|schema cache|relation/i.test(result.error.message || "")) { setMessage(`Claim service database error: ${result.error.message}`); return; }
      setMessage(result.error.message); return;
    }
    if (!result.data) {
      setMessage("Your additional information could not be saved because claim-update permission is missing. Run the latest business-claims SQL migration update and try again.");
      return;
    }
    setExistingClaim(result.data);
    setMessage(existingClaim?.status === "needs_information" ? "Additional information submitted. Your claim is back in the admin review queue." : "Claim request submitted. SDTV will verify the request before granting access.");
  }

  const nextPath = `/businesses/claim${businessId ? `?business=${businessId}` : ""}`;
  const needsInfo = existingClaim?.status === "needs_information";
  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader/><section className="mx-auto max-w-3xl px-6 py-12"><p className="font-black uppercase tracking-wide text-pink-600">Business Ownership</p><h1 className="mt-2 text-4xl font-black">Claim this business profile</h1>{business&&<div className="mt-6 rounded-2xl border bg-white p-5"><h2 className="text-2xl font-black">{business.name}</h2><p className="mt-1 text-slate-500">{business.address}</p></div>}<div className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">{message&&<div className="mb-5 rounded-xl bg-amber-50 p-4 font-bold text-amber-900">{message}</div>}{business?.owner_verified_at?<div><p className="font-bold text-emerald-700">This profile is owner verified.</p><a href="/my-businesses" className="mt-4 inline-block rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Open My Businesses</a></div>:!user?<div><p className="text-slate-600">Please sign in so the claim can be connected to your account.</p><a href={`/login?next=${encodeURIComponent(nextPath)}`} className="mt-4 inline-block rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Sign in to continue</a></div>:existingClaim?.status==="approved"?<div><p className="font-bold text-emerald-700">Your claim has been approved.</p><a href="/my-businesses" className="mt-4 inline-block rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Manage My Businesses</a></div>:existingClaim?.status==="pending"?<div><p className="font-bold text-blue-700">Your ownership claim is under SDTV review.</p><p className="mt-2 text-sm text-slate-600">You do not need to submit another claim. SDTV will update the status after verification.</p></div>:<div className="grid gap-4">{needsInfo&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-black text-amber-900">More information is required</p><p className="mt-2 whitespace-pre-line text-sm text-amber-800">{existingClaim.admin_notes || "Please provide additional ownership-verification information."}</p></div>}<p className="rounded-xl bg-slate-50 p-3 text-sm">Signed in as <b>{user.email}</b></p><label className="font-bold">Your name<input className="mt-1 w-full rounded-xl border p-3" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></label><label className="font-bold">Email<input type="email" className="mt-1 w-full rounded-xl border p-3" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></label><label className="font-bold">Phone<input className="mt-1 w-full rounded-xl border p-3" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}/></label><label className="font-bold">Your relationship<select className="mt-1 w-full rounded-xl border p-3" value={form.relationship} onChange={(e)=>setForm({...form,relationship:e.target.value})}><option>Owner</option><option>Co-owner</option><option>Authorised manager</option><option>Marketing representative</option></select></label><label className="font-bold">How can SDTV verify this claim?<textarea className="mt-1 min-h-28 w-full rounded-xl border p-3" placeholder="Business email domain, website access, registration information, or another verification method." value={form.details} onChange={(e)=>setForm({...form,details:e.target.value})}/></label><button disabled={saving} onClick={submit} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-50">{saving?"Submitting...":needsInfo?"Submit additional information":"Submit claim for verification"}</button></div>}</div></section><SiteFooter/></main>;
}

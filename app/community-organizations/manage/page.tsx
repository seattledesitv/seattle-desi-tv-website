"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { useCurrentSite } from "../../lib/sites/SiteContext";
import { forSite } from "../../lib/sites/query";

const supabase = getSupabaseBrowserClient();

const roles = ["Founder", "President", "Secretary", "Board Member", "Executive Director", "Volunteer Coordinator", "Media Coordinator", "Authorized Representative", "Other"];

export default function ManageOrganizationPage() {
  const site = useCurrentSite();
  const [organization, setOrganization] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [message, setMessage] = useState("Loading organization...");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", relationship: "President", details: "" });

  useEffect(() => { void (async () => {
    const id = new URLSearchParams(window.location.search).get("organization") || "";
    setOrganizationId(id);
    const auth = await supabase.auth.getUser();
    const currentUser = auth.data.user || null;
    setUser(currentUser);
    if (currentUser) setForm((value) => ({ ...value, name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "", email: currentUser.email || "" }));
    if (!id) return setMessage("Organization not specified.");

    let result = await forSite(supabase.from("community_organizations").select("id,name,location,category,manager_verified_at").eq("id", id).eq("status", "approved"), site.id).maybeSingle();
    if (result.error && /manager_verified_at/i.test(result.error.message || "")) result = await forSite(supabase.from("community_organizations").select("id,name,location,category").eq("id", id).eq("status", "approved"), site.id).maybeSingle();
    if (result.error || !result.data) return setMessage("Organization not found.");
    setOrganization(result.data);

    if (currentUser) {
      const requestResult = await forSite(supabase.from("organization_claim_requests").select("id,status,admin_notes,verification_details,updated_at").eq("organization_id", id).eq("requester_user_id", currentUser.id).in("status", ["pending", "needs_information", "approved"]).order("created_at", { ascending: false }).limit(1), site.id).maybeSingle();
      if (!requestResult.error && requestResult.data) {
        setExistingRequest(requestResult.data);
        setForm((value) => ({ ...value, details: requestResult.data.verification_details || value.details }));
      }
    }
    setMessage("");
  })(); }, []);

  async function submit() {
    if (!user || !organization) return;
    if (!form.name.trim() || !form.email.trim()) return setMessage("Name and email are required.");
    setSaving(true);
    setMessage("");
    const payload = {
      requester_name: form.name.trim(), requester_email: form.email.trim().toLowerCase(), requester_phone: form.phone.trim() || null,
      relationship: form.relationship, verification_details: form.details.trim() || null, status: "pending", updated_at: new Date().toISOString()
    };
    const result = existingRequest?.id
      ? await forSite(supabase.from("organization_claim_requests").update(payload).eq("id", existingRequest.id).eq("requester_user_id", user.id).select("id,status,admin_notes,verification_details,updated_at"), site.id).maybeSingle()
      : await supabase.from("organization_claim_requests").insert({ ...payload, site_id: site.id, organization_id: organization.id, requester_user_id: user.id }).select("id,status,admin_notes,verification_details,updated_at").single();
    setSaving(false);
    if (result.error) return setMessage(result.error.message);
    setExistingRequest(result.data);
    setMessage(existingRequest?.status === "needs_information" ? "Additional information submitted. Your request is back in the SDTV review queue." : "Manager request submitted. SDTV will verify that you are authorized before granting access.");
  }

  const nextPath = `/community-organizations/manage${organizationId ? `?organization=${organizationId}` : ""}`;
  const needsInfo = existingRequest?.status === "needs_information";

  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader/><section className="mx-auto max-w-3xl px-6 py-12">
    <p className="font-black uppercase tracking-wide text-pink-600">Organization Management</p>
    <h1 className="mt-2 text-4xl font-black">Manage this organization</h1>
    <p className="mt-3 text-slate-600">To protect community organizations from unauthorized changes, SDTV verifies that you are an authorized representative before granting management access.</p>
    {organization && <div className="mt-6 rounded-2xl border bg-white p-5"><h2 className="text-2xl font-black">{organization.name}</h2><p className="mt-1 text-slate-500">{organization.location}</p></div>}
    <div className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
      {message && <div className="mb-5 rounded-xl bg-amber-50 p-4 font-bold text-amber-900">{message}</div>}
      {organization?.manager_verified_at ? <div><p className="font-bold text-emerald-700">This organization already has a verified manager.</p></div>
      : !user ? <div><p className="text-slate-600">Please sign in so the request can be connected to your account.</p><a href={`/login?next=${encodeURIComponent(nextPath)}`} className="mt-4 inline-block rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Sign in to continue</a></div>
      : existingRequest?.status === "approved" ? <div><p className="font-bold text-emerald-700">Your manager request has been approved.</p></div>
      : existingRequest?.status === "pending" ? <div><p className="font-bold text-blue-700">Your manager request is under SDTV review.</p><p className="mt-2 text-sm text-slate-600">You do not need to submit another request.</p></div>
      : <div className="grid gap-4">
        {needsInfo && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-black text-amber-900">More information is required</p><p className="mt-2 whitespace-pre-line text-sm text-amber-800">{existingRequest.admin_notes || "Please provide additional verification information."}</p></div>}
        <p className="rounded-xl bg-slate-50 p-3 text-sm">Signed in as <b>{user.email}</b></p>
        <label className="font-bold">Your name<input className="mt-1 w-full rounded-xl border p-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label>
        <label className="font-bold">Email<input type="email" className="mt-1 w-full rounded-xl border p-3" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></label>
        <label className="font-bold">Phone<input className="mt-1 w-full rounded-xl border p-3" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })}/></label>
        <label className="font-bold">Your role<select className="mt-1 w-full rounded-xl border p-3" value={form.relationship} onChange={(event) => setForm({ ...form, relationship: event.target.value })}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
        <label className="font-bold">How can SDTV verify that you are authorized?<textarea className="mt-1 min-h-28 w-full rounded-xl border p-3" placeholder="Official organization email, website role, board listing, registration information, or another verification method." value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })}/></label>
        <button disabled={saving} onClick={submit} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-50">{saving ? "Submitting..." : needsInfo ? "Submit additional information" : "Submit manager request"}</button>
      </div>}
    </div>
  </section><SiteFooter/></main>;
}

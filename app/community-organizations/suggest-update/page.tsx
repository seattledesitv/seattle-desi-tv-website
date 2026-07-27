"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function SuggestOrganizationUpdatePage() {
  const [organization, setOrganization] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState("Loading organization...");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", correctionType: "general", suggestion: "" });

  useEffect(() => { void (async () => {
    const id = new URLSearchParams(window.location.search).get("organization") || "";
    setOrganizationId(id);
    const auth = await supabase.auth.getUser();
    const currentUser = auth.data.user || null;
    setUser(currentUser);
    if (currentUser) setForm((current) => ({ ...current, name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "", email: currentUser.email || "" }));
    if (!id) { setMessage("Organization not specified."); return; }
    const result = await supabase.from("community_organizations").select("id,name,location,website").eq("id", id).eq("approved", true).eq("status", "approved").maybeSingle();
    if (result.error || !result.data) { setMessage(result.error?.message || "Organization not found."); return; }
    setOrganization(result.data); setMessage("");
  })(); }, []);

  async function submit() {
    if (!organization) return;
    if (!form.suggestion.trim()) { setMessage("Please describe the update you are suggesting."); return; }
    setSaving(true); setMessage("");
    const result = await supabase.from("organization_edit_suggestions").insert({
      organization_id: organization.id,
      submitter_user_id: user?.id || null,
      submitter_name: form.name.trim() || null,
      submitter_email: form.email.trim().toLowerCase() || null,
      correction_type: form.correctionType,
      suggestion: form.suggestion.trim(),
      status: "pending",
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setForm((current) => ({ ...current, suggestion: "" }));
    setMessage("Thank you. Your suggested update was sent to SDTV for review.");
  }

  const returnHref = organizationId ? `/community-organizations/${organizationId}` : "/community-organizations";
  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader/><section className="mx-auto max-w-3xl px-6 py-12">
    <a href={returnHref} className="font-black text-pink-600">← Back to organization</a>
    <p className="mt-8 text-sm font-black uppercase tracking-widest text-pink-600">Community-powered accuracy</p>
    <h1 className="mt-2 text-4xl font-black">Suggest an Update</h1>
    <p className="mt-3 text-slate-600">Report outdated or incorrect organization information. SDTV will review the suggestion before changing the public profile.</p>
    {organization && <div className="mt-6 rounded-2xl border bg-white p-5"><h2 className="text-2xl font-black">{organization.name}</h2><p className="mt-1 text-slate-500">{organization.location || "Seattle Area"}</p></div>}
    <div className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
      {message && <div className="mb-5 rounded-xl bg-amber-50 p-4 font-bold text-amber-900">{message}</div>}
      {organization && <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2"><label className="font-bold">Your name <span className="font-normal text-slate-400">(optional)</span><input className="mt-1 w-full rounded-xl border p-3" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></label><label className="font-bold">Email <span className="font-normal text-slate-400">(optional)</span><input type="email" className="mt-1 w-full rounded-xl border p-3" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></label></div>
        <label className="font-bold">What needs updating?<select className="mt-1 w-full rounded-xl border p-3" value={form.correctionType} onChange={(e)=>setForm({...form,correctionType:e.target.value})}><option value="general">General information</option><option value="website">Website</option><option value="email">Email</option><option value="phone">Phone</option><option value="description">Description</option><option value="contact">Contact person</option><option value="image">Logo or image</option><option value="social">Social links</option><option value="other">Other</option></select></label>
        <label className="font-bold">Suggested correction<textarea className="mt-1 min-h-36 w-full rounded-xl border p-3" placeholder="Tell us what is incorrect and provide the correct information or a source we can verify." value={form.suggestion} onChange={(e)=>setForm({...form,suggestion:e.target.value})}/></label>
        <button onClick={submit} disabled={saving} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-50">{saving ? "Submitting..." : "Submit Suggestion"}</button>
      </div>}
    </div>
  </section><SiteFooter/></main>;
}

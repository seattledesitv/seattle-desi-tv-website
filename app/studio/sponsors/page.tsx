"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const TIERS = ["Platinum Contributor", "Gold Contributor", "Silver Contributor", "Bronze Contributor", "Community Contributor"];
const emptyForm = { id: "", business_id: "", name: "", website: "", logo_url: "", tier: "Community Contributor", display_order: 0, active: true, start_date: "", end_date: "", contribution_reference: "", internal_notes: "" };

export default function ContributorsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [contributors, setContributors] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [search, setSearch] = useState("");
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadData() {
    const [contributorResult, businessResult] = await Promise.all([
      supabase.from("homepage_sponsors").select("id,business_id,name,website,logo_url,tier,display_order,active,start_date,end_date,contribution_reference,internal_notes").order("display_order", { ascending: true }).order("name", { ascending: true }),
      supabase.from("local_businesses").select("id,name,website,image,image_urls,status").eq("status", "approved").order("name", { ascending: true }),
    ]);
    if (contributorResult.error) { setMessage(`Could not load contributors: ${contributorResult.error.message}`); return; }
    setContributors(contributorResult.data || []);
    setBusinesses(businessResult.data || []);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage contributors."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This page is for admins only."); setLoading(false); return; }
    await loadData();
    setMessage("");
    setLoading(false);
  }

  function selectBusiness(businessId: string) {
    const business = businesses.find((item) => item.id === businessId);
    const logo = Array.isArray(business?.image_urls) && business.image_urls.length ? business.image_urls[0] : business?.image || "";
    setForm((current: any) => ({ ...current, business_id: businessId, name: business?.name || current.name, website: business?.website || current.website, logo_url: logo || current.logo_url }));
  }

  function editContributor(row: any) {
    setForm({ ...emptyForm, ...row, start_date: row.start_date || "", end_date: row.end_date || "", contribution_reference: row.contribution_reference || "", internal_notes: row.internal_notes || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() { setForm(emptyForm); }

  async function saveContributor() {
    if (!String(form.name || "").trim()) { setMessage("Contributor name is required."); return; }
    setSaving(true);
    const payload: any = {
      business_id: form.business_id || null,
      name: form.name.trim(),
      website: form.website.trim() || null,
      logo_url: form.logo_url.trim() || null,
      tier: form.tier || "Community Contributor",
      display_order: Number(form.display_order || 0),
      active: Boolean(form.active),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      contribution_reference: form.contribution_reference.trim() || null,
      internal_notes: form.internal_notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const result = form.id
      ? await supabase.from("homepage_sponsors").update(payload).eq("id", form.id)
      : await supabase.from("homepage_sponsors").insert(payload);
    setSaving(false);
    if (result.error) { setMessage(`Save failed: ${result.error.message}`); return; }
    setMessage(form.id ? "Contributor updated." : "Contributor added.");
    resetForm();
    await loadData();
  }

  async function toggleContributor(row: any) {
    const { error } = await supabase.from("homepage_sponsors").update({ active: !row.active, updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) setMessage(`Update failed: ${error.message}`); else { setMessage("Contributor updated."); await loadData(); }
  }

  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return contributors.filter((row) => !q || [row.name, row.tier, row.website].some((value) => String(value || "").toLowerCase().includes(q))); }, [contributors, search]);
  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="mx-auto max-w-7xl px-6 py-10">
    <div><p className="text-sm font-black uppercase tracking-wide text-pink-300">Community Support</p><h1 className="mt-2 text-4xl font-black">Homepage Contributors</h1><p className="mt-2 text-slate-300">Manage businesses and community supporters recognised as SDTV contributors.</p>{user?.email && <p className="mt-2 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}</div>
    {loading && <div className="mt-8 rounded-2xl bg-white/10 p-6">{message}</div>}
    {!loading && !canAccess && <div className="mt-8 rounded-2xl bg-white p-8 text-slate-950">{message}</div>}
    {!loading && canAccess && <div className="mt-8 grid gap-6 lg:grid-cols-[430px_1fr]">
      <section className="h-fit rounded-3xl bg-white p-6 text-slate-950 lg:sticky lg:top-6"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">{form.id ? "Edit Contributor" : "Add Contributor"}</h2>{form.id && <button onClick={resetForm} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-black">Cancel</button>}</div>
        <label className="mt-5 grid gap-1 text-sm font-black">Link an existing business<select className="rounded-xl border p-3 font-normal" value={form.business_id} onChange={(e) => selectBusiness(e.target.value)}><option value="">Standalone contributor</option>{businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label>
        <input className="mt-3 w-full rounded-xl border p-3" placeholder="Contributor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="mt-3 w-full rounded-xl border p-3" placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        <input className="mt-3 w-full rounded-xl border p-3" placeholder="Logo URL" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
        <select className="mt-3 w-full rounded-xl border p-3" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>{TIERS.map((tier) => <option key={tier}>{tier}</option>)}</select>
        <div className="mt-3 grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-black">Start date<input type="date" className="rounded-xl border p-3 font-normal" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label><label className="grid gap-1 text-sm font-black">End date<input type="date" className="rounded-xl border p-3 font-normal" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></label></div>
        <input className="mt-3 w-full rounded-xl border p-3" type="number" placeholder="Display order" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
        <input className="mt-3 w-full rounded-xl border p-3" placeholder="Contribution / invoice reference" value={form.contribution_reference} onChange={(e) => setForm({ ...form, contribution_reference: e.target.value })} />
        <textarea className="mt-3 min-h-24 w-full rounded-xl border p-3" placeholder="Internal notes" value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} />
        <label className="mt-3 flex gap-2 text-sm font-bold"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active and visible</label>
        <button disabled={saving} onClick={saveContributor} className="mt-5 w-full rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : form.id ? "Update Contributor" : "Save Contributor"}</button>
        {message && <p className="mt-4 text-sm font-bold text-orange-600">{message}</p>}
      </section>
      <section className="rounded-3xl bg-white p-6 text-slate-950"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 className="text-2xl font-black">Contributors ({contributors.length})</h2><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contributors..." className="rounded-xl border px-4 py-3" /></div>
        <div className="mt-5 grid gap-4">{filtered.map((row) => <article key={row.id} className="grid gap-4 rounded-2xl border p-4 md:grid-cols-[72px_1fr_auto] md:items-center"><div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl bg-slate-100">{row.logo_url ? <img src={row.logo_url} alt={row.name} className="h-full w-full object-contain p-2" /> : <span className="text-xs font-black text-pink-600">SDTV</span>}</div><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black">{row.name}</h3>{row.business_id && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">Business linked</span>}</div><p className="text-sm text-gray-600">{row.tier || "Community Contributor"} · Order {row.display_order || 0} · {row.active ? "Active" : "Inactive"}</p>{(row.start_date || row.end_date) && <p className="mt-1 text-xs text-gray-500">{row.start_date || "No start"} → {row.end_date || "No end"}</p>}</div><div className="flex gap-2"><button onClick={() => editContributor(row)} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white">Edit</button><button onClick={() => toggleContributor(row)} className="rounded-lg border px-3 py-2 text-sm font-bold">{row.active ? "Deactivate" : "Activate"}</button></div></article>)}{filtered.length === 0 && <p className="text-gray-500">No contributors found.</p>}</div>
      </section>
    </div>}
  </div></main>;
}

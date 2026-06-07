"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const TIERS = ["Gold Sponsor", "Silver Sponsor", "Community Partner"];

export default function SponsorsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", website: "", logo_url: "", tier: "Community Partner", display_order: 0, active: true });
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadSponsors() {
    const { data, error } = await supabase.from("homepage_sponsors").select("id,name,website,logo_url,tier,display_order,active").order("tier", { ascending: true }).order("display_order", { ascending: true });
    if (error) { setMessage(`Could not load sponsors: ${error.message}`); return; }
    setSponsors(data || []);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage sponsors."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This page is for admins only."); setLoading(false); return; }
    await loadSponsors();
    setMessage("");
    setLoading(false);
  }

  async function saveSponsor() {
    if (!form.name) { setMessage("Sponsor name is required."); return; }
    const payload: any = { name: form.name, website: form.website || null, logo_url: form.logo_url || null, tier: form.tier || "Community Partner", display_order: Number(form.display_order || 0), active: Boolean(form.active), updated_at: new Date().toISOString() };
    const { error } = await supabase.from("homepage_sponsors").insert(payload);
    if (error) { setMessage(`Save failed: ${error.message}`); return; }
    setForm({ name: "", website: "", logo_url: "", tier: "Community Partner", display_order: 0, active: true });
    setMessage("Sponsor saved.");
    await loadSponsors();
  }

  async function toggleSponsor(sponsor: any) {
    const { error } = await supabase.from("homepage_sponsors").update({ active: !sponsor.active, updated_at: new Date().toISOString() }).eq("id", sponsor.id);
    if (error) setMessage(`Update failed: ${error.message}`); else { setMessage("Sponsor updated."); await loadSponsors(); }
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-black">Homepage Sponsors</h1>
        <p className="text-slate-300 mt-2">Manage sponsors shown on the public homepage by tier.</p>
        {user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role}</p>}
        {loading && <div className="bg-white/10 rounded-2xl p-6 mt-8">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 mt-8">{message}</div>}
        {!loading && canAccess && <div className="grid lg:grid-cols-[380px_1fr] gap-6 mt-8">
          <section className="bg-white text-slate-950 rounded-2xl p-6">
            <h2 className="text-2xl font-black mb-4">Add Sponsor</h2>
            <input className="w-full border rounded-lg p-3 mb-3" placeholder="Sponsor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="w-full border rounded-lg p-3 mb-3" placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            <input className="w-full border rounded-lg p-3 mb-3" placeholder="Logo URL" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
            <select className="w-full border rounded-lg p-3 mb-3" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>{TIERS.map((tier) => <option key={tier}>{tier}</option>)}</select>
            <input className="w-full border rounded-lg p-3 mb-3" type="number" placeholder="Display order" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
            <label className="flex gap-2 text-sm font-bold mb-4"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
            <button onClick={saveSponsor} className="w-full bg-pink-600 text-white px-5 py-3 rounded-xl font-black">Save Sponsor</button>
            {message && <p className="text-sm text-orange-600 mt-4">{message}</p>}
          </section>
          <section className="bg-white text-slate-950 rounded-2xl p-6">
            <h2 className="text-2xl font-black mb-4">Sponsors ({sponsors.length})</h2>
            <div className="grid gap-4">
              {sponsors.map((sponsor) => <article key={sponsor.id} className="border rounded-xl p-4 grid grid-cols-[72px_1fr_auto] items-center gap-4"><div className="h-16 w-16 rounded-xl bg-slate-100 grid place-items-center overflow-hidden">{sponsor.logo_url ? <img src={sponsor.logo_url} alt={sponsor.name} className="h-full w-full object-contain p-2" /> : <span className="text-xs font-black text-pink-600">SDTV</span>}</div><div><h3 className="text-xl font-black">{sponsor.name}</h3><p className="text-sm text-gray-600">{sponsor.tier || "Community Partner"} · Order {sponsor.display_order || 0} · {sponsor.active ? "Active" : "Inactive"}</p></div><button onClick={() => toggleSponsor(sponsor)} className="border px-3 py-2 rounded-lg font-bold text-sm">{sponsor.active ? "Deactivate" : "Activate"}</button></article>)}
              {sponsors.length === 0 && <p className="text-gray-500">No sponsors found.</p>}
            </div>
          </section>
        </div>}
      </div>
    </main>
  );
}

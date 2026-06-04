"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import StudioHeader from "../../components/StudioHeader";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", { auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

function isAdminRole(role: string) { return String(role || "").toLowerCase().includes("admin"); }

export default function SponsorsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", logo: "", website: "", tier: "Community Partner", active: true });
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadSponsors() {
    const { data, error } = await supabase.from("sponsors").select("id,name,logo,website,tier,active,created_at").order("tier", { ascending: true }).order("created_at", { ascending: false });
    if (error) { setActionMessage(`Could not load sponsors: ${error.message}`); return; }
    setSponsors(data || []);
  }

  async function init() {
    setLoading(true);
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage sponsors."); setLoading(false); return; }
    const roleResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    const nextRole = roleResult.data?.role || "";
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This page is for admins only."); setLoading(false); return; }
    await loadSponsors();
    setMessage("");
    setLoading(false);
  }

  async function saveSponsor() {
    setActionMessage("Saving sponsor...");
    if (!form.name) { setActionMessage("Sponsor name is required."); return; }
    const { error } = await supabase.from("sponsors").insert({ name: form.name, logo: form.logo || null, website: form.website || null, tier: form.tier || "Community Partner", active: form.active });
    if (error) { setActionMessage(`Save failed: ${error.message}`); return; }
    setForm({ name: "", logo: "", website: "", tier: "Community Partner", active: true });
    setActionMessage("Sponsor saved.");
    await loadSponsors();
  }

  async function toggleSponsor(sponsor: any) {
    const { error } = await supabase.from("sponsors").update({ active: !sponsor.active }).eq("id", sponsor.id);
    if (error) setActionMessage(`Update failed: ${error.message}`); else { setActionMessage("Sponsor updated."); await loadSponsors(); }
  }

  async function deleteSponsor(sponsor: any) {
    if (!window.confirm(`Delete sponsor ${sponsor.name}?`)) return;
    const { error } = await supabase.from("sponsors").delete().eq("id", sponsor.id);
    if (error) setActionMessage(`Delete failed: ${error.message}`); else { setActionMessage("Sponsor deleted."); await loadSponsors(); }
  }

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="max-w-7xl mx-auto px-6 py-10"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><h1 className="text-4xl md:text-5xl font-black">Sponsor Management</h1><p className="text-slate-300 mt-2">Manage Gold Sponsors, Silver Sponsors, and Community Partners.</p>{user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role || "none"}</p>}</div><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button></div>{loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}{!loading && canAccess && <div className="grid lg:grid-cols-[380px_1fr] gap-6"><section className="bg-white text-slate-950 rounded-2xl p-6"><h2 className="text-2xl font-black mb-4">Add Sponsor</h2><input className="w-full border rounded-lg p-3 mb-3" placeholder="Sponsor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Logo URL" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /><select className="w-full border rounded-lg p-3 mb-3" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}><option>Gold Sponsor</option><option>Silver Sponsor</option><option>Community Partner</option></select><label className="flex items-center gap-2 text-sm font-bold mb-4"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label><button onClick={saveSponsor} className="w-full bg-pink-600 text-white px-5 py-3 rounded-xl font-black">Save Sponsor</button>{actionMessage && <p className="text-sm text-orange-600 mt-4">{actionMessage}</p>}</section><section className="bg-white text-slate-950 rounded-2xl p-6"><h2 className="text-2xl font-black mb-4">Sponsors ({sponsors.length})</h2><div className="grid gap-4">{sponsors.map((sponsor) => <article key={sponsor.id} className="border rounded-xl p-4 grid md:grid-cols-[96px_1fr_auto] gap-4 items-center">{sponsor.logo ? <img src={sponsor.logo} alt={sponsor.name} className="w-24 h-24 rounded-xl object-contain bg-gray-50 border" /> : <div className="w-24 h-24 rounded-xl bg-pink-50 grid place-items-center text-pink-600 font-black text-xs text-center px-2">No logo</div>}<div><h3 className="text-xl font-black">{sponsor.name}</h3><p className="text-sm text-gray-600">{sponsor.tier} · {sponsor.active ? "Active" : "Inactive"}</p>{sponsor.website && <a href={sponsor.website} target="_blank" rel="noreferrer" className="text-pink-600 font-bold text-sm">Website</a>}</div><div className="flex flex-wrap gap-2 md:justify-end"><button onClick={() => toggleSponsor(sponsor)} className="border px-3 py-2 rounded-lg font-bold text-sm">{sponsor.active ? "Deactivate" : "Activate"}</button><button onClick={() => deleteSponsor(sponsor)} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button></div></article>)}{sponsors.length === 0 && <p className="text-gray-500">No sponsors found.</p>}</div></section></div>}</div></main>;
}

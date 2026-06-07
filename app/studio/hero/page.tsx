"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const emptyBanner = { title: "", subtitle: "", image_url: "", button_text: "", button_url: "", banner_type: "marketing", start_date: "", end_date: "", display_order: 0, active: true };
const emptyFestival = { festival_name: "", festival_key: "", title: "", subtitle: "", image_url: "", start_date: "", end_date: "", active: true };

export default function HeroCmsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [banners, setBanners] = useState<any[]>([]);
  const [festivals, setFestivals] = useState<any[]>([]);
  const [bannerForm, setBannerForm] = useState<any>(emptyBanner);
  const [festivalForm, setFestivalForm] = useState<any>(emptyFestival);
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadContent() {
    const [bannerResult, festivalResult] = await Promise.all([
      supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,button_text,button_url,banner_type,start_date,end_date,display_order,active").order("display_order", { ascending: true }),
      supabase.from("festival_hero_assets").select("id,festival_name,festival_key,title,subtitle,image_url,start_date,end_date,active").order("start_date", { ascending: true }),
    ]);
    if (bannerResult.error) setMessage(`Could not load banners: ${bannerResult.error.message}`); else setBanners(bannerResult.data || []);
    if (festivalResult.error) setMessage(`Could not load festivals: ${festivalResult.error.message}`); else setFestivals(festivalResult.data || []);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage hero banners."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This page is for admins only."); setLoading(false); return; }
    await loadContent();
    setMessage("");
    setLoading(false);
  }

  async function saveBanner() {
    if (!bannerForm.title) { setMessage("Banner title is required."); return; }
    const payload: any = { ...bannerForm, start_date: bannerForm.start_date || null, end_date: bannerForm.end_date || null, display_order: Number(bannerForm.display_order || 0), updated_at: new Date().toISOString() };
    const { error } = await supabase.from("homepage_hero_banners").insert(payload);
    if (error) { setMessage(`Save failed: ${error.message}`); return; }
    setBannerForm(emptyBanner);
    setMessage("Hero banner saved.");
    await loadContent();
  }

  async function saveFestival() {
    if (!festivalForm.festival_name || !festivalForm.festival_key || !festivalForm.start_date || !festivalForm.end_date) { setMessage("Festival name, key, start date, and end date are required."); return; }
    const payload: any = { ...festivalForm, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("festival_hero_assets").insert(payload);
    if (error) { setMessage(`Festival save failed: ${error.message}`); return; }
    setFestivalForm(emptyFestival);
    setMessage("Festival hero saved.");
    await loadContent();
  }

  async function toggle(table: string, item: any) {
    const { error } = await supabase.from(table).update({ active: !item.active, updated_at: new Date().toISOString() }).eq("id", item.id);
    if (error) setMessage(`Update failed: ${error.message}`); else { setMessage("Status updated."); await loadContent(); }
  }

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="max-w-7xl mx-auto px-6 py-10"><h1 className="text-4xl font-black">Hero CMS</h1><p className="text-slate-300 mt-2">Manage rotating homepage hero banners and festival hero assets.</p>{user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role}</p>}{loading && <div className="bg-white/10 rounded-2xl p-6 mt-8">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 mt-8">{message}</div>}{!loading && canAccess && <div className="space-y-8 mt-8">{message && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{message}</div>}<section className="grid lg:grid-cols-[380px_1fr] gap-6"><div className="bg-white text-slate-950 rounded-2xl p-6"><h2 className="text-2xl font-black mb-4">Add Marketing Banner</h2><input className="w-full border rounded-lg p-3 mb-3" placeholder="Title" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Subtitle" value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Image URL" value={bannerForm.image_url} onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Button text" value={bannerForm.button_text} onChange={(e) => setBannerForm({ ...bannerForm, button_text: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Button URL" value={bannerForm.button_url} onChange={(e) => setBannerForm({ ...bannerForm, button_url: e.target.value })} /><select className="w-full border rounded-lg p-3 mb-3" value={bannerForm.banner_type} onChange={(e) => setBannerForm({ ...bannerForm, banner_type: e.target.value })}><option>marketing</option><option>event</option><option>sponsor</option><option>radio</option><option>announcement</option></select><input className="w-full border rounded-lg p-3 mb-3" type="date" value={bannerForm.start_date} onChange={(e) => setBannerForm({ ...bannerForm, start_date: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" type="date" value={bannerForm.end_date} onChange={(e) => setBannerForm({ ...bannerForm, end_date: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" type="number" placeholder="Display order" value={bannerForm.display_order} onChange={(e) => setBannerForm({ ...bannerForm, display_order: Number(e.target.value) })} /><label className="flex gap-2 text-sm font-bold mb-4"><input type="checkbox" checked={bannerForm.active} onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })} /> Active</label><button onClick={saveBanner} className="w-full bg-pink-600 text-white px-5 py-3 rounded-xl font-black">Save Banner</button></div><div className="bg-white text-slate-950 rounded-2xl p-6"><h2 className="text-2xl font-black mb-4">Hero Banners ({banners.length})</h2><div className="grid gap-4">{banners.map((banner) => <article key={banner.id} className="border rounded-xl p-4 grid md:grid-cols-[96px_1fr_auto] gap-4 items-center">{banner.image_url ? <img src={banner.image_url} alt={banner.title} className="w-24 h-20 rounded-xl object-cover bg-gray-50 border" /> : <div className="w-24 h-20 rounded-xl bg-pink-50 grid place-items-center text-pink-600 font-black text-xs">No image</div>}<div><h3 className="text-xl font-black">{banner.title}</h3><p className="text-sm text-gray-600">{banner.banner_type} · Order {banner.display_order || 0} · {banner.active ? "Active" : "Inactive"}</p><p className="text-xs text-gray-500">{banner.start_date || "No start"} → {banner.end_date || "No end"}</p></div><button onClick={() => toggle("homepage_hero_banners", banner)} className="border px-3 py-2 rounded-lg font-bold text-sm">{banner.active ? "Deactivate" : "Activate"}</button></article>)}{banners.length === 0 && <p className="text-gray-500">No banners found.</p>}</div></div></section><section className="grid lg:grid-cols-[380px_1fr] gap-6"><div className="bg-white text-slate-950 rounded-2xl p-6"><h2 className="text-2xl font-black mb-4">Add Festival Hero</h2><input className="w-full border rounded-lg p-3 mb-3" placeholder="Festival name" value={festivalForm.festival_name} onChange={(e) => setFestivalForm({ ...festivalForm, festival_name: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Festival key e.g. diwali_2026" value={festivalForm.festival_key} onChange={(e) => setFestivalForm({ ...festivalForm, festival_key: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Title" value={festivalForm.title} onChange={(e) => setFestivalForm({ ...festivalForm, title: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Subtitle" value={festivalForm.subtitle} onChange={(e) => setFestivalForm({ ...festivalForm, subtitle: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Image URL" value={festivalForm.image_url} onChange={(e) => setFestivalForm({ ...festivalForm, image_url: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" type="date" value={festivalForm.start_date} onChange={(e) => setFestivalForm({ ...festivalForm, start_date: e.target.value })} /><input className="w-full border rounded-lg p-3 mb-3" type="date" value={festivalForm.end_date} onChange={(e) => setFestivalForm({ ...festivalForm, end_date: e.target.value })} /><label className="flex gap-2 text-sm font-bold mb-4"><input type="checkbox" checked={festivalForm.active} onChange={(e) => setFestivalForm({ ...festivalForm, active: e.target.checked })} /> Active</label><button onClick={saveFestival} className="w-full bg-pink-600 text-white px-5 py-3 rounded-xl font-black">Save Festival</button></div><div className="bg-white text-slate-950 rounded-2xl p-6"><h2 className="text-2xl font-black mb-4">Festival Assets ({festivals.length})</h2><div className="grid gap-4">{festivals.map((festival) => <article key={festival.id} className="border rounded-xl p-4 grid md:grid-cols-[96px_1fr_auto] gap-4 items-center">{festival.image_url ? <img src={festival.image_url} alt={festival.festival_name} className="w-24 h-20 rounded-xl object-cover bg-gray-50 border" /> : <div className="w-24 h-20 rounded-xl bg-pink-50 grid place-items-center text-pink-600 font-black text-xs">No image</div>}<div><h3 className="text-xl font-black">{festival.festival_name}</h3><p className="text-sm text-gray-600">{festival.festival_key} · {festival.active ? "Active" : "Inactive"}</p><p className="text-xs text-gray-500">{festival.start_date} → {festival.end_date}</p></div><button onClick={() => toggle("festival_hero_assets", festival)} className="border px-3 py-2 rounded-lg font-bold text-sm">{festival.active ? "Deactivate" : "Activate"}</button></article>)}{festivals.length === 0 && <p className="text-gray-500">No festival assets found.</p>}</div></div></section></div>}</div></main>;
}

"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";
import { uploadFileToCloudinary } from "../../lib/cloudinaryUpload";

const supabase = getSupabaseBrowserClient();
const THEMES = ["fallback", "gold", "pink", "blue", "festival", "cinematic", "emerald"];
const emptyBanner = { title: "", subtitle: "", image_url: "", button_text: "", button_url: "", banner_type: "marketing", theme: "fallback", start_date: "", end_date: "", display_order: 0, active: true };
const emptyFestival = { festival_name: "", festival_key: "", title: "", subtitle: "", image_url: "", theme: "festival", start_date: "", end_date: "", active: true };

function normalizeDate(value?: string | null) { return value ? String(value).split("T")[0] : ""; }
function titleCase(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function ThemeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select value={value || "fallback"} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border p-3 font-normal">{THEMES.map((theme) => <option key={theme} value={theme}>{titleCase(theme)}</option>)}</select>;
}

export default function HeroCmsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [banners, setBanners] = useState<any[]>([]);
  const [festivals, setFestivals] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [bannerForm, setBannerForm] = useState<any>(emptyBanner);
  const [festivalForm, setFestivalForm] = useState<any>(emptyFestival);
  const [editingBannerId, setEditingBannerId] = useState("");
  const [editingFestivalId, setEditingFestivalId] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [festivalFile, setFestivalFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadContent() {
    const [bannerResult, festivalResult, eventResult] = await Promise.all([
      supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,button_text,button_url,banner_type,theme,start_date,end_date,display_order,active").order("display_order", { ascending: true }),
      supabase.from("festival_hero_assets").select("id,festival_name,festival_key,title,subtitle,image_url,theme,start_date,end_date,active").order("start_date", { ascending: true }),
      supabase.from("events").select("id,title,date,location,image,image_urls,featured,featured_order,hero_theme").eq("featured", true).order("featured_order", { ascending: true }),
    ]);
    if (bannerResult.error || festivalResult.error || eventResult.error) setMessage(bannerResult.error?.message || festivalResult.error?.message || eventResult.error?.message || "Could not load hero content.");
    setBanners(bannerResult.data || []); setFestivals(festivalResult.data || []); setFeaturedEvents(eventResult.data || []);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser(); const currentUser = data?.user || null; setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage hero content."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser); setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This page is for admins only."); setLoading(false); return; }
    await loadContent(); setMessage(""); setLoading(false);
  }

  async function saveBanner() {
    if (!bannerForm.title.trim()) { setMessage("Banner title is required."); return; }
    setSaving(true);
    try {
      let imageUrl = bannerForm.image_url || "";
      if (bannerFile) imageUrl = await uploadFileToCloudinary(bannerFile);
      const payload = { ...bannerForm, image_url: imageUrl, start_date: bannerForm.start_date || null, end_date: bannerForm.end_date || null, display_order: Number(bannerForm.display_order || 0), updated_at: new Date().toISOString() };
      const result = editingBannerId ? await supabase.from("homepage_hero_banners").update(payload).eq("id", editingBannerId) : await supabase.from("homepage_hero_banners").insert(payload);
      if (result.error) throw result.error;
      setBannerForm(emptyBanner); setBannerFile(null); setEditingBannerId(""); setMessage("Hero banner saved."); await loadContent();
    } catch (error: any) { setMessage(error?.message || "Could not save banner."); } finally { setSaving(false); }
  }

  async function saveFestival() {
    if (!festivalForm.festival_name.trim() || !festivalForm.festival_key.trim()) { setMessage("Festival name and key are required."); return; }
    setSaving(true);
    try {
      let imageUrl = festivalForm.image_url || "";
      if (festivalFile) imageUrl = await uploadFileToCloudinary(festivalFile);
      const payload = { ...festivalForm, image_url: imageUrl, start_date: festivalForm.start_date || null, end_date: festivalForm.end_date || null, updated_at: new Date().toISOString() };
      const result = editingFestivalId ? await supabase.from("festival_hero_assets").update(payload).eq("id", editingFestivalId) : await supabase.from("festival_hero_assets").insert(payload);
      if (result.error) throw result.error;
      setFestivalForm(emptyFestival); setFestivalFile(null); setEditingFestivalId(""); setMessage("Festival hero saved."); await loadContent();
    } catch (error: any) { setMessage(error?.message || "Could not save festival hero."); } finally { setSaving(false); }
  }

  async function updateEventTheme(id: string, hero_theme: string) {
    const { error } = await supabase.from("events").update({ hero_theme }).eq("id", id);
    if (error) setMessage(`Theme update failed: ${error.message}`); else { setMessage("Featured event theme updated."); await loadContent(); }
  }

  function editBanner(row: any) { setEditingBannerId(row.id); setBannerForm({ ...emptyBanner, ...row, start_date: normalizeDate(row.start_date), end_date: normalizeDate(row.end_date) }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function editFestival(row: any) { setEditingFestivalId(row.id); setFestivalForm({ ...emptyFestival, ...row, start_date: normalizeDate(row.start_date), end_date: normalizeDate(row.end_date) }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function toggle(table: string, row: any) { const { error } = await supabase.from(table).update({ active: !row.active }).eq("id", row.id); if (error) setMessage(error.message); else await loadContent(); }
  async function remove(table: string, id: string) { if (!window.confirm("Delete this hero item?")) return; const { error } = await supabase.from(table).delete().eq("id", id); if (error) setMessage(error.message); else await loadContent(); }

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="mx-auto max-w-7xl px-6 py-10"><h1 className="text-4xl font-black">Hero Management</h1><p className="mt-2 text-slate-300">Manage hero content and choose a visual theme for every rotating item.</p>{message && <div className="mt-6 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}{loading && <div className="mt-8 rounded-2xl bg-white/10 p-6">Loading...</div>}{!loading && !canAccess && <div className="mt-8 rounded-2xl bg-white p-8 text-slate-950">Admin access required.</div>}{!loading && canAccess && <div className="mt-8 space-y-8">
    <section className="grid gap-6 xl:grid-cols-[430px_1fr]"><div className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">{editingBannerId ? "Edit Banner" : "Add Banner"}</h2><div className="mt-5 grid gap-4"><input className="rounded-xl border p-3" placeholder="Title" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} /><textarea className="rounded-xl border p-3" placeholder="Subtitle" value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} /><input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} /><input className="rounded-xl border p-3" placeholder="Image URL" value={bannerForm.image_url} onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })} /><label className="font-bold">Hero Theme<ThemeSelect value={bannerForm.theme} onChange={(theme) => setBannerForm({ ...bannerForm, theme })} /></label><div className="grid grid-cols-2 gap-3"><input className="rounded-xl border p-3" placeholder="Button text" value={bannerForm.button_text} onChange={(e) => setBannerForm({ ...bannerForm, button_text: e.target.value })} /><input className="rounded-xl border p-3" placeholder="Button URL" value={bannerForm.button_url} onChange={(e) => setBannerForm({ ...bannerForm, button_url: e.target.value })} /></div><div className="grid grid-cols-2 gap-3"><input type="date" className="rounded-xl border p-3" value={bannerForm.start_date} onChange={(e) => setBannerForm({ ...bannerForm, start_date: e.target.value })} /><input type="date" className="rounded-xl border p-3" value={bannerForm.end_date} onChange={(e) => setBannerForm({ ...bannerForm, end_date: e.target.value })} /></div><button onClick={saveBanner} disabled={saving} className="rounded-xl bg-pink-600 p-3 font-black text-white">Save Banner</button></div></div><div className="grid gap-4 md:grid-cols-2">{banners.map((row) => <article key={row.id} className="rounded-2xl bg-white p-5 text-slate-950"><div className="h-40 overflow-hidden rounded-xl bg-slate-100">{row.image_url && <img src={row.image_url} alt="" className="h-full w-full object-cover" />}</div><h3 className="mt-4 text-xl font-black">{row.title}</h3><p className="text-sm text-slate-500">Theme: {titleCase(row.theme || "fallback")}</p><div className="mt-4 flex gap-2"><button onClick={() => editBanner(row)} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white">Edit</button><button onClick={() => toggle("homepage_hero_banners", row)} className="rounded-lg border px-3 py-2 text-sm font-bold">{row.active ? "Disable" : "Enable"}</button><button onClick={() => remove("homepage_hero_banners", row.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600">Delete</button></div></article>)}</div></section>
    <section className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Featured Event Themes</h2><p className="mt-1 text-sm text-slate-500">These events automatically appear in the homepage hero when marked featured.</p><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{featuredEvents.map((row) => <article key={row.id} className="rounded-2xl border p-4"><h3 className="font-black">{row.title}</h3><p className="mb-3 text-sm text-slate-500">{normalizeDate(row.date)} · {row.location}</p><ThemeSelect value={row.hero_theme || "fallback"} onChange={(theme) => updateEventTheme(row.id, theme)} /></article>)}</div></section>
    <section className="grid gap-6 xl:grid-cols-[430px_1fr]"><div className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">{editingFestivalId ? "Edit Festival Hero" : "Add Festival Hero"}</h2><div className="mt-5 grid gap-4"><input className="rounded-xl border p-3" placeholder="Festival name" value={festivalForm.festival_name} onChange={(e) => setFestivalForm({ ...festivalForm, festival_name: e.target.value })} /><input className="rounded-xl border p-3" placeholder="Festival key" value={festivalForm.festival_key} onChange={(e) => setFestivalForm({ ...festivalForm, festival_key: e.target.value })} /><input className="rounded-xl border p-3" placeholder="Hero title" value={festivalForm.title} onChange={(e) => setFestivalForm({ ...festivalForm, title: e.target.value })} /><textarea className="rounded-xl border p-3" placeholder="Subtitle" value={festivalForm.subtitle} onChange={(e) => setFestivalForm({ ...festivalForm, subtitle: e.target.value })} /><input type="file" accept="image/*" onChange={(e) => setFestivalFile(e.target.files?.[0] || null)} /><input className="rounded-xl border p-3" placeholder="Image URL" value={festivalForm.image_url} onChange={(e) => setFestivalForm({ ...festivalForm, image_url: e.target.value })} /><label className="font-bold">Hero Theme<ThemeSelect value={festivalForm.theme} onChange={(theme) => setFestivalForm({ ...festivalForm, theme })} /></label><div className="grid grid-cols-2 gap-3"><input type="date" className="rounded-xl border p-3" value={festivalForm.start_date} onChange={(e) => setFestivalForm({ ...festivalForm, start_date: e.target.value })} /><input type="date" className="rounded-xl border p-3" value={festivalForm.end_date} onChange={(e) => setFestivalForm({ ...festivalForm, end_date: e.target.value })} /></div><button onClick={saveFestival} disabled={saving} className="rounded-xl bg-pink-600 p-3 font-black text-white">Save Festival Hero</button></div></div><div className="grid gap-4 md:grid-cols-2">{festivals.map((row) => <article key={row.id} className="rounded-2xl bg-white p-5 text-slate-950"><h3 className="text-xl font-black">{row.festival_name}</h3><p className="text-sm text-slate-500">Theme: {titleCase(row.theme || "festival")}</p><div className="mt-4 flex gap-2"><button onClick={() => editFestival(row)} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white">Edit</button><button onClick={() => toggle("festival_hero_assets", row)} className="rounded-lg border px-3 py-2 text-sm font-bold">{row.active ? "Disable" : "Enable"}</button><button onClick={() => remove("festival_hero_assets", row.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600">Delete</button></div></article>)}</div></section>
  </div>}</div></main>;
}

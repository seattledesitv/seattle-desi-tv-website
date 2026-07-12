"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";
import { uploadFileToCloudinary } from "../../lib/cloudinaryUpload";

const supabase = getSupabaseBrowserClient();
const THEMES = ["fallback", "gold", "pink", "blue", "festival", "cinematic", "emerald"];
const LAYOUTS = [
  { key: "image_focus", name: "Image Focus", note: "Uses the uploaded image as the main background with minimal styling." },
  { key: "classic", name: "Classic", note: "Traditional text-left hero with event posters shown separately." },
  { key: "premium", name: "Premium Framed", note: "Glass frame, poster card and stronger visual depth." },
  { key: "cinematic", name: "Cinematic", note: "Large centered headline over a full-width background." },
];
const emptyBanner = { title: "", subtitle: "", image_url: "", button_text: "", button_url: "", banner_type: "marketing", theme: "fallback", start_date: "", end_date: "", display_order: 0, active: true };
const emptyFestival = { festival_name: "", festival_key: "", title: "", subtitle: "", image_url: "", theme: "festival", start_date: "", end_date: "", active: true };

function normalizeDate(value?: string | null) { return value ? String(value).split("T")[0] : ""; }
function titleCase(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function FieldLabel({ children }: { children: React.ReactNode }) { return <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">{children}</span>; }
function ThemeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <select value={value || "fallback"} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-pink-400">{THEMES.map((theme) => <option key={theme} value={theme}>{theme === "fallback" ? "Fallback — use image naturally" : titleCase(theme)}</option>)}</select>; }
function StatusPill({ active }: { active: boolean }) { return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{active ? "Active" : "Disabled"}</span>; }

export default function HeroManagementV3() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [banners, setBanners] = useState<any[]>([]);
  const [festivals, setFestivals] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [layoutStyle, setLayoutStyle] = useState("image_focus");
  const [bannerForm, setBannerForm] = useState<any>(emptyBanner);
  const [festivalForm, setFestivalForm] = useState<any>(emptyFestival);
  const [editingBannerId, setEditingBannerId] = useState("");
  const [editingFestivalId, setEditingFestivalId] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [festivalFile, setFestivalFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"style" | "banners" | "events" | "festivals">("style");
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadContent() {
    setMessage("Refreshing hero items...");
    const [bannerResult, festivalResult, eventResult, settingsResult] = await Promise.all([
      supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,button_text,button_url,banner_type,theme,start_date,end_date,display_order,active").order("display_order", { ascending: true }),
      supabase.from("festival_hero_assets").select("id,festival_name,festival_key,title,subtitle,image_url,theme,start_date,end_date,active").order("start_date", { ascending: true }),
      supabase.from("events").select("id,title,date,location,image,image_urls,featured,featured_order,hero_theme").eq("featured", true).order("featured_order", { ascending: true }),
      supabase.from("homepage_hero_settings").select("layout_style").eq("id", "default").maybeSingle(),
    ]);
    const errors = [bannerResult.error?.message, festivalResult.error?.message, eventResult.error?.message].filter(Boolean);
    setBanners(bannerResult.data || []); setFestivals(festivalResult.data || []); setFeaturedEvents(eventResult.data || []);
    if (!settingsResult.error && settingsResult.data?.layout_style) setLayoutStyle(settingsResult.data.layout_style);
    setMessage(errors.length ? errors.join(" · ") : settingsResult.error ? "Run supabase/homepage-hero-settings.sql to enable global layout choices." : "");
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser(); const currentUser = data?.user || null; setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage hero content."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser); setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This page is for admins only."); setLoading(false); return; }
    await loadContent(); setLoading(false);
  }

  function resetBanner() { setEditingBannerId(""); setBannerForm(emptyBanner); setBannerFile(null); }
  function resetFestival() { setEditingFestivalId(""); setFestivalForm(emptyFestival); setFestivalFile(null); }

  async function saveLayout() {
    setSaving(true);
    const { error } = await supabase.from("homepage_hero_settings").upsert({ id: "default", layout_style: layoutStyle, updated_at: new Date().toISOString(), updated_by: user?.id || null });
    setMessage(error ? `Layout save failed: ${error.message}` : "Homepage hero layout saved."); setSaving(false);
  }

  async function saveBanner() {
    if (!bannerForm.title.trim()) { setMessage("Banner title is required."); return; }
    setSaving(true);
    try {
      let imageUrl = bannerForm.image_url || ""; if (bannerFile) imageUrl = await uploadFileToCloudinary(bannerFile);
      const payload = { ...bannerForm, image_url: imageUrl, start_date: bannerForm.start_date || null, end_date: bannerForm.end_date || null, display_order: Number(bannerForm.display_order || 0), updated_at: new Date().toISOString() };
      const result = editingBannerId ? await supabase.from("homepage_hero_banners").update(payload).eq("id", editingBannerId) : await supabase.from("homepage_hero_banners").insert(payload);
      if (result.error) throw result.error; resetBanner(); setMessage("Hero banner saved successfully."); await loadContent();
    } catch (error: any) { setMessage(error?.message || "Could not save banner."); } finally { setSaving(false); }
  }

  async function saveFestival() {
    if (!festivalForm.festival_name.trim() || !festivalForm.festival_key.trim()) { setMessage("Festival name and key are required."); return; }
    setSaving(true);
    try {
      let imageUrl = festivalForm.image_url || ""; if (festivalFile) imageUrl = await uploadFileToCloudinary(festivalFile);
      const payload = { ...festivalForm, image_url: imageUrl, start_date: festivalForm.start_date || null, end_date: festivalForm.end_date || null, updated_at: new Date().toISOString() };
      const result = editingFestivalId ? await supabase.from("festival_hero_assets").update(payload).eq("id", editingFestivalId) : await supabase.from("festival_hero_assets").insert(payload);
      if (result.error) throw result.error; resetFestival(); setMessage("Festival hero saved successfully."); await loadContent();
    } catch (error: any) { setMessage(error?.message || "Could not save festival hero."); } finally { setSaving(false); }
  }

  async function updateEventTheme(id: string, hero_theme: string) { const { error } = await supabase.from("events").update({ hero_theme }).eq("id", id); setMessage(error ? `Theme update failed: ${error.message}` : "Featured event theme updated."); if (!error) await loadContent(); }
  function editBanner(row: any) { setEditingBannerId(row.id); setBannerForm({ ...emptyBanner, ...row, start_date: normalizeDate(row.start_date), end_date: normalizeDate(row.end_date) }); setTab("banners"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function editFestival(row: any) { setEditingFestivalId(row.id); setFestivalForm({ ...emptyFestival, ...row, start_date: normalizeDate(row.start_date), end_date: normalizeDate(row.end_date) }); setTab("festivals"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function toggle(table: string, row: any) { const { error } = await supabase.from(table).update({ active: !row.active }).eq("id", row.id); setMessage(error ? error.message : "Hero status updated."); if (!error) await loadContent(); }
  async function remove(table: string, id: string) { if (!window.confirm("Delete this hero item?")) return; const { error } = await supabase.from(table).delete().eq("id", id); setMessage(error ? error.message : "Hero item deleted."); if (!error) await loadContent(); }

  useEffect(() => { init(); }, []);
  const totalItems = banners.length + featuredEvents.length + festivals.length;
  const activeItems = useMemo(() => banners.filter((row) => row.active).length + festivals.filter((row) => row.active).length + featuredEvents.length, [banners, festivals, featuredEvents]);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-pink-300">Website Management</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Hero Management</h1><p className="mt-2 max-w-2xl text-slate-300">Choose the overall hero layout, then customize the accent theme for each rotating item.</p></div><button onClick={loadContent} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh Items</button></div>
    {message && <div className="mt-5 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}
    {loading && <div className="mt-8 rounded-2xl bg-white/10 p-6">Loading...</div>}
    {!loading && !canAccess && <div className="mt-8 rounded-2xl bg-white p-8 text-slate-950">Admin access required.</div>}
    {!loading && canAccess && <>
      <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5"><p className="text-xs font-black uppercase text-slate-400">Total hero items</p><p className="mt-2 text-3xl font-black">{totalItems}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5"><p className="text-xs font-black uppercase text-slate-400">Currently active</p><p className="mt-2 text-3xl font-black text-emerald-300">{activeItems}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5"><p className="text-xs font-black uppercase text-slate-400">Current layout</p><p className="mt-2 text-xl font-black text-pink-300">{titleCase(layoutStyle)}</p></div></div>
      <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-2">{([['style','Hero Layout',null],['banners','Marketing Banners',banners.length],['events','Featured Events',featuredEvents.length],['festivals','Festival Heroes',festivals.length]] as const).map(([key,label,count]) => <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-4 py-3 text-sm font-black transition ${tab === key ? "bg-pink-600 text-white" : "text-slate-300 hover:bg-white/10"}`}>{label}{count !== null && <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">{count}</span>}</button>)}</div>

      {tab === "style" && <section className="mt-6 rounded-3xl bg-white p-6 text-slate-950"><div className="max-w-3xl"><p className="text-xs font-black uppercase text-pink-600">Whole hero section</p><h2 className="mt-1 text-3xl font-black">Choose a global layout</h2><p className="mt-2 text-slate-600">This controls the structure of the entire homepage hero. Individual item themes still control accent colors. Fallback means the image itself stays dominant without a colored theme overlay.</p></div><div className="mt-6 grid gap-4 md:grid-cols-2">{LAYOUTS.map((layout) => <button key={layout.key} onClick={() => setLayoutStyle(layout.key)} className={`rounded-2xl border-2 p-5 text-left transition ${layoutStyle === layout.key ? "border-pink-500 bg-pink-50" : "border-slate-200 hover:border-slate-400"}`}><div className="flex items-center justify-between"><h3 className="text-xl font-black">{layout.name}</h3><span className={`h-4 w-4 rounded-full border-4 ${layoutStyle === layout.key ? "border-pink-600 bg-pink-600" : "border-slate-300"}`} /></div><p className="mt-2 text-sm text-slate-600">{layout.note}</p></button>)}</div><button onClick={saveLayout} disabled={saving} className="mt-6 rounded-xl bg-pink-600 px-6 py-4 font-black text-white disabled:opacity-50">{saving ? "Saving..." : "Save Hero Layout"}</button></section>}

      {tab === "banners" && <section className="mt-6 grid gap-6 xl:grid-cols-[390px_1fr]"><EditorCard title={editingBannerId ? "Edit Banner" : "Add Banner"} onCancel={editingBannerId ? resetBanner : undefined}><label><FieldLabel>Title</FieldLabel><input className="w-full rounded-xl border p-3" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} /></label><label><FieldLabel>Subtitle</FieldLabel><textarea className="min-h-24 w-full rounded-xl border p-3" value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} /></label><label><FieldLabel>Upload image</FieldLabel><input className="w-full rounded-xl border p-3 text-sm" type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} /></label><label><FieldLabel>Image URL</FieldLabel><input className="w-full rounded-xl border p-3" value={bannerForm.image_url} onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })} /></label><label><FieldLabel>Item accent theme</FieldLabel><ThemeSelect value={bannerForm.theme} onChange={(theme) => setBannerForm({ ...bannerForm, theme })} /></label><div className="grid grid-cols-2 gap-3"><input className="rounded-xl border p-3" placeholder="Button text" value={bannerForm.button_text} onChange={(e) => setBannerForm({ ...bannerForm, button_text: e.target.value })} /><input className="rounded-xl border p-3" placeholder="Button URL" value={bannerForm.button_url} onChange={(e) => setBannerForm({ ...bannerForm, button_url: e.target.value })} /></div><div className="grid grid-cols-2 gap-3"><input type="date" className="rounded-xl border p-3" value={bannerForm.start_date} onChange={(e) => setBannerForm({ ...bannerForm, start_date: e.target.value })} /><input type="date" className="rounded-xl border p-3" value={bannerForm.end_date} onChange={(e) => setBannerForm({ ...bannerForm, end_date: e.target.value })} /></div><button onClick={saveBanner} disabled={saving} className="rounded-xl bg-pink-600 p-4 font-black text-white">{editingBannerId ? "Update Banner" : "Create Banner"}</button></EditorCard><ItemGrid rows={banners} type="banner" edit={editBanner} toggle={toggle} remove={remove} /></section>}

      {tab === "events" && <section className="mt-6 rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Featured Event Themes</h2><p className="mt-1 text-sm text-slate-500">Choose an accent for each featured event. Select Fallback to keep the event image visually dominant.</p><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{featuredEvents.map((row) => { const image = row.image || row.image_urls?.[0]; return <article key={row.id} className="overflow-hidden rounded-2xl border"><div className="h-36 bg-slate-100">{image ? <img src={image} alt={row.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center font-black text-slate-400">Featured Event</div>}</div><div className="p-4"><h3 className="font-black">{row.title}</h3><p className="mb-4 mt-1 text-sm text-slate-500">{normalizeDate(row.date)} · {row.location || "Location TBD"}</p><ThemeSelect value={row.hero_theme || "fallback"} onChange={(theme) => updateEventTheme(row.id, theme)} /></div></article>; })}</div></section>}

      {tab === "festivals" && <section className="mt-6 grid gap-6 xl:grid-cols-[390px_1fr]"><EditorCard title={editingFestivalId ? "Edit Festival Hero" : "Add Festival Hero"} onCancel={editingFestivalId ? resetFestival : undefined}><input className="rounded-xl border p-3" placeholder="Festival name" value={festivalForm.festival_name} onChange={(e) => setFestivalForm({ ...festivalForm, festival_name: e.target.value })} /><input className="rounded-xl border p-3" placeholder="Festival key" value={festivalForm.festival_key} onChange={(e) => setFestivalForm({ ...festivalForm, festival_key: e.target.value })} /><input className="rounded-xl border p-3" placeholder="Hero title" value={festivalForm.title} onChange={(e) => setFestivalForm({ ...festivalForm, title: e.target.value })} /><textarea className="min-h-24 rounded-xl border p-3" placeholder="Subtitle" value={festivalForm.subtitle} onChange={(e) => setFestivalForm({ ...festivalForm, subtitle: e.target.value })} /><input className="rounded-xl border p-3 text-sm" type="file" accept="image/*" onChange={(e) => setFestivalFile(e.target.files?.[0] || null)} /><input className="rounded-xl border p-3" placeholder="Image URL" value={festivalForm.image_url} onChange={(e) => setFestivalForm({ ...festivalForm, image_url: e.target.value })} /><ThemeSelect value={festivalForm.theme} onChange={(theme) => setFestivalForm({ ...festivalForm, theme })} /><div className="grid grid-cols-2 gap-3"><input type="date" className="rounded-xl border p-3" value={festivalForm.start_date} onChange={(e) => setFestivalForm({ ...festivalForm, start_date: e.target.value })} /><input type="date" className="rounded-xl border p-3" value={festivalForm.end_date} onChange={(e) => setFestivalForm({ ...festivalForm, end_date: e.target.value })} /></div><button onClick={saveFestival} disabled={saving} className="rounded-xl bg-pink-600 p-4 font-black text-white">{editingFestivalId ? "Update Festival Hero" : "Create Festival Hero"}</button></EditorCard><ItemGrid rows={festivals} type="festival" edit={editFestival} toggle={toggle} remove={remove} /></section>}
    </>}
  </div></main>;
}

function EditorCard({ title, onCancel, children }: { title: string; onCancel?: () => void; children: React.ReactNode }) { return <div className="h-fit rounded-3xl bg-white p-6 text-slate-950 xl:sticky xl:top-5"><div className="flex items-center justify-between"><h2 className="text-2xl font-black">{title}</h2>{onCancel && <button onClick={onCancel} className="rounded-lg border px-3 py-2 text-xs font-black">Cancel</button>}</div><div className="mt-5 grid gap-4">{children}</div></div>; }
function ItemGrid({ rows, type, edit, toggle, remove }: { rows: any[]; type: "banner" | "festival"; edit: (row: any) => void; toggle: (table: string, row: any) => void; remove: (table: string, id: string) => void }) { const table = type === "banner" ? "homepage_hero_banners" : "festival_hero_assets"; return <div><h2 className="text-2xl font-black">Existing {type === "banner" ? "Banners" : "Festival Heroes"}</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{rows.map((row) => <article key={row.id} className="overflow-hidden rounded-3xl bg-white text-slate-950 shadow-xl"><div className="relative h-44 bg-slate-100">{row.image_url ? <img src={row.image_url} alt={row.title || row.festival_name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center font-black text-slate-400">No image</div>}<div className="absolute right-3 top-3"><StatusPill active={row.active} /></div></div><div className="p-5"><h3 className="text-xl font-black">{row.title || row.festival_name}</h3><p className="mt-1 text-sm text-slate-500">Theme: {titleCase(row.theme || "fallback")}</p><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => edit(row)} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">Edit</button><button onClick={() => toggle(table, row)} className="rounded-lg border px-4 py-2 text-sm font-black">{row.active ? "Disable" : "Enable"}</button><button onClick={() => remove(table, row.id)} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-black text-red-600">Delete</button></div></div></article>)}</div></div>; }

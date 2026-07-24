"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";
import { uploadFileToCloudinary } from "../../lib/cloudinaryUpload";
import HeroLayoutDesigner from "./HeroLayoutDesigner";

const supabase = getSupabaseBrowserClient();
const THEMES = ["fallback", "gold", "pink", "blue", "festival", "cinematic", "emerald"];
const emptyBanner = { title: "", subtitle: "", image_url: "", button_text: "", button_url: "", banner_type: "marketing", theme: "fallback", start_date: "", end_date: "", display_order: 0, active: true };
const emptyFestival = { festival_name: "", festival_key: "", title: "", subtitle: "", image_url: "", theme: "festival", start_date: "", end_date: "", active: true };

type HeroTab = "marketing" | "events" | "festivals";

function normalizeDate(value?: string | null) { return value ? String(value).split("T")[0] : ""; }
function titleCase(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function isCurrentlyScheduled(row: any) {
  if (!row.active) return false;
  const today = new Date().toISOString().slice(0, 10);
  const start = normalizeDate(row.start_date);
  const end = normalizeDate(row.end_date);
  return (!start || start <= today) && (!end || end >= today);
}
function ThemeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select value={value || "fallback"} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal text-slate-950">{THEMES.map((theme) => <option key={theme} value={theme}>{titleCase(theme)}</option>)}</select>;
}
function StatusPill({ active }: { active: boolean }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{active ? "Active" : "Disabled"}</span>;
}
function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center"><h3 className="text-xl font-black text-slate-950">{title}</h3><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{text}</p></div>;
}

export default function HeroCmsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [activeTab, setActiveTab] = useState<HeroTab>("marketing");
  const [search, setSearch] = useState("");
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

  const filteredBanners = useMemo(() => banners.filter((row) => `${row.title || ""} ${row.subtitle || ""}`.toLowerCase().includes(search.toLowerCase())), [banners, search]);
  const filteredEvents = useMemo(() => featuredEvents.filter((row) => `${row.title || ""} ${row.location || ""}`.toLowerCase().includes(search.toLowerCase())), [featuredEvents, search]);
  const filteredFestivals = useMemo(() => festivals.filter((row) => `${row.festival_name || ""} ${row.title || ""}`.toLowerCase().includes(search.toLowerCase())), [festivals, search]);

  async function loadContent() {
    const [bannerResult, festivalResult, eventResult] = await Promise.all([
      supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,button_text,button_url,banner_type,theme,start_date,end_date,display_order,active").order("display_order", { ascending: true }),
      supabase.from("festival_hero_assets").select("id,festival_name,festival_key,title,subtitle,image_url,theme,start_date,end_date,active").order("start_date", { ascending: true }),
      supabase.from("events").select("id,title,date,location,image,image_urls,featured,featured_order,hero_theme").eq("featured", true).order("featured_order", { ascending: true }),
    ]);
    const error = bannerResult.error || festivalResult.error || eventResult.error;
    if (error) setMessage(error.message || "Could not load hero content.");
    else setMessage("");
    setBanners(bannerResult.data || []);
    setFestivals(festivalResult.data || []);
    setFeaturedEvents(eventResult.data || []);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage hero content."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This page is for admins only."); setLoading(false); return; }
    await loadContent();
    setLoading(false);
  }

  function resetBannerForm() { setEditingBannerId(""); setBannerForm(emptyBanner); setBannerFile(null); }
  function resetFestivalForm() { setEditingFestivalId(""); setFestivalForm(emptyFestival); setFestivalFile(null); }

  async function saveBanner() {
    if (!bannerForm.title.trim()) { setMessage("Banner title is required."); return; }
    setSaving(true);
    try {
      let imageUrl = bannerForm.image_url || "";
      if (bannerFile) imageUrl = await uploadFileToCloudinary(bannerFile);
      const payload = { ...bannerForm, image_url: imageUrl, start_date: bannerForm.start_date || null, end_date: bannerForm.end_date || null, display_order: Number(bannerForm.display_order || 0), updated_at: new Date().toISOString() };
      const result = editingBannerId ? await supabase.from("homepage_hero_banners").update(payload).eq("id", editingBannerId) : await supabase.from("homepage_hero_banners").insert(payload);
      if (result.error) throw result.error;
      resetBannerForm();
      setMessage(editingBannerId ? "Hero banner updated." : "Hero banner created.");
      await loadContent();
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
      resetFestivalForm();
      setMessage(editingFestivalId ? "Festival hero updated." : "Festival hero created.");
      await loadContent();
    } catch (error: any) { setMessage(error?.message || "Could not save festival hero."); } finally { setSaving(false); }
  }

  async function updateEventTheme(id: string, hero_theme: string) {
    const { error } = await supabase.from("events").update({ hero_theme }).eq("id", id);
    if (error) setMessage(`Theme update failed: ${error.message}`); else { setMessage("Featured event theme updated."); await loadContent(); }
  }

  function editBanner(row: any) {
    setActiveTab("marketing");
    setEditingBannerId(row.id);
    setBannerForm({ ...emptyBanner, ...row, start_date: normalizeDate(row.start_date), end_date: normalizeDate(row.end_date) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function editFestival(row: any) {
    setActiveTab("festivals");
    setEditingFestivalId(row.id);
    setFestivalForm({ ...emptyFestival, ...row, start_date: normalizeDate(row.start_date), end_date: normalizeDate(row.end_date) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function toggle(table: string, row: any) {
    const { error } = await supabase.from(table).update({ active: !row.active }).eq("id", row.id);
    if (error) setMessage(error.message); else { setMessage(row.active ? "Hero item disabled." : "Hero item enabled."); await loadContent(); }
  }
  async function remove(table: string, id: string) {
    if (!window.confirm("Delete this hero item? This cannot be undone.")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setMessage(error.message); else { setMessage("Hero item deleted."); await loadContent(); }
  }

  useEffect(() => { init(); }, []);

  const tabs = [
    { key: "marketing" as const, label: "Marketing Banners", count: banners.length },
    { key: "events" as const, label: "Featured Events", count: featuredEvents.length },
    { key: "festivals" as const, label: "Festival Heroes", count: festivals.length },
  ];

  return <main className="min-h-screen bg-slate-950 text-white">
    <StudioHeader />
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-pink-300">Homepage Studio</p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">Hero Management</h1>
          <p className="mt-3 max-w-3xl text-slate-300">Create, edit, schedule, and organize everything that rotates through the homepage hero.</p>
        </div>
        <button onClick={init} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh Content</button>
      </div>

      {message && <div className="mt-6 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}
      {loading && <div className="mt-8 rounded-2xl bg-white/10 p-6">Loading hero content...</div>}
      {!loading && !canAccess && <div className="mt-8 rounded-2xl bg-white p-8 text-slate-950">Admin access required.</div>}

      {!loading && canAccess && <>
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-sm text-slate-300">All Hero Items</p><p className="mt-1 text-4xl font-black">{banners.length + featuredEvents.length + festivals.length}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-sm text-slate-300">Marketing Banners</p><p className="mt-1 text-4xl font-black">{banners.length}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-sm text-slate-300">Featured Events</p><p className="mt-1 text-4xl font-black">{featuredEvents.length}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-sm text-slate-300">Currently Active</p><p className="mt-1 text-4xl font-black">{banners.filter(isCurrentlyScheduled).length + festivals.filter(isCurrentlyScheduled).length}</p></div>
        </section>

        <HeroLayoutDesigner banners={banners} featuredEvents={featuredEvents} festivals={festivals} />

        <section className="mt-8 overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl">
          <div className="border-b border-slate-200 bg-slate-50 px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(""); }} className={`rounded-t-2xl px-5 py-3 font-black transition ${activeTab === tab.key ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:bg-white/70"}`}>{tab.label} <span className="ml-2 rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-700">{tab.count}</span></button>)}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">{tabs.find((tab) => tab.key === activeTab)?.label}</h2>
                <p className="mt-1 text-sm text-slate-500">{activeTab === "marketing" ? "Campaigns, announcements, and editorial promotions." : activeTab === "events" ? "Events marked featured automatically appear here." : "Seasonal and cultural homepage hero content."}</p>
              </div>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="w-full rounded-xl border border-slate-200 px-4 py-3 sm:max-w-xs" />
            </div>

            {activeTab === "marketing" && <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
              <div className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-5 xl:sticky xl:top-6">
                <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black">{editingBannerId ? "Edit Banner" : "New Banner"}</h3>{editingBannerId && <button onClick={resetBannerForm} className="text-sm font-black text-slate-500">Cancel</button>}</div>
                <div className="mt-5 grid gap-4">
                  <label className="text-sm font-bold">Title<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} /></label>
                  <label className="text-sm font-bold">Subtitle<textarea rows={3} className="mt-1 w-full rounded-xl border p-3 font-normal" value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} /></label>
                  <label className="text-sm font-bold">Upload image<input type="file" accept="image/*" className="mt-1 block w-full text-sm font-normal" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} /></label>
                  <label className="text-sm font-bold">Image URL<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={bannerForm.image_url} onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })} /></label>
                  <label className="text-sm font-bold">Hero Theme<div className="mt-1"><ThemeSelect value={bannerForm.theme} onChange={(theme) => setBannerForm({ ...bannerForm, theme })} /></div></label>
                  <div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">Button text<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={bannerForm.button_text} onChange={(e) => setBannerForm({ ...bannerForm, button_text: e.target.value })} /></label><label className="text-sm font-bold">Button URL<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={bannerForm.button_url} onChange={(e) => setBannerForm({ ...bannerForm, button_url: e.target.value })} /></label></div>
                  <div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">Start<input type="date" className="mt-1 w-full rounded-xl border p-3 font-normal" value={bannerForm.start_date} onChange={(e) => setBannerForm({ ...bannerForm, start_date: e.target.value })} /></label><label className="text-sm font-bold">End<input type="date" className="mt-1 w-full rounded-xl border p-3 font-normal" value={bannerForm.end_date} onChange={(e) => setBannerForm({ ...bannerForm, end_date: e.target.value })} /></label></div>
                  <label className="text-sm font-bold">Display order<input type="number" className="mt-1 w-full rounded-xl border p-3 font-normal" value={bannerForm.display_order} onChange={(e) => setBannerForm({ ...bannerForm, display_order: Number(e.target.value) })} /></label>
                  <button onClick={saveBanner} disabled={saving} className="rounded-xl bg-pink-600 p-3 font-black text-white disabled:opacity-50">{saving ? "Saving..." : editingBannerId ? "Update Banner" : "Create Banner"}</button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">{filteredBanners.map((row) => <article key={row.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="h-44 bg-slate-100">{row.image_url ? <img src={row.image_url} alt={row.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm font-bold text-slate-400">No image</div>}</div>
                <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">{row.title}</h3><p className="mt-1 line-clamp-2 text-sm text-slate-500">{row.subtitle || "No subtitle"}</p></div><StatusPill active={Boolean(row.active)} /></div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600"><span className="rounded-full bg-slate-100 px-3 py-1">{titleCase(row.theme || "fallback")}</span><span className="rounded-full bg-slate-100 px-3 py-1">Order {row.display_order ?? 0}</span>{isCurrentlyScheduled(row) && <span className="rounded-full bg-pink-100 px-3 py-1 text-pink-700">Live now</span>}</div>
                <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => editBanner(row)} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white">Edit</button><button onClick={() => toggle("homepage_hero_banners", row)} className="rounded-lg border px-3 py-2 text-sm font-bold">{row.active ? "Disable" : "Enable"}</button><button onClick={() => remove("homepage_hero_banners", row.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600">Delete</button></div></div>
              </article>)}{filteredBanners.length === 0 && <div className="md:col-span-2"><EmptyState title="No marketing banners found" text={search ? "Try a different search term." : "Create your first banner using the editor on the left."} /></div>}</div>
            </div>}

            {activeTab === "events" && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredEvents.map((row) => { const image = Array.isArray(row.image_urls) && row.image_urls.length ? row.image_urls[0] : row.image; return <article key={row.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="h-40 bg-slate-100">{image ? <img src={image} alt={row.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm font-bold text-slate-400">No image</div>}</div><div className="p-5"><h3 className="text-xl font-black">{row.title}</h3><p className="mt-1 text-sm text-slate-500">{normalizeDate(row.date)}{row.location ? ` · ${row.location}` : ""}</p><label className="mt-4 block text-sm font-bold">Hero Theme<div className="mt-1"><ThemeSelect value={row.hero_theme || "fallback"} onChange={(theme) => updateEventTheme(row.id, theme)} /></div></label><a href={`/studio/events/${row.id}`} className="mt-4 inline-block rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white">Open Event</a></div></article>; })}{filteredEvents.length === 0 && <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No featured events found" text={search ? "Try a different search term." : "Mark an event as featured in Event Management and it will appear here."} /></div>}</div>}

            {activeTab === "festivals" && <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
              <div className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-5 xl:sticky xl:top-6"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black">{editingFestivalId ? "Edit Festival Hero" : "New Festival Hero"}</h3>{editingFestivalId && <button onClick={resetFestivalForm} className="text-sm font-black text-slate-500">Cancel</button>}</div><div className="mt-5 grid gap-4">
                <label className="text-sm font-bold">Festival name<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={festivalForm.festival_name} onChange={(e) => setFestivalForm({ ...festivalForm, festival_name: e.target.value })} /></label>
                <label className="text-sm font-bold">Festival key<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={festivalForm.festival_key} onChange={(e) => setFestivalForm({ ...festivalForm, festival_key: e.target.value })} /></label>
                <label className="text-sm font-bold">Hero title<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={festivalForm.title} onChange={(e) => setFestivalForm({ ...festivalForm, title: e.target.value })} /></label>
                <label className="text-sm font-bold">Subtitle<textarea rows={3} className="mt-1 w-full rounded-xl border p-3 font-normal" value={festivalForm.subtitle} onChange={(e) => setFestivalForm({ ...festivalForm, subtitle: e.target.value })} /></label>
                <label className="text-sm font-bold">Upload image<input type="file" accept="image/*" className="mt-1 block w-full text-sm font-normal" onChange={(e) => setFestivalFile(e.target.files?.[0] || null)} /></label>
                <label className="text-sm font-bold">Image URL<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={festivalForm.image_url} onChange={(e) => setFestivalForm({ ...festivalForm, image_url: e.target.value })} /></label>
                <label className="text-sm font-bold">Hero Theme<div className="mt-1"><ThemeSelect value={festivalForm.theme} onChange={(theme) => setFestivalForm({ ...festivalForm, theme })} /></div></label>
                <div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">Start<input type="date" className="mt-1 w-full rounded-xl border p-3 font-normal" value={festivalForm.start_date} onChange={(e) => setFestivalForm({ ...festivalForm, start_date: e.target.value })} /></label><label className="text-sm font-bold">End<input type="date" className="mt-1 w-full rounded-xl border p-3 font-normal" value={festivalForm.end_date} onChange={(e) => setFestivalForm({ ...festivalForm, end_date: e.target.value })} /></label></div>
                <button onClick={saveFestival} disabled={saving} className="rounded-xl bg-pink-600 p-3 font-black text-white disabled:opacity-50">{saving ? "Saving..." : editingFestivalId ? "Update Festival Hero" : "Create Festival Hero"}</button>
              </div></div>
              <div className="grid gap-4 md:grid-cols-2">{filteredFestivals.map((row) => <article key={row.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="h-44 bg-slate-100">{row.image_url ? <img src={row.image_url} alt={row.festival_name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm font-bold text-slate-400">No image</div>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">{row.festival_name}</h3><p className="mt-1 text-sm text-slate-500">{row.title || row.festival_key}</p></div><StatusPill active={Boolean(row.active)} /></div><div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600"><span className="rounded-full bg-slate-100 px-3 py-1">{titleCase(row.theme || "festival")}</span>{isCurrentlyScheduled(row) && <span className="rounded-full bg-pink-100 px-3 py-1 text-pink-700">Live now</span>}</div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => editFestival(row)} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white">Edit</button><button onClick={() => toggle("festival_hero_assets", row)} className="rounded-lg border px-3 py-2 text-sm font-bold">{row.active ? "Disable" : "Enable"}</button><button onClick={() => remove("festival_hero_assets", row.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600">Delete</button></div></div></article>)}{filteredFestivals.length === 0 && <div className="md:col-span-2"><EmptyState title="No festival heroes found" text={search ? "Try a different search term." : "Create your first festival hero using the editor on the left."} /></div>}</div>
            </div>}
          </div>
        </section>
      </>}
    </div>
  </main>;
}

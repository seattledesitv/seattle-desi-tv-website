"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

const defaultSections = [
  { section_key: "home", display_order: 1, enabled: true, title: "Home", subtitle: "Hero section" },
  { section_key: "stats", display_order: 2, enabled: true, title: "Community Impact Stats", subtitle: "Live SDTV platform metrics" },
  { section_key: "events", display_order: 3, enabled: true, title: "Upcoming Events", subtitle: "Approved community events coming up next." },
  { section_key: "businesses", display_order: 4, enabled: true, title: "Featured Businesses", subtitle: "Local businesses approved in the SDTV directory." },
  { section_key: "radio", display_order: 5, enabled: true, title: "Seattle Desi Radio", subtitle: "Listen live and discover radio programming." },
  { section_key: "videos", display_order: 6, enabled: true, title: "Latest YouTube Videos", subtitle: "Latest videos from Seattle Desi TV." },
  { section_key: "featured_social", display_order: 7, enabled: true, title: "Latest From SDTV", subtitle: "Featured reels, interviews and social highlights." },
  { section_key: "social", display_order: 8, enabled: true, title: "Social Media Stats", subtitle: "Followers, views, and videos across SDTV channels." },
  { section_key: "team", display_order: 9, enabled: true, title: "Team Spotlight", subtitle: "Meet some of the community members supporting SDTV." },
  { section_key: "sponsors", display_order: 10, enabled: false, title: "Sponsor Showcase", subtitle: "Sponsor management section." },
  { section_key: "contact", display_order: 11, enabled: true, title: "Get Involved", subtitle: "Volunteer, sponsor, host shows, or request coverage." },
];

const defaultSocial = [
  { platform: "YouTube", followers: 0, views: 0, videos: 0, href: "https://www.youtube.com/@SeattleDesiTV" },
  { platform: "Instagram", followers: 0, views: 0, videos: 0, href: "https://instagram.com/seattledesitv" },
  { platform: "Facebook", followers: 0, views: 0, videos: 0, href: "https://facebook.com/seattledesitv" },
];

export default function StudioHomepagePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading homepage settings...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [sections, setSections] = useState<any[]>([]);
  const [socialRows, setSocialRows] = useState<any[]>([]);
  const canAccess = Boolean(user && isAdminRole(role));

  async function seedDefaults() {
    await supabase.from("homepage_settings").upsert(defaultSections, { onConflict: "section_key" });
    await supabase.from("social_media_stats").upsert(defaultSocial, { onConflict: "platform" });
  }

  async function loadContent() {
    const [sectionResult, socialResult] = await Promise.all([
      supabase.from("homepage_settings").select("section_key,display_order,enabled,title,subtitle").order("display_order", { ascending: true }),
      supabase.from("social_media_stats").select("platform,followers,views,videos,href,updated_at").order("platform", { ascending: true }),
    ]);
    if (!sectionResult.error && Array.isArray(sectionResult.data) && sectionResult.data.length > 0) setSections(sectionResult.data);
    else setSections(defaultSections);
    if (!socialResult.error && Array.isArray(socialResult.data) && socialResult.data.length > 0) setSocialRows(socialResult.data);
    else setSocialRows(defaultSocial);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage homepage settings."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage(`Homepage management requires admin access. Current role: ${nextRole}`); setLoading(false); return; }
    await loadContent();
    setMessage("");
    setLoading(false);
  }

  async function saveSections() {
    setActionMessage("Saving homepage sections...");
    const payload: any[] = sections.map((section, index) => ({ section_key: section.section_key, display_order: Number(section.display_order || index + 1), enabled: Boolean(section.enabled), title: section.title || null, subtitle: section.subtitle || null }));
    const { error } = await supabase.from("homepage_settings").upsert(payload, { onConflict: "section_key" });
    if (error) { setActionMessage(`Could not save sections: ${error.message}`); return; }
    setActionMessage("Homepage sections saved. Refresh the homepage to see changes.");
    await loadContent();
  }

  async function saveSocialStats() {
    setActionMessage("Saving social stats...");
    const payload: any[] = socialRows.map((row) => ({ platform: row.platform, followers: Number(row.followers || 0), views: Number(row.views || 0), videos: Number(row.videos || 0), href: row.href || null, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("social_media_stats").upsert(payload, { onConflict: "platform" });
    if (error) { setActionMessage(`Could not save social stats: ${error.message}`); return; }
    setActionMessage("Social stats saved. Refresh the homepage to see changes.");
    await loadContent();
  }

  async function initializeDefaults() {
    setActionMessage("Creating default homepage settings...");
    await seedDefaults();
    await loadContent();
    setActionMessage("Default homepage settings created/updated.");
  }

  function updateSection(index: number, field: string, value: any) { setSections((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item)); }
  function moveSection(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= sections.length) return; const next = [...sections]; [next[index], next[target]] = [next[target], next[index]]; setSections(next.map((item, itemIndex) => ({ ...item, display_order: itemIndex + 1 }))); }
  function updateSocial(index: number, field: string, value: any) { setSocialRows((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item)); }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div><h1 className="text-4xl md:text-5xl font-black">Homepage CMS</h1><p className="text-slate-300 mt-2">Reorder sections, enable or disable homepage content, and update social stats.</p>{user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role}</p>}</div>
          <div className="flex flex-wrap gap-3"><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button><a href="/studio/featured-social" className="bg-white/10 border border-white/10 text-white px-5 py-3 rounded-xl font-bold">Manage Social Highlights</a><a href="/" target="_blank" rel="noreferrer" className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold">Preview Homepage</a></div>
        </div>
        {loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}
        {!loading && canAccess && <div className="space-y-8">
          {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}
          <section className="bg-white text-slate-950 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5"><div><h2 className="text-2xl font-black">Homepage Sections</h2><p className="text-gray-600 text-sm mt-1">Move sections up/down, hide sections, and customize headings. Use “Manage Social Highlights” to add the cards used by Latest From SDTV.</p></div><div className="flex gap-3"><button onClick={initializeDefaults} className="border px-4 py-2 rounded-xl font-bold">Seed Defaults</button><button onClick={saveSections} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-bold">Save Sections</button></div></div>
            <div className="grid gap-4">{sections.map((section, index) => <article key={section.section_key} className="border rounded-2xl p-4 grid lg:grid-cols-[160px_120px_1fr_1fr_auto] gap-3 items-center"><div><p className="font-black">{section.section_key}</p><p className="text-xs text-gray-500">Order {section.display_order}</p></div><label className="flex items-center gap-2 font-bold text-sm"><input type="checkbox" checked={section.enabled !== false} onChange={(event) => updateSection(index, "enabled", event.target.checked)} /> Enabled</label><input className="border rounded-lg p-3" placeholder="Title" value={section.title || ""} onChange={(event) => updateSection(index, "title", event.target.value)} /><input className="border rounded-lg p-3" placeholder="Subtitle" value={section.subtitle || ""} onChange={(event) => updateSection(index, "subtitle", event.target.value)} /><div className="flex gap-2 justify-end"><button onClick={() => moveSection(index, -1)} className="border px-3 py-2 rounded-lg font-bold">Up</button><button onClick={() => moveSection(index, 1)} className="border px-3 py-2 rounded-lg font-bold">Down</button></div></article>)}</div>
          </section>
          <section className="bg-white text-slate-950 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5"><div><h2 className="text-2xl font-black">Social Media Stats</h2><p className="text-gray-600 text-sm mt-1">Update followers, views, videos, and links shown on the homepage.</p></div><button onClick={saveSocialStats} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-bold">Save Social Stats</button></div>
            <div className="grid gap-4">{socialRows.map((row, index) => <article key={row.platform} className="border rounded-2xl p-4 grid lg:grid-cols-[160px_1fr_1fr_1fr_2fr] gap-3 items-center"><input className="border rounded-lg p-3 font-bold" value={row.platform || ""} onChange={(event) => updateSocial(index, "platform", event.target.value)} /><input className="border rounded-lg p-3" type="number" placeholder="Followers" value={row.followers || 0} onChange={(event) => updateSocial(index, "followers", event.target.value)} /><input className="border rounded-lg p-3" type="number" placeholder="Views" value={row.views || 0} onChange={(event) => updateSocial(index, "views", event.target.value)} /><input className="border rounded-lg p-3" type="number" placeholder="Videos" value={row.videos || 0} onChange={(event) => updateSocial(index, "videos", event.target.value)} /><input className="border rounded-lg p-3" placeholder="URL" value={row.href || ""} onChange={(event) => updateSocial(index, "href", event.target.value)} /></article>)}</div>
          </section>
        </div>}
      </div>
    </main>
  );
}

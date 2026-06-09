"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import { getSupabaseBrowserClient } from "./lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const SPONSOR_TIERS = ["Gold Sponsor", "Silver Sponsor", "Community Partner"];

const fallbackSectionSettings = [
  { section_key: "home", display_order: 1, enabled: true },
  { section_key: "stats", display_order: 2, enabled: true },
  { section_key: "events", display_order: 3, enabled: true },
  { section_key: "businesses", display_order: 4, enabled: true },
  { section_key: "radio", display_order: 5, enabled: true },
  { section_key: "videos", display_order: 6, enabled: true },
  { section_key: "social", display_order: 7, enabled: true },
  { section_key: "team", display_order: 8, enabled: true },
  { section_key: "sponsors", display_order: 9, enabled: false },
  { section_key: "contact", display_order: 10, enabled: true },
];

const fallbackVideos = [
  { title: "Seattle Desi TV — Community Stories", description: "Watch community interviews, events, and cultural highlights.", url: "https://www.youtube.com/@SeattleDesiTV", thumbnail: "/hero-sdtv.png" },
  { title: "Events, Interviews & Local Voices", description: "Explore SDTV coverage across the Pacific Northwest.", url: "https://www.youtube.com/@SeattleDesiTV/videos", thumbnail: "/hero-sdtv.png" },
  { title: "Seattle Desi TV Shorts", description: "Quick community moments, reels, and highlights from SDTV.", url: "https://www.youtube.com/@SeattleDesiTV/shorts", thumbnail: "/sdtv-logo.png" },
];

const fallbackSocialStats = [
  { platform: "YouTube", followers: 0, views: 0, videos: 0, href: "https://www.youtube.com/@SeattleDesiTV" },
  { platform: "Instagram", followers: 0, views: 0, videos: 0, href: "https://instagram.com/seattledesitv" },
  { platform: "Facebook", followers: 0, views: 0, videos: 0, href: "https://facebook.com/seattledesitv" },
];

const fallbackHero = [{ id: "default", title: "Seattle Desi TV", subtitle: "Community stories, events, culture, interviews, radio, and media coverage across the Pacific Northwest.", image_url: "/hero-sdtv.png", button_text: "Browse Events", button_url: "/events", badge: "Voice of the Desi Community", display_order: 999 }];

type EventRow = { id: string; title: string; date: string; location: string; image?: string | null; image_urls?: string[] | null };
type BusinessRow = { id: string; name: string; category?: string | null; offer?: string | null; discount?: string | null; image?: string | null; image_urls?: string[] | null };
type TeamRow = { id: string; name: string; title?: string | null; image?: string | null; photo?: string | null; picture?: string | null };
type VideoRow = { id?: string; title: string; description?: string; thumbnail?: string; url: string; publishedAt?: string };
type SocialRow = { platform: string; followers?: number | null; views?: number | null; videos?: number | null; href?: string | null };
type SponsorRow = { id: string; name: string; website?: string | null; logo_url?: string | null; tier?: string | null; display_order?: number | null };
type HeroItem = { id: string; title: string; subtitle?: string | null; image_url?: string | null; button_text?: string | null; button_url?: string | null; badge?: string | null; display_order?: number | null };
type SectionSetting = { section_key: string; display_order?: number | null; enabled?: boolean | null; title?: string | null; subtitle?: string | null };
type Counts = { events: number; businesses: number; coverage: number; team: number; radio: number };

const emptyCounts: Counts = { events: 0, businesses: 0, coverage: 0, team: 0, radio: 0 };
function firstImage(row: any) { if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0]; return row?.image || row?.photo || row?.picture || ""; }
function formatDate(value?: string | null) { if (!value) return ""; const date = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(); }
function formatNumber(value?: number | null) { return Number(value || 0).toLocaleString(); }
function isExternal(href: string) { return href.startsWith("http"); }
function isWithinDateWindow(row: any, today: string) { return (!row.start_date || row.start_date <= today) && (!row.end_date || row.end_date >= today); }

function StatCard({ label, value, note, href }: { label: string; value: string | number; note: string; href?: string }) {
  const card = <div className="rounded-2xl bg-white border shadow-sm p-5 h-full"><p className="text-sm font-black uppercase tracking-wide text-gray-500">{label}</p><p className="text-3xl font-black text-pink-600 mt-2">{value}</p><p className="text-sm text-gray-600 mt-2">{note}</p></div>;
  return href ? <a href={href} target={isExternal(href) ? "_blank" : undefined} rel={isExternal(href) ? "noreferrer" : undefined}>{card}</a> : card;
}

function SponsorCard({ sponsor }: { sponsor: SponsorRow }) {
  const card = <div className="bg-white border rounded-2xl p-5 h-full text-center shadow-sm hover:shadow-xl transition"><div className="h-24 rounded-xl bg-slate-50 grid place-items-center overflow-hidden mb-4">{sponsor.logo_url ? <img src={sponsor.logo_url} alt={sponsor.name} className="max-h-20 max-w-full object-contain p-2" /> : <span className="text-pink-600 font-black">SDTV</span>}</div><h3 className="font-black text-lg">{sponsor.name}</h3>{sponsor.website && <p className="text-pink-600 text-sm font-bold mt-2">Visit Sponsor</p>}</div>;
  return sponsor.website ? <a href={sponsor.website} target="_blank" rel="noreferrer">{card}</a> : card;
}

function HeroCarousel({ items }: { items: HeroItem[] }) {
  const heroItems = items.length > 0 ? items : fallbackHero;
  const [current, setCurrent] = useState(0);
  useEffect(() => { if (current >= heroItems.length) setCurrent(0); }, [current, heroItems.length]);
  useEffect(() => { if (heroItems.length <= 1) return; const timer = setInterval(() => setCurrent((value) => (value + 1) % heroItems.length), 6000); return () => clearInterval(timer); }, [heroItems.length]);
  const item = heroItems[current] || fallbackHero[0];
  const image = item.image_url || "/hero-sdtv.png";
  const isEventHero = String(item.id || "").startsWith("event-");
  const previous = () => setCurrent((value) => (value - 1 + heroItems.length) % heroItems.length);
  const next = () => setCurrent((value) => (value + 1) % heroItems.length);

  return (
    <section key="home" className="relative overflow-hidden bg-slate-950 text-white min-h-[560px]">
      <div className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${isEventHero ? "opacity-35 blur-sm scale-105" : ""}`} style={{ backgroundImage: `url('${image}')` }} />
      <div className={`absolute inset-0 ${isEventHero ? "bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/70" : "bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/20"}`} />
      <div className={`relative max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24 min-h-[560px] grid gap-10 items-center ${isEventHero ? "lg:grid-cols-[1.05fr_0.95fr]" : "lg:grid-cols-1"}`}>
        <div className="max-w-4xl">
          <p className="text-pink-300 font-black uppercase tracking-wide">{item.badge || "Seattle Desi TV"}</p>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mt-3">{item.title}</h1>
          {item.subtitle && <p className="text-xl text-slate-200 max-w-3xl mt-5">{item.subtitle}</p>}
          <div className="flex flex-wrap gap-4 mt-8">
            {item.button_text && item.button_url && <a href={item.button_url} className="bg-pink-600 text-white px-6 py-4 rounded-xl font-black">{item.button_text}</a>}
            <a href="/radio" className="bg-white text-slate-950 px-6 py-4 rounded-xl font-black">Listen to Radio</a>
            <a href="/businesses" className="border border-white/70 px-6 py-4 rounded-xl font-black">Local Businesses</a>
          </div>
        </div>
        {isEventHero && (
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[360px] aspect-[4/5] rounded-[2rem] border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur overflow-hidden">
              <div className="w-full h-full rounded-[1.5rem] bg-white grid place-items-center overflow-hidden">
                <img src={image} alt={item.title} className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        )}
      </div>
      {heroItems.length > 1 && <><button aria-label="Previous hero" onClick={previous} className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 text-white rounded-full w-11 h-11 font-black">‹</button><button aria-label="Next hero" onClick={next} className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 text-white rounded-full w-11 h-11 font-black">›</button><div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">{heroItems.map((hero, index) => <button key={hero.id} aria-label={`Show hero ${index + 1}`} onClick={() => setCurrent(index)} className={`h-3 rounded-full transition-all ${index === current ? "w-8 bg-pink-400" : "w-3 bg-white/50"}`} />)}</div></>}
    </section>
  );
}

export default function HomePage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [heroItems, setHeroItems] = useState<HeroItem[]>(fallbackHero);
  const [socialRows, setSocialRows] = useState<SocialRow[]>(fallbackSocialStats);
  const [sectionSettings, setSectionSettings] = useState<SectionSetting[]>(fallbackSectionSettings);
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [loadingDynamic, setLoadingDynamic] = useState(true);
  const [videoMessage, setVideoMessage] = useState("Loading latest videos...");

  async function countQuery(query: any) { const result = await query; return result.count || 0; }
  function sectionText(key: string, fallbackTitle: string, fallbackSubtitle: string) { const setting = sectionSettings.find((s) => s.section_key === key); return { title: setting?.title || fallbackTitle, subtitle: setting?.subtitle || fallbackSubtitle }; }

  async function loadDynamicHomepage() {
    setLoadingDynamic(true);
    const today = new Date().toISOString().split("T")[0];
    const [eventsResult, businessesResult, teamResult, settingsResult, socialResult, sponsorsResult, featuredEventsResult, heroBannerResult, festivalResult, eventsCount, businessesCount, coverageCount, teamCount, radioCount] = await Promise.all([
      supabase.from("events").select("id,title,date,location,image,image_urls").eq("status", "approved").gte("date", today).order("date", { ascending: true }).limit(6),
      supabase.from("local_businesses").select("id,name,category,offer,discount,image,image_urls").eq("status", "approved").limit(6),
      supabase.from("team_members").select("id,name,title,image,photo,picture").limit(6),
      supabase.from("homepage_settings").select("section_key,display_order,enabled,title,subtitle").order("display_order", { ascending: true }),
      supabase.from("social_media_stats").select("platform,followers,views,videos,href").order("platform", { ascending: true }),
      supabase.from("homepage_sponsors").select("id,name,website,logo_url,tier,display_order").eq("active", true).order("tier", { ascending: true }).order("display_order", { ascending: true }),
      supabase.from("events").select("id,title,date,location,image,image_urls,featured,featured_order").eq("status", "approved").eq("featured", true).order("featured_order", { ascending: true }).order("date", { ascending: true }).limit(5),
      supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,button_text,button_url,banner_type,start_date,end_date,display_order,active").eq("active", true).order("display_order", { ascending: true }),
      supabase.from("festival_hero_assets").select("id,festival_name,festival_key,title,subtitle,image_url,start_date,end_date,active").eq("active", true).order("start_date", { ascending: true }),
      countQuery(supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "approved")),
      countQuery(supabase.from("local_businesses").select("id", { count: "exact", head: true }).eq("status", "approved")),
      countQuery(supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("assignment_type", "owner_coverage_request")),
      countQuery(supabase.from("team_members").select("id", { count: "exact", head: true })),
      countQuery(supabase.from("radio_team_members").select("id", { count: "exact", head: true })),
    ]);
    setEvents(eventsResult.data || []); setBusinesses(businessesResult.data || []); setTeam(teamResult.data || []);
    if (!settingsResult.error && Array.isArray(settingsResult.data) && settingsResult.data.length > 0) setSectionSettings(settingsResult.data);
    if (!socialResult.error && Array.isArray(socialResult.data) && socialResult.data.length > 0) setSocialRows(socialResult.data);
    if (!sponsorsResult.error && Array.isArray(sponsorsResult.data)) setSponsors(sponsorsResult.data);
    const featuredEventHeroes: HeroItem[] = !featuredEventsResult.error && Array.isArray(featuredEventsResult.data) ? featuredEventsResult.data.map((row: any) => ({ id: `event-${row.id}`, title: row.title, subtitle: `${formatDate(row.date)}${row.location ? ` · ${row.location}` : ""}`, image_url: firstImage(row) || "/hero-sdtv.png", button_text: "View Event", button_url: `/events/${row.id}`, badge: "Featured Event", display_order: Number(row.featured_order || 0) })) : [];
    const marketingHeroes: HeroItem[] = !heroBannerResult.error && Array.isArray(heroBannerResult.data) ? heroBannerResult.data.filter((row: any) => isWithinDateWindow(row, today)).map((row: any) => ({ id: row.id, title: row.title, subtitle: row.subtitle, image_url: row.image_url, button_text: row.button_text, button_url: row.button_url, badge: row.banner_type ? `${String(row.banner_type).toUpperCase()} FEATURE` : "Seattle Desi TV", display_order: row.display_order || 0 })) : [];
    const festivalHeroes: HeroItem[] = !festivalResult.error && Array.isArray(festivalResult.data) ? festivalResult.data.filter((row: any) => isWithinDateWindow(row, today)).map((row: any) => ({ id: row.id, title: row.title || row.festival_name, subtitle: row.subtitle || `Celebrating ${row.festival_name} with the Seattle Desi community.`, image_url: row.image_url, button_text: "Explore Events", button_url: "/events", badge: row.festival_name, display_order: -1 })) : [];
    const mergedHeroes = [...festivalHeroes, ...featuredEventHeroes, ...marketingHeroes].filter((hero) => hero.title).sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
    setHeroItems(mergedHeroes.length > 0 ? mergedHeroes : fallbackHero);
    setCounts({ events: eventsCount, businesses: businessesCount, coverage: coverageCount, team: teamCount, radio: radioCount });
    setLoadingDynamic(false);
  }

  async function loadLatestVideos() { try { const response = await fetch("/api/youtube/latest", { cache: "no-store" }); const result = await response.json(); if (result?.ok && Array.isArray(result.videos) && result.videos.length > 0) { setVideos(result.videos); setVideoMessage("Latest videos from YouTube."); } else { setVideos([]); setVideoMessage(result?.error ? `Showing fallback videos: ${result.error}` : "Showing fallback videos."); } } catch { setVideos([]); setVideoMessage("Showing fallback videos."); } }

  useEffect(() => { loadDynamicHomepage(); loadLatestVideos(); }, []);
  const featuredTeam = useMemo(() => team.slice(0, 4), [team]);
  const videoCards = videos.length > 0 ? videos : fallbackVideos;
  const enabledSections = useMemo(() => sectionSettings.filter((s) => s.enabled !== false).sort((a, b) => Number(a.display_order || 999) - Number(b.display_order || 999)), [sectionSettings]);

  function renderSection(key: string) {
    if (key === "home") return <HeroCarousel key="home" items={heroItems} />;
    if (key === "stats") return <section key="stats" className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="grid md:grid-cols-2 xl:grid-cols-5 gap-5"><StatCard label="Events Published" value={loadingDynamic ? "..." : counts.events} note="Approved community events" href="/events" /><StatCard label="Businesses Listed" value={loadingDynamic ? "..." : counts.businesses} note="Approved local businesses" href="/businesses" /><StatCard label="Coverage Requests" value={loadingDynamic ? "..." : counts.coverage} note="Organizer SDTV coverage asks" href="/studio/coverage" /><StatCard label="Team Members" value={loadingDynamic ? "..." : counts.team} note="Public SDTV team profiles" href="/team" /><StatCard label="Radio Hosts" value={loadingDynamic ? "..." : counts.radio} note="Radio team profiles" href="/radio-team" /></div></section>;
    if (key === "events") { const text = sectionText("events", "Upcoming Events", "Approved community events coming up next."); return <section key="events" className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="flex items-end justify-between gap-4 mb-6"><div><p className="text-pink-600 font-black uppercase tracking-wide">Live from the database</p><h2 className="text-3xl md:text-4xl font-black">{text.title}</h2><p className="text-gray-600 mt-1">{text.subtitle}</p></div><a href="/events" className="hidden md:inline-block text-pink-600 font-black">View all events →</a></div>{events.length === 0 ? <div className="bg-white border rounded-2xl p-8 text-gray-500">No upcoming approved events yet.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{events.map((event) => { const image = firstImage(event); return <a key={event.id} href={`/events/${event.id}`} className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition block">{image ? <img src={image} alt={event.title} className="h-48 w-full object-cover" /> : <div className="h-48 bg-pink-50 grid place-items-center text-pink-600 font-black">Seattle Desi TV</div>}<div className="p-5"><h3 className="text-xl font-black">{event.title}</h3><p className="text-gray-600 mt-2">{formatDate(event.date)} · {event.location}</p></div></a>; })}</div>}</section>; }
    if (key === "businesses") { const text = sectionText("businesses", "Featured Businesses", "Local businesses approved in the SDTV directory."); return <section key="businesses" className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="flex items-end justify-between gap-4 mb-6"><div><p className="text-pink-600 font-black uppercase tracking-wide">Seattle Desi Marketplace</p><h2 className="text-3xl md:text-4xl font-black">{text.title}</h2><p className="text-gray-600 mt-1">{text.subtitle}</p></div><a href="/businesses" className="hidden md:inline-block text-pink-600 font-black">View directory →</a></div>{businesses.length === 0 ? <div className="bg-white border rounded-2xl p-8 text-gray-500">No approved businesses yet.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{businesses.map((business) => { const image = firstImage(business); return <a key={business.id} href="/businesses" className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition block">{image ? <img src={image} alt={business.name} className="h-44 w-full object-cover" /> : <div className="h-44 bg-slate-100 grid place-items-center text-pink-600 font-black">SDTV Local</div>}<div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-xl font-black">{business.name}</h3>{business.category && <span className="text-xs bg-pink-50 text-pink-600 px-3 py-1 rounded-full font-bold uppercase">{business.category}</span>}</div>{business.discount && <p className="text-green-700 font-bold mt-2 text-sm">{business.discount}</p>}{business.offer && <p className="text-gray-600 mt-2 text-sm">{business.offer}</p>}</div></a>; })}</div>}</section>; }
    if (key === "radio") return <section key="radio" className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="bg-white border rounded-3xl p-8 md:p-10 grid md:grid-cols-[1.2fr_auto] gap-6 items-center"><div><p className="text-pink-600 font-black uppercase tracking-wide">Seattle Desi Radio</p><h2 className="text-3xl md:text-4xl font-black">Listen Live</h2><p className="text-gray-600 mt-2">Tune into SDTV Radio for community voices, music, interviews, and cultural programming.</p></div><a href="/radio" className="bg-pink-600 text-white px-6 py-4 rounded-xl font-black text-center">Open Radio Page</a></div></section>;
    if (key === "videos") return <section key="videos" id="videos" className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="bg-slate-950 text-white rounded-3xl p-8 md:p-10"><div className="flex items-end justify-between gap-4 mb-6"><div><p className="text-pink-300 font-black uppercase tracking-wide">Watch SDTV</p><h2 className="text-3xl md:text-4xl font-black">Latest YouTube Videos</h2><p className="text-slate-300 mt-1">{videoMessage}</p></div><a href="https://www.youtube.com/@SeattleDesiTV/videos" target="_blank" rel="noreferrer" className="hidden md:inline-block text-pink-300 font-black">Open YouTube →</a></div><div className="grid md:grid-cols-3 gap-5">{videoCards.map((video) => <a key={video.url} href={video.url} target="_blank" rel="noreferrer" className="bg-white/10 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/15 transition"><div className="h-44 bg-white/5 grid place-items-center overflow-hidden">{video.thumbnail ? <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" /> : <div className="font-black text-pink-300">Seattle Desi TV</div>}</div><div className="p-5"><h3 className="font-black text-xl">{video.title}</h3>{video.publishedAt && <p className="text-pink-200 text-xs font-bold mt-2">{formatDate(video.publishedAt)}</p>}<p className="text-slate-300 text-sm mt-2">{video.description || "Watch this Seattle Desi TV video on YouTube."}</p></div></a>)}</div></div></section>;
    if (key === "social") return <section key="social" id="social" className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="mb-6"><p className="text-pink-600 font-black uppercase tracking-wide">Social Reach</p><h2 className="text-3xl md:text-4xl font-black">Social Media Stats</h2><p className="text-gray-600 mt-1">Followers, views, and videos across SDTV channels.</p></div><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">{socialRows.map((stat) => <StatCard key={stat.platform} label={stat.platform} value={formatNumber(stat.followers)} note={`${formatNumber(stat.views)} views · ${formatNumber(stat.videos)} videos`} href={stat.href || undefined} />)}<StatCard label="All Platforms" value="Multi-channel" note="TV, radio, web, social" href="/portal" /></div></section>;
    if (key === "team") return <section key="team" className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="flex items-end justify-between gap-4 mb-6"><div><p className="text-pink-600 font-black uppercase tracking-wide">People behind SDTV</p><h2 className="text-3xl md:text-4xl font-black">Team Spotlight</h2><p className="text-gray-600 mt-1">Meet some of the community members supporting SDTV.</p></div><a href="/team" className="hidden md:inline-block text-pink-600 font-black">Meet the team →</a></div>{featuredTeam.length === 0 ? <div className="bg-white border rounded-2xl p-8 text-gray-500">Team profiles will appear here after they are added in Studio.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">{featuredTeam.map((member) => { const image = firstImage(member); return <a key={member.id} href="/team" className="bg-white border rounded-2xl p-5 text-center shadow-sm hover:shadow-xl transition">{image ? <img src={image} alt={member.name} className="w-24 h-24 rounded-full object-cover mx-auto" /> : <div className="w-24 h-24 rounded-full bg-pink-50 text-pink-600 grid place-items-center mx-auto font-black">SDTV</div>}<h3 className="text-xl font-black mt-4">{member.name}</h3>{member.title && <p className="text-gray-600 text-sm mt-1">{member.title}</p>}</a>; })}</div>}</section>;
    if (key === "sponsors") return <section key="sponsors" className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="bg-white border rounded-3xl p-8"><p className="text-pink-600 font-black uppercase tracking-wide">Sponsors</p><h2 className="text-3xl md:text-4xl font-black">Our Sponsors</h2><p className="text-gray-600 mt-2 mb-8">Thank you to the partners supporting Seattle Desi TV.</p>{sponsors.length === 0 ? <p className="text-gray-500">Sponsors will appear here after they are added in Studio.</p> : <div className="space-y-8">{SPONSOR_TIERS.map((tier) => { const tierSponsors = sponsors.filter((s) => (s.tier || "Community Partner") === tier); if (tierSponsors.length === 0) return null; return <div key={tier}><h3 className="text-2xl font-black mb-4">{tier}s</h3><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">{tierSponsors.map((sponsor) => <SponsorCard key={sponsor.id} sponsor={sponsor} />)}</div></div>; })}</div>}</div></section>;
    if (key === "contact") { const text = sectionText("contact", "Get Involved", "Volunteer, sponsor, host shows, or request coverage."); return <section key="contact" id="contact" className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="bg-slate-950 text-white rounded-3xl p-8 md:p-10 overflow-hidden relative"><div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 via-transparent to-pink-400/10" /><div className="relative grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center"><div><p className="text-pink-300 font-black uppercase tracking-wide">Join Seattle Desi TV</p><h2 className="text-3xl md:text-5xl font-black mt-2">{text.title}</h2><p className="text-slate-300 mt-4 text-lg">{text.subtitle}</p><p className="text-slate-400 mt-4">Tell us how you would like to support or partner with SDTV. Your request will be saved for the Studio team to review.</p></div><div className="grid sm:grid-cols-2 gap-4"><a href="/contact?interest=volunteer" className="bg-pink-600 text-white p-5 rounded-2xl font-black text-center hover:bg-pink-500 transition">Volunteer</a><a href="/contact?interest=rj-vj" className="bg-white text-slate-950 p-5 rounded-2xl font-black text-center hover:bg-slate-100 transition">Become RJ / VJ</a><a href="/contact?interest=sponsorship" className="bg-white/10 border border-white/10 text-white p-5 rounded-2xl font-black text-center hover:bg-white/15 transition">Sponsorship</a><a href="/contact?interest=coverage" className="bg-white/10 border border-white/10 text-white p-5 rounded-2xl font-black text-center hover:bg-white/15 transition">Request Coverage</a></div></div></div></section>; }
    return null;
  }

  return <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 text-slate-950"><SiteHeader />{enabledSections.map((section) => renderSection(section.section_key))}<SiteFooter /></main>;
}

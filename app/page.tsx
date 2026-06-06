"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "./lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

const publicLinks = [
  ["Events", "/events", "Submit and browse community events."],
  ["Business Directory", "/businesses", "Explore and submit local Desi businesses."],
  ["Team", "/team", "Meet the Seattle Desi TV team."],
  ["Portal", "/portal", "Open the full SDTV navigation hub."],
];

const teamLinks = [
  ["My Assignments", "/my-assignments", "View events you are assigned to cover."],
  ["My Availability", "/my-availability", "Tell SDTV when you are available."],
];

const adminLinks = [
  ["Studio", "/studio", "Admin dashboard."],
  ["Analytics", "/studio/analytics", "View SDTV operational metrics."],
  ["Coverage Requests", "/studio/coverage", "Review organizer coverage requests."],
  ["Pending Crew", "/studio/crew/pending", "Approve team member coverage requests."],
  ["Assignments Calendar", "/studio/assignments-calendar", "See assigned crew and availability."],
  ["Role Requests", "/studio/roles", "Approve public and team member roles."],
];

const fallbackVideos = [
  { title: "Seattle Desi TV — Community Stories", description: "Watch community interviews, events, and cultural highlights.", url: "https://www.youtube.com/@SeattleDesiTV", thumbnail: "/hero-sdtv.png" },
  { title: "Events, Interviews & Local Voices", description: "Explore SDTV coverage across the Pacific Northwest.", url: "https://www.youtube.com/@SeattleDesiTV/videos", thumbnail: "/hero-sdtv.png" },
  { title: "Seattle Desi TV Shorts", description: "Quick community moments, reels, and highlights from SDTV.", url: "https://www.youtube.com/@SeattleDesiTV/shorts", thumbnail: "/sdtv-logo.png" },
];

const socialStats = [
  { label: "YouTube", value: "Growing", note: "Subscribers, views, videos", href: "https://www.youtube.com/@SeattleDesiTV" },
  { label: "Instagram", value: "Active", note: "Followers, reels, stories", href: "https://instagram.com/seattledesitv" },
  { label: "Facebook", value: "Community", note: "Followers, reach, shares", href: "https://facebook.com/seattledesitv" },
  { label: "All Platforms", value: "Multi-channel", note: "TV, radio, web, social", href: "/portal" },
];

type EventRow = { id: string; title: string; date: string; location: string; image?: string | null; image_urls?: string[] | null };
type BusinessRow = { id: string; name: string; address?: string | null; category?: string | null; offer?: string | null; discount?: string | null; image?: string | null; image_urls?: string[] | null };
type TeamRow = { id: string; name: string; title?: string | null; image?: string | null; photo?: string | null; picture?: string | null };
type VideoRow = { id?: string; title: string; description?: string; thumbnail?: string; url: string; publishedAt?: string };
type Counts = { events: number; businesses: number; coverage: number; team: number; radio: number };

const emptyCounts: Counts = { events: 0, businesses: 0, coverage: 0, team: 0, radio: 0 };

function LinkCard({ label, href, description }: { label: string; href: string; description: string }) {
  return <a href={href} className="block rounded-2xl border bg-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition"><h3 className="text-xl font-black text-slate-950">{label}</h3><p className="text-gray-600 mt-2 text-sm">{description}</p></a>;
}

function Section({ title, subtitle, links }: { title: string; subtitle: string; links: string[][] }) {
  return <section className="max-w-7xl mx-auto px-6 md:px-10 py-8"><div className="flex items-end justify-between gap-4 mb-5"><div><h2 className="text-3xl font-black text-slate-950">{title}</h2><p className="text-gray-600 mt-1">{subtitle}</p></div></div><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">{links.map(([label, href, description]) => <LinkCard key={href} label={label} href={href} description={description} />)}</div></section>;
}

function firstImage(row: any) {
  if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row?.image || row?.photo || row?.picture || "";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function StatCard({ label, value, note, href }: { label: string; value: string | number; note: string; href?: string }) {
  const card = <div className="rounded-2xl bg-white border shadow-sm p-5 h-full"><p className="text-sm font-black uppercase tracking-wide text-gray-500">{label}</p><p className="text-3xl font-black text-pink-600 mt-2">{value}</p><p className="text-sm text-gray-600 mt-2">{note}</p></div>;
  return href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>{card}</a> : card;
}

export default function HomePage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [loadingDynamic, setLoadingDynamic] = useState(true);
  const [videoMessage, setVideoMessage] = useState("Loading latest videos...");

  async function countQuery(query: any) {
    const result = await query;
    return result.count || 0;
  }

  async function loadDynamicHomepage() {
    setLoadingDynamic(true);
    const today = new Date().toISOString().split("T")[0];
    const [eventsResult, businessesResult, teamResult, eventsCount, businessesCount, coverageCount, teamCount, radioCount] = await Promise.all([
      supabase.from("events").select("id,title,date,location,image,image_urls").eq("status", "approved").gte("date", today).order("date", { ascending: true }).limit(6),
      supabase.from("local_businesses").select("id,name,address,category,offer,discount,image,image_urls").eq("status", "approved").limit(6),
      supabase.from("team_members").select("id,name,title,image,photo,picture").limit(6),
      countQuery(supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "approved")),
      countQuery(supabase.from("local_businesses").select("id", { count: "exact", head: true }).eq("status", "approved")),
      countQuery(supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("assignment_type", "owner_coverage_request")),
      countQuery(supabase.from("team_members").select("id", { count: "exact", head: true })),
      countQuery(supabase.from("radio_team_members").select("id", { count: "exact", head: true })),
    ]);
    setEvents(eventsResult.data || []);
    setBusinesses(businessesResult.data || []);
    setTeam(teamResult.data || []);
    setCounts({ events: eventsCount, businesses: businessesCount, coverage: coverageCount, team: teamCount, radio: radioCount });
    setLoadingDynamic(false);
  }

  async function loadLatestVideos() {
    try {
      const response = await fetch("/api/youtube/latest", { cache: "no-store" });
      const result = await response.json();
      if (result?.ok && Array.isArray(result.videos) && result.videos.length > 0) {
        setVideos(result.videos);
        setVideoMessage("Latest videos from YouTube.");
      } else {
        setVideos([]);
        setVideoMessage(result?.error ? `Showing fallback videos: ${result.error}` : "Showing fallback videos.");
      }
    } catch {
      setVideos([]);
      setVideoMessage("Showing fallback videos.");
    }
  }

  useEffect(() => { loadDynamicHomepage(); loadLatestVideos(); }, []);

  const featuredTeam = useMemo(() => team.slice(0, 4), [team]);
  const videoCards = videos.length > 0 ? videos : fallbackVideos;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 text-slate-950">
      <div className="bg-[#050b18] text-white text-sm px-6 md:px-10 py-2 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-4 flex-wrap"><a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="hover:text-pink-300">YouTube</a><a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Instagram</a><a href="https://facebook.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Facebook</a><a href="mailto:info@seattledesitv.com" className="hover:text-pink-300">info@seattledesitv.com</a></div><span className="font-bold text-yellow-300">Seattle Desi TV + Radio</span></div>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-6 md:px-10 py-4"><div className="max-w-7xl mx-auto flex items-center justify-between gap-4"><a href="/" className="flex items-center gap-3 font-black text-xl"><img src="/sdtv-logo.png" alt="Seattle Desi TV" className="h-14 w-auto" /><span>Seattle Desi TV</span></a><nav className="hidden lg:flex items-center gap-3 font-bold text-sm"><a href="/events" className="hover:text-pink-600">Events</a><a href="/businesses" className="hover:text-pink-600">Businesses</a><a href="/team" className="hover:text-pink-600">Team</a><a href="#videos" className="hover:text-pink-600">Videos</a><a href="#social" className="hover:text-pink-600">Social Stats</a><a href="/portal" className="hover:text-pink-600">Portal</a><a href="/studio" className="hover:text-pink-600">Studio</a><a href="/login" className="bg-pink-600 text-white px-4 py-2 rounded-xl">Login</a></nav><a href="/portal" className="lg:hidden bg-pink-600 text-white px-4 py-2 rounded-xl font-bold">Menu</a></div></header>
      <section className="relative overflow-hidden bg-slate-950 text-white"><div className="absolute inset-0 opacity-30 bg-cover bg-center" style={{ backgroundImage: "url('/hero-sdtv.png')" }} /><div className="relative max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28"><p className="text-pink-300 font-black uppercase tracking-wide">Voice of the Desi Community</p><h1 className="text-5xl md:text-7xl font-black max-w-4xl leading-tight mt-3">Seattle Desi TV</h1><p className="text-xl text-slate-200 max-w-3xl mt-5">Community stories, events, culture, interviews, radio, and media coverage across the Pacific Northwest.</p><div className="flex flex-wrap gap-4 mt-8"><a href="/events" className="bg-pink-600 text-white px-6 py-4 rounded-xl font-black">Browse Events</a><a href="#videos" className="bg-white text-slate-950 px-6 py-4 rounded-xl font-black">Watch Latest Videos</a><a href="/businesses" className="border border-white/70 px-6 py-4 rounded-xl font-black">Local Businesses</a></div></div></section>
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="grid md:grid-cols-2 xl:grid-cols-5 gap-5"><StatCard label="Events Published" value={loadingDynamic ? "..." : counts.events} note="Approved community events" href="/events" /><StatCard label="Businesses Listed" value={loadingDynamic ? "..." : counts.businesses} note="Approved local businesses" href="/businesses" /><StatCard label="Coverage Requests" value={loadingDynamic ? "..." : counts.coverage} note="Organizer SDTV coverage asks" href="/studio/coverage" /><StatCard label="Team Members" value={loadingDynamic ? "..." : counts.team} note="Public SDTV team profiles" href="/team" /><StatCard label="Radio Hosts" value={loadingDynamic ? "..." : counts.radio} note="Radio team profiles" href="/radio-team" /></div></section>
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="flex items-end justify-between gap-4 mb-6"><div><p className="text-pink-600 font-black uppercase tracking-wide">Live from the database</p><h2 className="text-3xl md:text-4xl font-black">Upcoming Events</h2><p className="text-gray-600 mt-1">Approved community events coming up next.</p></div><a href="/events" className="hidden md:inline-block text-pink-600 font-black">View all events →</a></div>{events.length === 0 ? <div className="bg-white border rounded-2xl p-8 text-gray-500">No upcoming approved events yet.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{events.map((event) => { const image = firstImage(event); return <a key={event.id} href={`/events/${event.id}`} className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition block">{image ? <img src={image} alt={event.title} className="h-48 w-full object-cover" /> : <div className="h-48 bg-pink-50 grid place-items-center text-pink-600 font-black">Seattle Desi TV</div>}<div className="p-5"><h3 className="text-xl font-black">{event.title}</h3><p className="text-gray-600 mt-2">{formatDate(event.date)} · {event.location}</p></div></a>; })}</div>}</section>
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="flex items-end justify-between gap-4 mb-6"><div><p className="text-pink-600 font-black uppercase tracking-wide">Seattle Desi Marketplace</p><h2 className="text-3xl md:text-4xl font-black">Featured Businesses</h2><p className="text-gray-600 mt-1">Local businesses approved in the SDTV directory.</p></div><a href="/businesses" className="hidden md:inline-block text-pink-600 font-black">View directory →</a></div>{businesses.length === 0 ? <div className="bg-white border rounded-2xl p-8 text-gray-500">No approved businesses yet.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{businesses.map((business) => { const image = firstImage(business); return <a key={business.id} href="/businesses" className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition block">{image ? <img src={image} alt={business.name} className="h-44 w-full object-cover" /> : <div className="h-44 bg-slate-100 grid place-items-center text-pink-600 font-black">SDTV Local</div>}<div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-xl font-black">{business.name}</h3>{business.category && <span className="text-xs bg-pink-50 text-pink-600 px-3 py-1 rounded-full font-bold uppercase">{business.category}</span>}</div>{business.discount && <p className="text-green-700 font-bold mt-2 text-sm">{business.discount}</p>}{business.offer && <p className="text-gray-600 mt-2 text-sm">{business.offer}</p>}</div></a>; })}</div>}</section>
      <section id="videos" className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="bg-slate-950 text-white rounded-3xl p-8 md:p-10"><div className="flex items-end justify-between gap-4 mb-6"><div><p className="text-pink-300 font-black uppercase tracking-wide">Watch SDTV</p><h2 className="text-3xl md:text-4xl font-black">Latest YouTube Videos</h2><p className="text-slate-300 mt-1">{videoMessage}</p></div><a href="https://www.youtube.com/@SeattleDesiTV/videos" target="_blank" rel="noreferrer" className="hidden md:inline-block text-pink-300 font-black">Open YouTube →</a></div><div className="grid md:grid-cols-3 gap-5">{videoCards.map((video) => <a key={video.url} href={video.url} target="_blank" rel="noreferrer" className="bg-white/10 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/15 transition"><div className="h-44 bg-white/5 grid place-items-center overflow-hidden">{video.thumbnail ? <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" /> : <div className="font-black text-pink-300">Seattle Desi TV</div>}</div><div className="p-5"><h3 className="font-black text-xl">{video.title}</h3>{video.publishedAt && <p className="text-pink-200 text-xs font-bold mt-2">{formatDate(video.publishedAt)}</p>}<p className="text-slate-300 text-sm mt-2">{video.description || "Watch this Seattle Desi TV video on YouTube."}</p></div></a>)}</div></div></section>
      <section id="social" className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="flex items-end justify-between gap-4 mb-6"><div><p className="text-pink-600 font-black uppercase tracking-wide">Social Reach</p><h2 className="text-3xl md:text-4xl font-black">Social Media Stats</h2><p className="text-gray-600 mt-1">A placeholder dashboard for followers, subscribers, views, reels, and reach across SDTV channels.</p></div></div><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">{socialStats.map((stat) => <StatCard key={stat.label} label={stat.label} value={stat.value} note={stat.note} href={stat.href} />)}</div><p className="text-sm text-gray-500 mt-4">Next phase: connect these cards to live YouTube/Instagram/Facebook metrics or an admin-managed social stats table.</p></section>
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-10"><div className="flex items-end justify-between gap-4 mb-6"><div><p className="text-pink-600 font-black uppercase tracking-wide">People behind SDTV</p><h2 className="text-3xl md:text-4xl font-black">Team Spotlight</h2><p className="text-gray-600 mt-1">Meet some of the community members supporting SDTV.</p></div><a href="/team" className="hidden md:inline-block text-pink-600 font-black">Meet the team →</a></div>{featuredTeam.length === 0 ? <div className="bg-white border rounded-2xl p-8 text-gray-500">Team profiles will appear here after they are added in Studio.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">{featuredTeam.map((member) => { const image = firstImage(member); return <a key={member.id} href="/team" className="bg-white border rounded-2xl p-5 text-center shadow-sm hover:shadow-xl transition">{image ? <img src={image} alt={member.name} className="w-24 h-24 rounded-full object-cover mx-auto" /> : <div className="w-24 h-24 rounded-full bg-pink-50 text-pink-600 grid place-items-center mx-auto font-black">SDTV</div>}<h3 className="text-xl font-black mt-4">{member.name}</h3>{member.title && <p className="text-gray-600 text-sm mt-1">{member.title}</p>}</a>; })}</div>}</section>
      <Section title="Public Website" subtitle="Clean direct routes for community visitors and organizers." links={publicLinks} />
      <Section title="SDTV Team" subtitle="Private operational pages for approved team members." links={teamLinks} />
      <Section title="Studio Admin" subtitle="Admin tools for event, coverage, crew, role, and schedule management." links={adminLinks} />
      <footer className="border-t bg-white px-6 md:px-10 py-8 text-center text-sm text-gray-500">© Seattle Desi TV. Built for community media operations.</footer>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type EventRow = { id: string; title: string; date: string; location: string; image?: string | null; image_urls?: string[] | null };
type BusinessRow = { id: string; name: string; category?: string | null; image?: string | null; image_urls?: string[] | null };
type PersonRow = { id: string; name: string; title?: string | null; image?: string | null; photo?: string | null; picture?: string | null };
type SponsorRow = { id: string; name: string; website?: string | null; logo_url?: string | null };

function firstImage(row: any) {
  if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row?.image || row?.photo || row?.picture || "";
}
function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}
function dateParts(value?: string | null) {
  const d = new Date(`${String(value || "").split("T")[0]}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { month: "JUN", day: "--" };
  return { month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(), day: String(d.getDate()).padStart(2, "0") };
}
function Wave({ dark = false, flip = false }: { dark?: boolean; flip?: boolean }) {
  return <div className={`${flip ? "rotate-180" : ""} ${dark ? "text-[#050b18]" : "text-white"} -mb-px overflow-hidden`}><svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="block h-12 md:h-16 w-full fill-current"><path d="M0 35C180 75 360 0 540 30C720 60 900 78 1080 28C1260-20 1350 18 1440 42V70H0V35Z" /></svg></div>;
}
function EventCard({ event }: { event: EventRow }) {
  const image = firstImage(event); const p = dateParts(event.date);
  return <a href={`/events/${event.id}`} className="group bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-200 hover:-translate-y-1 transition block"><div className="relative h-44 bg-pink-50 overflow-hidden">{image ? <img src={image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition" /> : <div className="h-full grid place-items-center text-pink-600 font-black">SDTV Event</div>}<div className="absolute top-4 left-4 bg-white rounded-xl shadow-lg overflow-hidden text-center"><p className="bg-pink-600 text-white text-xs font-black px-3 py-1">{p.month}</p><p className="text-2xl font-black px-3 py-1">{p.day}</p></div></div><div className="p-5"><h3 className="font-black text-lg line-clamp-1">{event.title}</h3><p className="text-gray-600 text-sm mt-2">◷ {formatDate(event.date)}</p><p className="text-gray-600 text-sm mt-1">⌖ {event.location}</p><span className="inline-block mt-3 bg-pink-50 text-pink-600 rounded-full px-3 py-1 text-xs font-black">Cultural</span></div></a>;
}
function Bars() {
  const bars = [35,52,44,74,60,88,64,45,63,78,53,90,68,43,56,74,48,66,83,54,41,70,58,90];
  return <div className="flex items-end gap-1 h-24 mt-8">{bars.map((h, i) => <span key={i} className="flex-1 rounded-t bg-pink-500 animate-pulse shadow-lg shadow-pink-500/30" style={{ height: `${h}%`, animationDelay: `${i * 55}ms` }} />)}</div>;
}

export default function HomeV2Page() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [counts, setCounts] = useState({ events: 0, businesses: 0, team: 0, radio: 0 });

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split("T")[0];
      const [er, br, tr, sr, ec, bc, tc, rc] = await Promise.all([
        supabase.from("events").select("id,title,date,location,image,image_urls").eq("status", "approved").gte("date", today).order("date", { ascending: true }).limit(4),
        supabase.from("local_businesses").select("id,name,category,image,image_urls").eq("status", "approved").limit(5),
        supabase.from("team_members").select("id,name,title,image,photo,picture").limit(5),
        supabase.from("homepage_sponsors").select("id,name,website,logo_url").eq("active", true).limit(8),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("local_businesses").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("team_members").select("id", { count: "exact", head: true }),
        supabase.from("radio_team_members").select("id", { count: "exact", head: true }),
      ]);
      setEvents(er.data || []); setBusinesses(br.data || []); setPeople(tr.data || []); setSponsors(sr.data || []);
      setCounts({ events: ec.count || 0, businesses: bc.count || 0, team: tc.count || 0, radio: rc.count || 0 });
    }
    load();
  }, []);

  const heroImage = firstImage(events[0]) || "/hero-sdtv.png";
  const sponsorRows = sponsors.length ? sponsors : [{ id: "one", name: "Community Partner" }, { id: "two", name: "Gold Sponsor" }, { id: "three", name: "Media Partner" }];

  return <main className="bg-white text-slate-950 overflow-hidden"><SiteHeader />
    <section className="relative bg-[#050b18] text-white overflow-hidden"><div className="absolute inset-0 bg-cover bg-center opacity-45 scale-105" style={{ backgroundImage: `url('${heroImage}')` }} /><div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(236,72,153,0.35),transparent_22rem),linear-gradient(90deg,#050b18_0%,rgba(5,11,24,0.95)_42%,rgba(5,11,24,0.55)_100%)]" /><div className="absolute -left-16 top-20 h-64 w-64 rounded-full bg-pink-600/20 blur-3xl" /><div className="relative max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24 grid lg:grid-cols-[1fr_1fr] gap-10 items-center min-h-[560px]"><div><p className="text-pink-300 font-black uppercase tracking-[0.25em]">Seattle Desi TV</p><h1 className="text-5xl md:text-7xl font-black leading-none mt-4">Seattle Desi TV</h1><p className="text-3xl md:text-4xl text-pink-400 font-black italic mt-3">Stories. Culture. Community.</p><p className="text-slate-200 leading-8 mt-5 max-w-xl">Your community media platform for events, radio, businesses and volunteer impact across the Pacific Northwest.</p><div className="flex flex-wrap gap-3 mt-7"><a href="/events" className="bg-pink-600 text-white px-6 py-3 rounded-xl font-black shadow-xl shadow-pink-600/25">Explore Events</a><a href="/radio" className="border border-white/30 bg-white/10 px-6 py-3 rounded-xl font-black backdrop-blur">▶ Listen Live</a></div></div><div className="hidden lg:block"><div className="rounded-[2rem] border border-white/15 bg-white/10 p-4 backdrop-blur-xl shadow-2xl"><div className="aspect-[16/10] rounded-[1.5rem] overflow-hidden bg-white/5"><img src={heroImage} alt="SDTV" className="w-full h-full object-cover" /></div></div></div></div><div className="relative border-y border-white/10 bg-black/20 backdrop-blur"><div className="max-w-7xl mx-auto px-6 md:px-10 py-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">{[["✿","Community Driven","By the community"],["👥","Volunteer Powered","People make it happen"],["🌎","Local & Global","Seattle and beyond"],["📡","Media That Matters","Stories and voice"]].map(([i,t,n]) => <div key={t} className="flex items-center gap-3"><span className="text-2xl text-pink-400">{i}</span><div><p className="font-black">{t}</p><p className="text-slate-400 text-xs">{n}</p></div></div>)}</div></div><Wave /></section>

    <section className="px-6 md:px-10 py-14 bg-white"><div className="max-w-7xl mx-auto"><div className="flex justify-between gap-4 mb-8"><div><p className="text-pink-600 font-black uppercase tracking-[0.18em]">Upcoming Events ✦</p><h2 className="text-4xl font-black">Upcoming Events</h2></div><a href="/events" className="hidden md:block text-pink-600 font-black">View All Events →</a></div><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">{events.length ? events.map(e => <EventCard key={e.id} event={e} />) : [1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl p-8 shadow-xl border text-gray-500">Event card preview</div>)}</div><div className="flex justify-center gap-2 mt-8"><span className="h-2 w-9 rounded-full bg-pink-600" /><span className="h-2 w-2 rounded-full bg-slate-300" /><span className="h-2 w-2 rounded-full bg-slate-300" /></div></div></section>

    <section className="relative bg-[#050b18] text-white overflow-hidden"><Wave flip dark /><div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_45%,rgba(219,39,119,0.35),transparent_22rem),radial-gradient(circle_at_0%_20%,rgba(147,51,234,0.22),transparent_20rem)]" /><div className="absolute right-8 bottom-8 text-[12rem] md:text-[18rem] opacity-20">🎙️</div><div className="relative max-w-7xl mx-auto px-6 md:px-10 py-16 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center"><div><p className="text-pink-300 font-black uppercase tracking-[0.25em]">♫ SDTV Radio</p><h2 className="text-4xl md:text-6xl font-black mt-4">Your Voice. Your Music. Your Community.</h2><p className="text-slate-300 mt-5 leading-8">Bollywood hits, community shows, talk, news and stories that connect us all.</p><a href="/radio" className="inline-block bg-pink-600 px-6 py-4 rounded-xl font-black mt-7">Listen Live Now ▶</a></div><div className="rounded-[2rem] border border-white/15 bg-white/10 p-7 backdrop-blur-xl shadow-2xl"><span className="bg-pink-600 px-3 py-1 rounded-full text-xs font-black">● LIVE</span><h3 className="text-2xl font-black mt-4">SDTV Radio Live</h3><p className="text-slate-300">Best of Bollywood & Community Voices</p><Bars /><div className="flex justify-center gap-8 mt-8 text-2xl"><span>⏮</span><span className="w-16 h-16 rounded-full bg-white/20 grid place-items-center">⏸</span><span>⏭</span></div></div></div><Wave /></section>

    <section className="bg-white px-6 md:px-10 py-14"><div className="max-w-7xl mx-auto"><div className="flex justify-between mb-8"><div><p className="text-pink-600 font-black uppercase tracking-[0.18em]">Featured Videos ✦</p><h2 className="text-4xl font-black">Watch SDTV</h2></div><a href="https://www.youtube.com/@SeattleDesiTV/videos" className="hidden md:block text-pink-600 font-black">View All Videos →</a></div><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">{["Community Stories","Event Highlights","Volunteer Stories","Studio Talk"].map((v,i)=><a key={v} href="https://www.youtube.com/@SeattleDesiTV/videos" className="group"><div className="h-44 rounded-2xl overflow-hidden bg-slate-950 relative shadow-xl"><img src={i===0?heroImage:"/hero-sdtv.png"} alt={v} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition" /><span className="absolute inset-0 grid place-items-center"><b className="w-12 h-12 bg-white/90 text-pink-600 rounded-full grid place-items-center">▶</b></span></div><h3 className="font-black mt-3">{v}</h3><p className="text-gray-500 text-sm">Seattle Desi TV</p></a>)}</div></div></section>

    <section className="relative bg-[#100516] text-white overflow-hidden"><Wave flip dark /><div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(250,204,21,0.22),transparent_18rem),radial-gradient(circle_at_90%_35%,rgba(219,39,119,0.22),transparent_20rem)]" /><div className="relative max-w-7xl mx-auto px-6 md:px-10 py-16 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-center"><div><p className="text-yellow-300 font-black uppercase tracking-[0.22em]">🏆 SDTV Recognition Wall</p><h2 className="text-4xl md:text-5xl font-black mt-4">Thank You Volunteers!</h2><p className="text-slate-300 mt-4 leading-8">Your time, talent and energy power everything we do at SDTV.</p><a href="/recognition" className="inline-block bg-yellow-400 text-slate-950 px-5 py-3 rounded-xl font-black mt-7">View Leaderboard →</a></div><div className="flex flex-wrap items-end justify-center gap-5">{(people.length?people:[1,2,3,4,5].map(i=>({id:String(i),name:`SDTV Volunteer ${i}`} as PersonRow))).slice(0,5).map((p,i)=>{const img=firstImage(p);return <a key={p.id} href="/recognition" className="text-center"><div className={`${i<3?"w-28 h-28":"w-22 h-22"} relative rounded-full p-1 bg-gradient-to-br from-yellow-300 via-pink-500 to-yellow-500 shadow-2xl`}><span className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-yellow-300 text-slate-950 grid place-items-center font-black">{i+1}</span>{img?<img src={img} alt={p.name} className="w-full h-full object-cover rounded-full bg-white"/>:<div className="w-full h-full rounded-full bg-white text-pink-600 grid place-items-center font-black">SDTV</div>}</div><h3 className="font-black mt-3 max-w-[8rem] truncate">{p.name}</h3><p className="text-xs text-slate-300">{100-i*10} Points</p></a>})}</div></div><Wave /></section>

    <section className="bg-gradient-to-br from-orange-50 via-white to-pink-50 px-6 md:px-10 py-14"><div className="max-w-7xl mx-auto"><div className="flex justify-between mb-8"><div><p className="text-pink-600 font-black uppercase tracking-[0.18em]">SDTV Businesses ✦</p><h2 className="text-4xl font-black">SDTV Businesses</h2></div><a href="/businesses" className="hidden md:block text-pink-600 font-black">View All Businesses →</a></div><div className="grid md:grid-cols-2 xl:grid-cols-5 gap-5">{businesses.slice(0,5).map(b=>{const img=firstImage(b);return <a key={b.id} href="/businesses" className="bg-white rounded-2xl p-5 shadow-xl border hover:-translate-y-1 transition"><div className="h-24 rounded-2xl bg-slate-50 grid place-items-center mb-4 overflow-hidden">{img?<img src={img} alt={b.name} className="max-h-20 max-w-full object-contain"/>:<span className="text-pink-600 font-black">SDTV</span>}</div><h3 className="font-black">{b.name}</h3><p className="text-gray-500 text-sm">{b.category || "Local Business"}</p></a>})}</div></div></section>

    <section className="relative bg-[#050b18] text-white px-6 md:px-10 py-14"><div className="max-w-7xl mx-auto"><p className="text-pink-300 font-black uppercase tracking-[0.18em]">Our Impact ✦</p><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">{[["📅",counts.events+"+","Events Published"],["👥",counts.team+"+","Team Members"],["🤝",counts.businesses+"+","Business Partners"],["🎙️",counts.radio+"+","Radio Hosts"]].map(([i,v,l])=><div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"><p className="text-3xl">{i}</p><p className="text-4xl font-black mt-3">{v}</p><p className="text-slate-300 text-sm">{l}</p></div>)}</div></div></section>

    <section className="bg-white px-6 md:px-10 py-12"><div className="max-w-7xl mx-auto"><div className="flex justify-between mb-6"><h2 className="text-3xl font-black">Our Sponsors ✦</h2><a href="/contact?interest=sponsorship" className="text-pink-600 font-black">Become a Sponsor →</a></div><div className="flex gap-5 overflow-x-auto pb-4">{sponsorRows.map(s=><a key={s.id} href={s.website||"/contact?interest=sponsorship"} className="min-w-[210px] bg-white border rounded-2xl p-5 shadow-lg text-center"><div className="h-16 grid place-items-center">{s.logo_url?<img src={s.logo_url} alt={s.name} className="max-h-14 max-w-[160px] object-contain"/>:<span className="font-black text-xl text-slate-700">{s.name}</span>}</div></a>)}</div></div></section>

    <section className="bg-[#050b18] text-white px-6 md:px-10 py-12"><div className="max-w-7xl mx-auto rounded-[2rem] border border-white/10 bg-gradient-to-r from-pink-600/25 via-white/5 to-yellow-400/10 p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6"><div><h2 className="text-3xl md:text-4xl font-black">Let's Build Together ✦</h2><p className="text-slate-300 mt-2">Have a question, partnership idea, or want to get involved?</p></div><div className="flex flex-wrap gap-3"><a href="/contact" className="bg-pink-600 px-6 py-3 rounded-xl font-black">Contact Us</a><a href="/contact?interest=volunteer" className="border border-white/30 px-6 py-3 rounded-xl font-black">Join as Volunteer</a></div></div></section>
    <SiteFooter /></main>;
}

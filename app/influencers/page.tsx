"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import SafeImage from "../components/SafeImage";
import { useCurrentSite } from "../lib/sites/SiteContext";
import { forSite } from "../lib/sites/query";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isPubliclyHidden, loadHiddenUsers } from "../lib/publicVisibility";

const supabase = getSupabaseBrowserClient();

type InfluencerProfile = {
  id: string;
  user_id?: string | null;
  email?: string | null;
  full_name: string;
  city?: string | null;
  bio?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  website_url?: string | null;
  photo_url?: string | null;
  niche?: string | null;
  follower_count?: string | null;
};

const platformFields = [
  ["Instagram", "instagram_url"],
  ["TikTok", "tiktok_url"],
  ["YouTube", "youtube_url"],
  ["Website", "website_url"],
] as const;

function followerNumber(value?: string | null) {
  const clean = String(value || "").trim().toLowerCase().replace(/,/g, "");
  const number = Number.parseFloat(clean.replace(/[^0-9.]/g, "")) || 0;
  if (clean.includes("m")) return number * 1_000_000;
  if (clean.includes("k")) return number * 1_000;
  return number;
}

function profilePlatforms(profile: InfluencerProfile) {
  return platformFields.filter(([, field]) => Boolean(profile[field])).map(([label]) => label);
}

function SocialLink({ href, label }: { href?: string | null; label: string }) {
  if (!href) return null;
  return <a href={href} target="_blank" rel="noreferrer" className="rounded-full bg-pink-50 px-3 py-2 text-xs font-black text-pink-700 transition hover:bg-pink-100">{label}</a>;
}

function Portrait({ profile, large = false }: { profile: InfluencerProfile; large?: boolean }) {
  const className = large ? "h-full min-h-72 w-full object-cover" : "h-full w-full object-cover transition duration-300 group-hover:scale-105";
  return profile.photo_url ? <SafeImage src={profile.photo_url} alt={profile.full_name} className={className} fallbackClassName="grid h-full w-full place-items-center bg-pink-50 text-6xl font-black text-pink-600" fallbackLabel={profile.full_name.charAt(0)} widthHint={large ? 900 : 600} /> : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-pink-50 to-pink-100 text-6xl font-black text-pink-600">{profile.full_name.charAt(0)}</div>;
}

function InfluencerCard({ profile, onView }: { profile: InfluencerProfile; onView: () => void }) {
  return <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
    <div className="grid min-h-56 grid-cols-[44%_1fr] gap-4 p-4">
      <div className="overflow-hidden rounded-2xl bg-pink-50"><Portrait profile={profile} /></div>
      <div className="flex min-w-0 flex-col py-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><h2 className="break-words text-xl font-black leading-tight">{profile.full_name}</h2><p className="mt-2 text-sm font-bold text-slate-500">⌖ {profile.city || "Washington"}</p></div>
          {profile.follower_count && <span className="shrink-0 rounded-xl bg-yellow-50 px-2.5 py-2 text-center text-sm font-black text-yellow-900">{profile.follower_count}<span className="block text-[9px] font-bold uppercase">followers</span></span>}
        </div>
        {profile.niche && <span className="mt-3 w-fit rounded-full bg-pink-50 px-3 py-1.5 text-xs font-black text-pink-700">{profile.niche}</span>}
        <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">{profile.bio || "Community creator sharing local stories, culture, and meaningful connections."}</p>
      </div>
    </div>
    <div className="mt-auto px-4 pb-4">
      <div className="flex min-h-9 flex-wrap gap-2">{platformFields.map(([label, field]) => <SocialLink key={label} href={profile[field]} label={label} />)}</div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={onView} className="rounded-xl border border-slate-300 px-3 py-3 text-sm font-black text-slate-950 hover:border-pink-300">View Profile</button>
        <a href={`/influencer-coverage-request?influencer=${encodeURIComponent(profile.full_name)}&influencerId=${profile.id}`} className="rounded-xl bg-pink-600 px-3 py-3 text-center text-sm font-black text-white hover:bg-pink-700">Collaborate</a>
      </div>
      <a href={`/manage-listing?type=influencer&id=${profile.id}&name=${encodeURIComponent(profile.full_name)}`} className="mt-4 block border-t pt-3 text-center text-xs font-bold text-slate-500 hover:text-pink-700">Claim or update this profile</a>
    </div>
  </article>;
}

function ProfileModal({ profile, onClose }: { profile: InfluencerProfile; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", close);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = oldOverflow; };
  }, [onClose]);
  return <div role="dialog" aria-modal="true" aria-label={`${profile.full_name} profile`} className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-slate-950/80 p-4" onClick={onClose}>
    <div className="relative grid max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl md:grid-cols-[minmax(280px,42%)_1fr]" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white px-4 py-2 text-sm font-black shadow">Close ×</button>
      <div className="min-h-80 overflow-hidden bg-pink-50"><Portrait profile={profile} large /></div>
      <div className="p-7 md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">Creator Profile</p>
        <h2 className="mt-3 text-3xl font-black">{profile.full_name}</h2>
        <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black">{profile.city || "Washington"}</span>{profile.niche && <span className="rounded-full bg-pink-50 px-3 py-2 text-xs font-black text-pink-700">{profile.niche}</span>}{profile.follower_count && <span className="rounded-full bg-yellow-50 px-3 py-2 text-xs font-black text-yellow-900">{profile.follower_count} followers</span>}</div>
        <p className="mt-6 whitespace-pre-line leading-7 text-slate-600">{profile.bio || "Community creator sharing local stories, culture, and meaningful connections."}</p>
        <div className="mt-6 flex flex-wrap gap-2">{platformFields.map(([label, field]) => <SocialLink key={label} href={profile[field]} label={label} />)}</div>
        <a href={`/influencer-coverage-request?influencer=${encodeURIComponent(profile.full_name)}&influencerId=${profile.id}`} className="mt-7 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Request Collaboration</a>
      </div>
    </div>
  </div>;
}

export default function InfluencersPage() {
  const site = useCurrentSite();
  const [profiles, setProfiles] = useState<InfluencerProfile[]>([]);
  const [message, setMessage] = useState("Loading approved influencers...");
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("");
  const [location, setLocation] = useState("");
  const [followerOrder, setFollowerOrder] = useState("");
  const [selected, setSelected] = useState<InfluencerProfile | null>(null);

  async function loadProfiles() {
    const [profileResult, hidden] = await Promise.all([forSite(supabase.from("influencer_profiles").select("id,user_id,email,full_name,city,bio,instagram_url,tiktok_url,youtube_url,website_url,photo_url,niche,follower_count").eq("status", "approved").eq("public_listing", true), site.id).order("full_name", { ascending: true }), loadHiddenUsers(supabase)]);
    if (profileResult.error) { setProfiles([]); setMessage("Influencer directory will be available after setup."); return; }
    const visible = (profileResult.data || []).filter((row: any) => !isPubliclyHidden(row, hidden));
    setProfiles(visible);
    setMessage(visible.length ? `Showing ${visible.length} ${site.shortName} influencer(s).` : `No approved public influencers for ${site.shortName} yet.`);
  }
  useEffect(() => { loadProfiles(); }, [site.id]);

  const niches = useMemo(() => Array.from(new Set(profiles.map((profile) => profile.niche).filter(Boolean) as string[])).sort(), [profiles]);
  const locations = useMemo(() => Array.from(new Set(profiles.map((profile) => profile.city || "Washington"))).sort(), [profiles]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = profiles.filter((profile) => (!query || `${profile.full_name} ${profile.bio || ""} ${profile.niche || ""} ${profile.city || ""}`.toLowerCase().includes(query)) && (!niche || profile.niche === niche) && (!location || (profile.city || "Washington") === location) && (!platform || profilePlatforms(profile).some((item) => item === platform)));
    if (followerOrder) rows.sort((a, b) => followerOrder === "high" ? followerNumber(b.follower_count) - followerNumber(a.follower_count) : followerNumber(a.follower_count) - followerNumber(b.follower_count));
    return rows;
  }, [profiles, search, niche, location, platform, followerOrder]);

  return <main className="min-h-screen bg-slate-50 text-slate-950">
    <SiteHeader />
    <section className="bg-[#050b18] px-6 py-12 text-white md:px-10"><div className="mx-auto max-w-7xl"><p className="text-sm font-black uppercase tracking-wide text-pink-300">{site.shortName} Influencer Network</p><h1 className="mt-3 text-4xl font-black md:text-6xl">Influencers in {site.city}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">Discover creators who support community events, local businesses, culture, food, fashion, arts, and South Asian stories across {site.city}.</p><div className="mt-8 flex flex-wrap gap-3"><a href="/my-influencer-profile" className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Join as Influencer</a><a href="/influencer-coverage-request" className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Request Business Coverage</a><a href="/events" className="rounded-xl border border-white/40 px-5 py-3 font-black text-white">Find Events</a></div></div></section>
    <section className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-black uppercase tracking-wide text-pink-600">Meet local creators</p><h2 className="mt-2 text-3xl font-black">Approved Influencer Directory</h2><p className="mt-2 text-slate-500">{message}</p></div><a href="/contact?interest=partnership" className="text-sm font-black text-pink-600">Partner with {site.shortName} →</a></div>
      <div className="mb-8 grid gap-3 rounded-3xl border bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[2fr_repeat(4,1fr)]">
        <label className="relative"><span className="sr-only">Search creators</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search creators" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-pink-500" /></label>
        <select aria-label="Filter by niche" value={niche} onChange={(event) => setNiche(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3"><option value="">All niches</option>{niches.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Filter by platform" value={platform} onChange={(event) => setPlatform(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3"><option value="">All platforms</option>{platformFields.map(([label]) => <option key={label}>{label}</option>)}</select>
        <select aria-label="Filter by location" value={location} onChange={(event) => setLocation(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3"><option value="">All locations</option>{locations.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Sort by followers" value={followerOrder} onChange={(event) => setFollowerOrder(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3"><option value="">Followers</option><option value="high">Highest first</option><option value="low">Lowest first</option></select>
      </div>
      {filtered.length === 0 ? <div className="rounded-3xl border bg-white p-8 text-slate-500">{profiles.length ? "No influencers match those filters." : message}</div> : <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">{filtered.map((profile) => <InfluencerCard key={profile.id} profile={profile} onView={() => setSelected(profile)} />)}</div>}
    </section>
    {selected && <ProfileModal profile={selected} onClose={() => setSelected(null)} />}
    <SiteFooter />
  </main>;
}

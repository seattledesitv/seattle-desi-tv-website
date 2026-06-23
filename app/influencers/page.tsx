"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import SafeImage from "../components/SafeImage";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type InfluencerProfile = {
  id: string;
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

function SocialLink({ href, label }: { href?: string | null; label: string }) {
  if (!href) return null;
  return <a href={href} target="_blank" rel="noreferrer" className="rounded-full bg-pink-50 px-3 py-2 text-xs font-black text-pink-700 hover:bg-pink-100">{label}</a>;
}

function InfluencerCard({ profile }: { profile: InfluencerProfile }) {
  return (
    <article className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="bg-slate-950 p-6 text-center text-white">
        <div className="mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-pink-200 bg-white">
          {profile.photo_url ? <SafeImage src={profile.photo_url} alt={profile.full_name} className="h-full w-full object-cover" fallbackClassName="grid h-full w-full place-items-center text-xl font-black text-pink-600" fallbackLabel={profile.full_name.charAt(0)} widthHint={420} /> : <div className="grid h-full w-full place-items-center text-xl font-black text-pink-600">{profile.full_name.charAt(0)}</div>}
        </div>
        <h2 className="mt-4 text-2xl font-black">{profile.full_name}</h2>
        <p className="mt-1 text-sm text-pink-200">{profile.city || "Washington"}</p>
      </div>
      <div className="p-6">
        <div className="flex flex-wrap gap-2">
          {profile.niche && <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{profile.niche}</span>}
          {profile.follower_count && <span className="rounded-full bg-yellow-50 px-3 py-2 text-xs font-black text-yellow-800">{profile.follower_count}</span>}
        </div>
        {profile.bio && <p className="mt-4 text-sm leading-6 text-slate-600">{profile.bio}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <SocialLink href={profile.instagram_url} label="Instagram" />
          <SocialLink href={profile.tiktok_url} label="TikTok" />
          <SocialLink href={profile.youtube_url} label="YouTube" />
          <SocialLink href={profile.website_url} label="Website" />
        </div>
      </div>
    </article>
  );
}

export default function InfluencersPage() {
  const [profiles, setProfiles] = useState<InfluencerProfile[]>([]);
  const [message, setMessage] = useState("Loading approved influencers...");

  async function loadProfiles() {
    const { data, error } = await supabase
      .from("influencer_profiles")
      .select("id,full_name,city,bio,instagram_url,tiktok_url,youtube_url,website_url,photo_url,niche,follower_count")
      .eq("status", "approved")
      .eq("public_listing", true)
      .order("full_name", { ascending: true });
    if (error) {
      setProfiles([]);
      setMessage("Influencer directory will be available after setup.");
      return;
    }
    setProfiles(data || []);
    setMessage((data || []).length ? `Showing ${(data || []).length} Washington influencer(s).` : "No approved public influencers yet.");
  }

  useEffect(() => { loadProfiles(); }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      <section className="bg-[#050b18] px-6 py-14 text-white md:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-wide text-pink-300">SDTV Influencer Network</p>
          <h1 className="mt-3 text-4xl font-black md:text-6xl">Influencers in Washington</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">Discover creators who support community events, local businesses, culture, food, fashion, arts, and South Asian stories across Washington.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/my-hub" className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Join as Influencer</a>
            <a href="/events" className="rounded-xl border border-white/40 px-5 py-3 font-black text-white">Find Events</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-black">Approved Influencer Directory</h2>
            <p className="mt-2 text-slate-500">{message}</p>
          </div>
          <a href="/contact?interest=partnership" className="text-sm font-black text-pink-600">Partner with SDTV →</a>
        </div>
        {profiles.length === 0 ? <div className="rounded-3xl border bg-white p-8 text-slate-500">{message}</div> : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{profiles.map((profile) => <InfluencerCard key={profile.id} profile={profile} />)}</div>}
      </section>
      <SiteFooter />
    </main>
  );
}

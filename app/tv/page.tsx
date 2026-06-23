"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FeaturedSocialSection, { FeaturedSocialItem } from "../components/FeaturedSocialSection";
import SafeImage from "../components/SafeImage";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

const fallbackVideos = [
  { title: "Seattle Desi TV — Community Stories", description: "Watch community interviews, event coverage, and cultural highlights.", url: "https://www.youtube.com/@SeattleDesiTV", thumbnail: "/hero-sdtv.png" },
  { title: "Events, Interviews & Local Voices", description: "Explore SDTV coverage across the Pacific Northwest.", url: "https://www.youtube.com/@SeattleDesiTV/videos", thumbnail: "/hero-sdtv.png" },
  { title: "Seattle Desi TV Shorts", description: "Quick community moments, reels, and highlights from SDTV.", url: "https://www.youtube.com/@SeattleDesiTV/shorts", thumbnail: "/sdtv-logo.png" },
];

type VideoRow = { id?: string; title: string; description?: string; thumbnail?: string; url: string; publishedAt?: string };

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function isWithinDateWindow(row: any, today: string) {
  return (!row.start_date || row.start_date <= today) && (!row.end_date || row.end_date >= today);
}

function VideoCard({ video }: { video: VideoRow }) {
  return (
    <a href={video.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-xl transition hover:-translate-y-1 hover:bg-slate-900">
      <div className="aspect-video overflow-hidden bg-white/5">
        {video.thumbnail ? <SafeImage src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" fallbackClassName="flex h-full w-full items-center justify-center bg-slate-900 text-pink-200 font-black" fallbackLabel="SDTV" widthHint={900} /> : <div className="grid h-full place-items-center font-black text-pink-300">Seattle Desi TV</div>}
      </div>
      <div className="p-5">
        <h3 className="text-xl font-black text-white">{video.title}</h3>
        {video.publishedAt && <p className="mt-2 text-xs font-bold text-pink-200">{formatDate(video.publishedAt)}</p>}
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{video.description || "Watch this Seattle Desi TV video."}</p>
      </div>
    </a>
  );
}

export default function TVPage() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [videoMessage, setVideoMessage] = useState("Loading latest YouTube videos...");
  const [featuredSocial, setFeaturedSocial] = useState<FeaturedSocialItem[]>([]);

  async function loadLatestVideos() {
    try {
      const response = await fetch("/api/youtube/latest", { cache: "no-store" });
      const result = await response.json();
      if (result?.ok && Array.isArray(result.videos) && result.videos.length > 0) {
        setVideos(result.videos);
        setVideoMessage("Latest videos from Seattle Desi TV on YouTube.");
      } else {
        setVideos([]);
        setVideoMessage(result?.error ? `Showing featured YouTube links: ${result.error}` : "Showing featured YouTube links.");
      }
    } catch {
      setVideos([]);
      setVideoMessage("Showing featured YouTube links.");
    }
  }

  async function loadFeaturedSocial() {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("featured_social_content")
      .select("id,title,subtitle,platform,content_type,content_url,thumbnail_url,button_text,display_order,active,featured,start_date,end_date")
      .eq("active", true)
      .eq("featured", true)
      .order("display_order", { ascending: true })
      .limit(9);
    if (!error && Array.isArray(data)) setFeaturedSocial(data.filter((row: any) => isWithinDateWindow(row, today)) as FeaturedSocialItem[]);
  }

  useEffect(() => { loadLatestVideos(); loadFeaturedSocial(); }, []);

  const visibleVideos = videos.length ? videos : fallbackVideos;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050b18] text-white">
      <SiteHeader />
      <section className="relative overflow-hidden px-6 py-14 md:px-10 md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(219,39,119,.28),transparent_22rem),radial-gradient(circle_at_82%_8%,rgba(250,204,21,.14),transparent_20rem)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.8fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-pink-300">Seattle Desi TV</p>
            <h1 className="mt-4 text-5xl font-black leading-tight md:text-7xl">Watch SDTV</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">Interviews, event coverage, community stories, reels, and cultural highlights from Seattle Desi TV.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#youtube" className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white hover:bg-pink-500">Latest YouTube</a>
              <a href="#social" className="rounded-xl border border-white/40 px-5 py-3 font-black text-white hover:bg-white/10">Social Highlights</a>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur">
            <div className="aspect-video overflow-hidden rounded-3xl bg-slate-950">
              <SafeImage src="/hero-sdtv.png" alt="Seattle Desi TV" className="h-full w-full object-cover" fallbackClassName="grid h-full w-full place-items-center text-pink-200 font-black" fallbackLabel="SDTV" widthHint={1200} />
            </div>
            <p className="mt-4 rounded-2xl bg-pink-600/15 p-4 text-sm font-bold text-pink-100">Future v2: live Instagram and TikTok API feed after platform approval. MVP uses featured social posts managed in Studio.</p>
          </div>
        </div>
      </section>

      <section id="youtube" className="px-6 py-10 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-pink-300">YouTube</p>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">Latest SDTV Videos</h2>
              <p className="mt-2 text-slate-300">{videoMessage}</p>
            </div>
            <a href="https://www.youtube.com/@SeattleDesiTV/videos" target="_blank" rel="noreferrer" className="text-sm font-black text-pink-300">Open YouTube →</a>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleVideos.slice(0, 6).map((video) => <VideoCard key={video.url} video={video} />)}
          </div>
        </div>
      </section>

      <div id="social">
        <FeaturedSocialSection items={featuredSocial} title="Featured Reels & Social Highlights" subtitle="Instagram reels, TikTok links, YouTube shorts, and selected social moments curated by SDTV." />
      </div>

      <section className="px-6 py-12 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 shadow-2xl md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-pink-300">Follow SDTV</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Watch more on our channels</h2>
            <p className="mt-3 text-slate-300">Subscribe and follow for interviews, community coverage, shorts, reels, and updates.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">YouTube</a>
            <a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Instagram</a>
            <a href="https://www.tiktok.com/@seattledesitv" target="_blank" rel="noreferrer" className="rounded-xl border border-white/40 px-5 py-3 font-black text-white">TikTok</a>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

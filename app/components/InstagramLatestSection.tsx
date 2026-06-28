"use client";

import { useEffect, useState } from "react";
import SafeImage from "./SafeImage";

type InstagramPost = {
  id: string;
  caption?: string;
  mediaType?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink: string;
  timestamp?: string;
  username?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function clipText(value?: string | null) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "Seattle Desi TV Instagram update.";
  return text.length > 170 ? `${text.slice(0, 170)}...` : text;
}

function InstagramCard({ post }: { post: InstagramPost }) {
  const image = post.thumbnailUrl || post.mediaUrl || "/sdtv-logo.png";
  return (
    <a href={post.permalink} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-xl transition hover:-translate-y-1 hover:bg-white/[0.09]">
      <div className="relative aspect-square overflow-hidden bg-slate-950">
        <SafeImage src={image} alt={clipText(post.caption)} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" fallbackClassName="flex h-full w-full items-center justify-center bg-slate-900 text-pink-200 font-black" fallbackLabel="Instagram" widthHint={700} />
        <span className="absolute left-3 top-3 rounded-full bg-pink-600 px-3 py-1 text-xs font-black text-white">{post.mediaType === "VIDEO" ? "REEL" : "INSTAGRAM"}</span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-wide text-pink-300">@{post.username || "seattledesitv"}</p>
          {post.timestamp && <p className="text-xs font-bold text-slate-400">{formatDate(post.timestamp)}</p>}
        </div>
        <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-200">{clipText(post.caption)}</p>
      </div>
    </a>
  );
}

export default function InstagramLatestSection() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [message, setMessage] = useState("Loading latest Instagram posts...");

  async function loadLatestInstagram() {
    try {
      const response = await fetch("/api/instagram/latest?limit=6", { cache: "no-store" });
      const result = await response.json();
      if (result?.ok && Array.isArray(result.posts) && result.posts.length > 0) {
        setPosts(result.posts);
        setMessage("Latest posts and reels from Seattle Desi TV on Instagram.");
      } else {
        setPosts([]);
        setMessage(result?.error ? `Instagram feed is not available yet: ${result.error}` : "Instagram feed is not available yet.");
      }
    } catch {
      setPosts([]);
      setMessage("Instagram feed is not available yet.");
    }
  }

  useEffect(() => { loadLatestInstagram(); }, []);

  return (
    <section id="instagram" className="px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl md:p-8">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-pink-300">Instagram</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Latest From Instagram</h2>
            <p className="mt-2 text-slate-300">{message}</p>
          </div>
          <a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="text-sm font-black text-pink-300">Open Instagram →</a>
        </div>
        {posts.length > 0 ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.slice(0, 6).map((post) => <InstagramCard key={post.id || post.permalink} post={post} />)}
        </div> : <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-sm font-bold text-slate-300">Instagram posts will appear here once the API is connected in Vercel.</div>}
      </div>
    </section>
  );
}

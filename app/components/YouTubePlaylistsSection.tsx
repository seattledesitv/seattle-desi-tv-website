"use client";

import { useEffect, useState } from "react";
import SafeImage from "./SafeImage";

type PlaylistVideo = {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  publishedAt?: string;
  url: string;
};

type Playlist = {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  itemCount?: number;
  url: string;
  videos?: PlaylistVideo[];
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function VideoPill({ video }: { video: PlaylistVideo }) {
  return (
    <a href={video.url} target="_blank" rel="noreferrer" className="grid grid-cols-[72px_1fr] gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-2 transition hover:bg-slate-900">
      <div className="aspect-video overflow-hidden rounded-xl bg-white/5">
        <SafeImage src={video.thumbnail || "/sdtv-logo.png"} alt={video.title} className="h-full w-full object-cover" fallbackClassName="grid h-full w-full place-items-center text-xs font-black text-pink-200" fallbackLabel="SDTV" widthHint={240} />
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-black leading-5 text-white">{video.title}</p>
        {video.publishedAt && <p className="mt-1 text-xs font-bold text-slate-400">{formatDate(video.publishedAt)}</p>}
      </div>
    </a>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const videos = Array.isArray(playlist.videos) ? playlist.videos : [];
  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-xl">
      <a href={playlist.url} target="_blank" rel="noreferrer" className="group block">
        <div className="aspect-video overflow-hidden bg-slate-950">
          <SafeImage src={playlist.thumbnail || "/hero-sdtv.png"} alt={playlist.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" fallbackClassName="grid h-full w-full place-items-center text-pink-200 font-black" fallbackLabel="Playlist" widthHint={900} />
        </div>
        <div className="p-5">
          <p className="text-xs font-black uppercase tracking-wide text-pink-300">Playlist {playlist.itemCount ? `· ${playlist.itemCount} videos` : ""}</p>
          <h3 className="mt-2 text-2xl font-black text-white">{playlist.title}</h3>
          {playlist.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{playlist.description}</p>}
        </div>
      </a>
      {videos.length > 0 && <div className="grid gap-2 px-5 pb-5">
        {videos.slice(0, 4).map((video) => <VideoPill key={video.id} video={video} />)}
      </div>}
    </article>
  );
}

export default function YouTubePlaylistsSection() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [message, setMessage] = useState("Loading SDTV playlists...");

  async function loadPlaylists() {
    try {
      const response = await fetch("/api/youtube/playlists?perPlaylist=4", { cache: "no-store" });
      const result = await response.json();
      if (result?.ok && Array.isArray(result.playlists) && result.playlists.length > 0) {
        setPlaylists(result.playlists);
        setMessage("Curated SDTV playlists and episode collections from YouTube.");
      } else {
        setPlaylists([]);
        setMessage(result?.error ? `Playlists are not available yet: ${result.error}` : "Playlists are not available yet.");
      }
    } catch {
      setPlaylists([]);
      setMessage("Playlists are not available yet.");
    }
  }

  useEffect(() => { loadPlaylists(); }, []);

  return (
    <section id="playlists" className="px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-pink-300">YouTube Playlists</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Watch by Series</h2>
            <p className="mt-2 text-slate-300">{message}</p>
          </div>
          <a href="https://www.youtube.com/@SeattleDesiTV/playlists" target="_blank" rel="noreferrer" className="text-sm font-black text-pink-300">Open Playlists →</a>
        </div>
        {playlists.length > 0 ? <div className="grid gap-5 lg:grid-cols-2">
          {playlists.slice(0, 6).map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}
        </div> : <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-sm font-bold text-slate-300">YouTube playlists will appear here once the API finds public playlists for the channel.</div>}
      </div>
    </section>
  );
}

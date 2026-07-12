"use client";

import { useEffect, useRef, useState } from "react";
import SafeImage from "../SafeImage";

const STREAM_URL = process.env.NEXT_PUBLIC_LIVE365_STREAM_URL || "https://streaming.live365.com/a62710";
const META_URL = process.env.NEXT_PUBLIC_LIVE365_NOWPLAYING_URL || "";
const DEFAULT_THUMBNAIL = "https://image.live365.com/download/54001cad-5c3f-4dbd-88be-e4f33ca12275.png/400/image.webp";

export default function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trackText, setTrackText] = useState("Seattle Desi Radio Live");
  const [thumbnail, setThumbnail] = useState(DEFAULT_THUMBNAIL);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    setError("");
    if (!audio.paused) { audio.pause(); return; }
    setLoading(true);
    try {
      audio.src = `${STREAM_URL}${STREAM_URL.includes("?") ? "&" : "?"}t=${Date.now()}`;
      audio.load();
      await audio.play();
    } catch (playError) {
      console.error("Radio playback failed", playError);
      setPlaying(false);
      setError("The live stream could not start. Please try again.");
    } finally { setLoading(false); }
  }

  async function loadMetadata() {
    if (!META_URL) return;
    try {
      const response = await fetch(META_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("metadata unavailable");
      const data = await response.json();
      const current = data?.current || data?.now_playing?.song || {};
      const title = current?.title || data?.current?.title || "You are tuned into Seattle Desi Radio";
      const artist = current?.artist || data?.current?.artist || "";
      const art = current?.art || current?.artwork || current?.image || data?.current?.art || data?.current?.artwork || "";
      setTrackText(artist ? `${title} — ${artist}` : title);
      if (art) setThumbnail(art);
    } catch { setTrackText("Seattle Desi Radio Live"); }
  }

  useEffect(() => { loadMetadata(); if (!META_URL) return; const timer = window.setInterval(loadMetadata, 30000); return () => window.clearInterval(timer); }, []);

  return <div className="relative w-full max-w-full sm:max-w-xl mx-auto rounded-[1.5rem] border border-white/15 bg-slate-950 p-4 sm:p-5 shadow-2xl text-white overflow-hidden"><div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_28%,rgba(219,39,119,0.42),transparent_14rem),radial-gradient(circle_at_8%_10%,rgba(244,114,182,0.18),transparent_12rem)]" /><div className="relative flex flex-col sm:flex-row gap-4 sm:gap-5 items-center min-w-0"><SafeImage src={thumbnail} alt="Now playing" className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 shrink-0 rounded-2xl object-cover border border-white/15 bg-white p-1 shadow-[0_0_24px_rgba(236,72,153,.45)]" fallbackClassName="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 shrink-0 rounded-2xl border border-white/15 bg-white/10 text-white grid place-items-center font-black text-sm" fallbackLabel="SDTV" /><div className="flex-1 overflow-hidden w-full text-center sm:text-left min-w-0"><span className="inline-flex items-center gap-2 rounded-full bg-pink-600 px-3 py-1 text-[10px] font-black text-white shadow-lg shadow-pink-600/30">● LIVE</span><h2 className="text-white text-xl sm:text-3xl font-black mt-3 m-0 break-words">Seattle Desi Radio</h2><div className="overflow-hidden whitespace-nowrap mt-3 max-w-full rounded-full bg-white/5 px-3 py-2 border border-white/10"><div key={trackText} className="inline-block pl-full text-sm text-slate-200 animate-[sdtvScroll_12s_linear_infinite]">{trackText}</div></div>{error && <p className="mt-3 text-sm font-bold text-amber-300">{error}</p>}</div><button onClick={togglePlay} disabled={loading} className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full border border-pink-300/30 bg-pink-600 text-white text-sm sm:text-base cursor-pointer shadow-[0_0_28px_rgba(236,72,153,.65)] font-black hover:bg-pink-500 transition disabled:cursor-wait disabled:opacity-70" aria-label={playing ? "Pause radio" : "Play radio"}>{loading ? "Loading" : playing ? "Pause" : "Play"}</button></div><audio ref={audioRef} onPlay={() => { setPlaying(true); setLoading(false); }} onPause={() => setPlaying(false)} onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)} onError={() => { setPlaying(false); setLoading(false); setError("The live stream could not be loaded. Please try again."); }} preload="none" /></div>;
}

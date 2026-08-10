"use client";

import { useEffect, useRef, useState } from "react";
import SafeImage from "../SafeImage";

const STREAM_URL = process.env.NEXT_PUBLIC_LIVE365_STREAM_URL || "https://streaming.live365.com/a45587";
const META_URL = process.env.NEXT_PUBLIC_LIVE365_NOWPLAYING_URL || "https://live365.com/embeds/v1/played/a45587";
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
      if (audio.src !== STREAM_URL) {
        audio.src = STREAM_URL;
        audio.load();
      }
      await audio.play();
    } catch (playError) {
      console.error("Radio playback failed", playError);
      setPlaying(false);
      setError("The live stream could not start. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMetadata() {
    if (!META_URL) return;
    try {
      const response = await fetch(META_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("metadata unavailable");
      const data = await response.json();
      const current = data?.current || data?.now_playing?.song || data?.tracks?.[0] || {};
      const title = current?.title || current?.track || data?.current?.title || "You are tuned into Seattle Desi Radio";
      const artist = current?.artist || data?.current?.artist || "";
      const art = current?.art || current?.artwork || current?.image || data?.current?.art || data?.current?.artwork || "";
      setTrackText(artist ? `${title} — ${artist}` : title);
      if (art) setThumbnail(art);
    } catch {
      setTrackText("Seattle Desi Radio Live");
    }
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.src = STREAM_URL;
    const initial = window.setTimeout(() => void loadMetadata(), 0);
    const timer = window.setInterval(loadMetadata, 30000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  return <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-slate-950 p-4 text-white shadow-2xl sm:p-5">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_20%,rgba(219,39,119,0.38),transparent_13rem),radial-gradient(circle_at_8%_10%,rgba(244,114,182,0.14),transparent_10rem)]" />
    <div className="relative grid min-w-0 items-center gap-4 sm:grid-cols-[6rem_minmax(0,1fr)_4.5rem] sm:gap-5">
      <div className="mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white p-1 shadow-[0_0_22px_rgba(236,72,153,.38)]">
        <SafeImage src={thumbnail} alt="Now playing" className="h-full w-full rounded-xl object-cover" fallbackClassName="grid h-full w-full place-items-center rounded-xl bg-white/10 text-xs font-black text-white" fallbackLabel="SDTV" enableFullPreview={false} widthHint={240} />
      </div>
      <div className="min-w-0 overflow-hidden text-center sm:text-left">
        <span className="inline-flex items-center gap-2 rounded-full bg-pink-600 px-3 py-1 text-[10px] font-black text-white shadow-lg shadow-pink-600/30">● LIVE</span>
        <h2 className="text-white text-xl sm:text-3xl font-black mt-3 m-0 break-words">Seattle Desi Radio</h2>
        <div className="overflow-hidden whitespace-nowrap mt-3 max-w-full rounded-full bg-white/5 px-3 py-2 border border-white/10"><div key={trackText} className="inline-block pl-full text-sm text-slate-200 animate-[sdtvScroll_12s_linear_infinite]">{trackText}</div></div>
        {error && <p className="mt-3 text-sm font-bold text-amber-300">{error}</p>}
      </div>
      <button onClick={togglePlay} disabled={loading} className="mx-auto h-16 w-16 shrink-0 rounded-full border border-pink-300/30 bg-pink-600 text-sm font-black text-white shadow-[0_0_24px_rgba(236,72,153,.55)] transition hover:bg-pink-500 disabled:cursor-wait disabled:opacity-70 sm:h-[4.5rem] sm:w-[4.5rem]" aria-label={playing ? "Pause radio" : "Play radio"}>{loading ? "Wait" : playing ? "Pause" : "Play"}</button>
    </div>
    <audio ref={audioRef} onPlay={() => { setPlaying(true); setLoading(false); }} onPause={() => setPlaying(false)} onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)} onError={() => { setPlaying(false); setLoading(false); setError("The live stream could not be loaded. Please try again."); }} preload="none" />
  </div>;
}

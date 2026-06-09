"use client";

import { useEffect, useRef, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const STREAM_URL = "https://das-edge17-live365-dal02.cdnstream.com/a45587";
const META_URL = "https://api.live365.com/stations/a45587/nowplaying";
const DEFAULT_THUMBNAIL = "https://image.live365.com/download/54001cad-5c3f-4dbd-88be-e4f33ca12275.png/400/image.webp";

type RadioHost = {
  id: string;
  name: string;
  title?: string | null;
  segment_name?: string | null;
  image?: string | null;
  photo?: string | null;
  picture?: string | null;
};

function firstImage(row: RadioHost) {
  return row.image || row.photo || row.picture || "";
}

function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [trackText, setTrackText] = useState("Loading Seattle Desi Radio...");
  const [thumbnail, setThumbnail] = useState(DEFAULT_THUMBNAIL);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  }

  async function loadMetadata() {
    try {
      const response = await fetch(META_URL, { cache: "no-store" });
      const data = await response.json();
      const current = data?.current || data?.now_playing?.song || {};
      const title = current?.title || data?.current?.title || "You are tuned into Seattle Desi Radio";
      const artist = current?.artist || data?.current?.artist || "";
      const art = current?.art || current?.artwork || current?.image || data?.current?.art || data?.current?.artwork || "";
      setTrackText(artist ? `${title} — ${artist}` : title);
      if (art) setThumbnail(art);
    } catch {
      setTrackText("Seattle Desi Radio Live");
    }
  }

  useEffect(() => {
    loadMetadata();
    const timer = setInterval(loadMetadata, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-full sm:max-w-xl mx-auto bg-gradient-to-br from-black to-zinc-900 rounded-[22px] p-4 sm:p-5 shadow-2xl text-white overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-center min-w-0">
        <img
          src={thumbnail}
          alt="Now playing"
          className="w-24 h-24 sm:w-36 sm:h-36 md:w-40 md:h-40 shrink-0 rounded-2xl object-cover border-4 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,.65)]"
        />
        <div className="flex-1 overflow-hidden w-full text-center sm:text-left min-w-0">
          <h2 className="text-yellow-300 text-xl sm:text-3xl font-black m-0 break-words">Seattle Desi Radio</h2>
          <div className="overflow-hidden whitespace-nowrap mt-3 max-w-full">
            <div key={trackText} className="inline-block pl-full text-sm sm:text-lg animate-[sdtvScroll_12s_linear_infinite]">{trackText}</div>
          </div>
          <div className="mt-2 text-green-400 text-sm font-black">🟢 LIVE</div>
        </div>
        <button
          onClick={togglePlay}
          className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 shrink-0 rounded-full border-0 bg-yellow-400 text-black text-xl sm:text-3xl md:text-4xl cursor-pointer shadow-[0_0_24px_rgba(250,204,21,.75)] font-black"
          aria-label={playing ? "Pause radio" : "Play radio"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
      </div>
      <div className="flex gap-2 justify-center mt-4 sm:mt-6 opacity-70 h-8 sm:h-14 items-end overflow-hidden">
        {[0, 1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className="w-2 sm:w-3 bg-yellow-400 animate-[sdtvBeat_1s_infinite_ease-in-out]"
            style={{ animationDelay: `${bar * 0.18}s` }}
          />
        ))}
      </div>
      <audio ref={audioRef} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} preload="none">
        <source src={STREAM_URL} type="audio/mpeg" />
      </audio>
      <style jsx>{`
        @keyframes sdtvScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
        @keyframes sdtvBeat { 0% { height: 10px; } 50% { height: 30px; } 100% { height: 10px; } }
        @media (min-width: 640px) { @keyframes sdtvBeat { 0% { height: 15px; } 50% { height: 50px; } 100% { height: 15px; } } }
        .pl-full { padding-left: 100%; }
      `}</style>
    </div>
  );
}

export default function RadioPage() {
  const [hosts, setHosts] = useState<RadioHost[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadHosts() {
    setLoading(true);
    const { data } = await supabase
      .from("radio_team_members")
      .select("id,name,title,segment_name,image,photo,picture")
      .order("created_at", { ascending: false });
    setHosts(data || []);
    setLoading(false);
  }

  useEffect(() => { loadHosts(); }, []);

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-b from-white to-slate-100 text-slate-950">
      <SiteHeader />

      <section className="relative overflow-hidden bg-slate-950 text-white w-full max-w-full">
        <div className="absolute inset-0 opacity-25 bg-cover bg-center" style={{ backgroundImage: "url('/hero-sdtv.png')" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-14 md:py-18 overflow-hidden">
          <p className="text-pink-300 font-black uppercase tracking-wide text-sm sm:text-base">Seattle Desi Radio</p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black max-w-4xl leading-tight mt-2 break-words">Listen Live</h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-200 max-w-3xl mt-4">Community voices, music, interviews, culture, and Desi weekend vibes from the Pacific Northwest.</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 w-full max-w-xs sm:max-w-none">
            <a href="#listen" className="bg-pink-600 text-white px-5 py-3 sm:px-6 sm:py-4 rounded-xl font-black text-center">Start Listening</a>
            <a href="#hosts" className="bg-white text-slate-950 px-5 py-3 sm:px-6 sm:py-4 rounded-xl font-black text-center">Meet Hosts</a>
          </div>
        </div>
      </section>

      <section id="listen" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-7 sm:py-10 md:py-12 overflow-hidden">
        <div className="bg-white border rounded-3xl p-4 sm:p-6 md:p-10 shadow-sm grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 md:gap-8 items-center overflow-hidden min-w-0">
          <div className="min-w-0">
            <p className="text-pink-600 font-black uppercase tracking-wide text-sm sm:text-base">On Air</p>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black mt-2 break-words">Seattle Desi Radio</h2>
            <p className="text-gray-600 mt-4 text-base sm:text-lg">Tune in for SDTV Radio programming, community interviews, cultural conversations, and music curated for the Seattle Desi community.</p>
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4 mt-6 sm:mt-8">
              <div className="bg-pink-50 rounded-2xl p-4"><p className="font-black text-pink-600">Tue / Thu</p><p className="text-sm text-gray-600 mt-1">6 PM shows</p></div>
              <div className="bg-pink-50 rounded-2xl p-4"><p className="font-black text-pink-600">DJ Loki</p><p className="text-sm text-gray-600 mt-1">10 PM vibe</p></div>
              <div className="bg-pink-50 rounded-2xl p-4"><p className="font-black text-pink-600">Replays</p><p className="text-sm text-gray-600 mt-1">Evenings + weekends</p></div>
            </div>
            <a href="https://live365.com/station/Seattle-Desi-Radio-a62710" target="_blank" rel="noreferrer" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-black mt-6">Open in Live365</a>
          </div>
          <div className="min-w-0 w-full"><RadioPlayer /></div>
        </div>
      </section>

      <section id="hosts" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10 md:py-12 overflow-hidden">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-pink-600 font-black uppercase tracking-wide text-sm sm:text-base">Radio Team</p>
            <h2 className="text-3xl md:text-4xl font-black">Hosts & Segments</h2>
            <p className="text-gray-600 mt-1">Meet the voices behind Seattle Desi Radio.</p>
          </div>
          <a href="/studio/radio-team" className="hidden md:inline-block text-pink-600 font-black">Studio Radio Team →</a>
        </div>
        {loading ? (
          <div className="bg-white border rounded-2xl p-8 text-gray-500">Loading radio hosts...</div>
        ) : hosts.length === 0 ? (
          <div className="bg-white border rounded-2xl p-8 text-gray-500">Radio host profiles will appear here after they are added in Studio.</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
            {hosts.map((host) => {
              const image = firstImage(host);
              return (
                <article key={host.id} className="bg-white border rounded-2xl p-5 text-center shadow-sm hover:shadow-xl transition">
                  {image ? <img src={image} alt={host.name} className="w-28 h-28 rounded-full object-cover mx-auto" /> : <div className="w-28 h-28 rounded-full bg-pink-50 text-pink-600 grid place-items-center mx-auto font-black">SDTV</div>}
                  <h3 className="text-xl font-black mt-4">{host.name}</h3>
                  {host.title && <p className="text-gray-600 text-sm mt-1">{host.title}</p>}
                  {host.segment_name && <p className="text-pink-600 font-bold text-sm mt-2">{host.segment_name}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10 md:py-12 overflow-hidden">
        <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center overflow-hidden">
          <div>
            <p className="text-pink-300 font-black uppercase tracking-wide text-sm sm:text-base">Be on SDTV Radio</p>
            <h2 className="text-3xl md:text-4xl font-black">Want to host, sponsor, or be interviewed?</h2>
            <p className="text-slate-300 mt-2">Reach out to SDTV for radio programming, sponsorships, and community stories.</p>
          </div>
          <a href="/portal" className="bg-pink-600 text-white px-6 py-4 rounded-xl font-black text-center">Contact SDTV</a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

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
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 text-slate-950">
      <SiteHeader />

      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 opacity-25 bg-cover bg-center" style={{ backgroundImage: "url('/hero-sdtv.png')" }} />
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <p className="text-pink-300 font-black uppercase tracking-wide">Seattle Desi Radio</p>
          <h1 className="text-5xl md:text-7xl font-black max-w-4xl leading-tight mt-3">Listen Live</h1>
          <p className="text-xl text-slate-200 max-w-3xl mt-5">Community voices, music, interviews, culture, and Desi weekend vibes from the Pacific Northwest.</p>
          <div className="flex flex-wrap gap-4 mt-8">
            <a href="#listen" className="bg-pink-600 text-white px-6 py-4 rounded-xl font-black">Start Listening</a>
            <a href="#hosts" className="bg-white text-slate-950 px-6 py-4 rounded-xl font-black">Meet Hosts</a>
          </div>
        </div>
      </section>

      <section id="listen" className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="bg-white border rounded-3xl p-8 md:p-10 shadow-sm grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
          <div>
            <p className="text-pink-600 font-black uppercase tracking-wide">On Air</p>
            <h2 className="text-3xl md:text-5xl font-black mt-2">Seattle Desi Radio</h2>
            <p className="text-gray-600 mt-4 text-lg">Tune in for SDTV Radio programming, community interviews, cultural conversations, and music curated for the Seattle Desi community.</p>
            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              <div className="bg-pink-50 rounded-2xl p-4"><p className="font-black text-pink-600">Tue / Thu</p><p className="text-sm text-gray-600 mt-1">6 PM shows</p></div>
              <div className="bg-pink-50 rounded-2xl p-4"><p className="font-black text-pink-600">DJ Loki</p><p className="text-sm text-gray-600 mt-1">10 PM vibe</p></div>
              <div className="bg-pink-50 rounded-2xl p-4"><p className="font-black text-pink-600">Replays</p><p className="text-sm text-gray-600 mt-1">Evenings + weekends</p></div>
            </div>
          </div>
          <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div><p className="text-pink-300 font-black uppercase tracking-wide text-sm">Live Stream</p><h3 className="text-2xl font-black">SDTV Radio Player</h3></div>
              <span className="bg-red-600 text-white rounded-full px-3 py-1 text-xs font-black">LIVE</span>
            </div>
            <iframe title="Seattle Desi Radio" src="https://live365.com/station/Seattle-Desi-Radio-a62710" className="w-full h-[360px] rounded-2xl bg-white" loading="lazy" />
            <a href="https://live365.com/station/Seattle-Desi-Radio-a62710" target="_blank" rel="noreferrer" className="block text-center bg-pink-600 text-white px-5 py-3 rounded-xl font-black mt-5">Open in Live365</a>
          </div>
        </div>
      </section>

      <section id="hosts" className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-pink-600 font-black uppercase tracking-wide">Radio Team</p>
            <h2 className="text-3xl md:text-4xl font-black">Hosts & Segments</h2>
            <p className="text-gray-600 mt-1">Meet the voices behind Seattle Desi Radio.</p>
          </div>
          <a href="/studio/radio-team" className="hidden md:inline-block text-pink-600 font-black">Studio Radio Team →</a>
        </div>
        {loading ? <div className="bg-white border rounded-2xl p-8 text-gray-500">Loading radio hosts...</div> : hosts.length === 0 ? <div className="bg-white border rounded-2xl p-8 text-gray-500">Radio host profiles will appear here after they are added in Studio.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">{hosts.map((host) => { const image = firstImage(host); return <article key={host.id} className="bg-white border rounded-2xl p-5 text-center shadow-sm hover:shadow-xl transition">{image ? <img src={image} alt={host.name} className="w-28 h-28 rounded-full object-cover mx-auto" /> : <div className="w-28 h-28 rounded-full bg-pink-50 text-pink-600 grid place-items-center mx-auto font-black">SDTV</div>}<h3 className="text-xl font-black mt-4">{host.name}</h3>{host.title && <p className="text-gray-600 text-sm mt-1">{host.title}</p>}{host.segment_name && <p className="text-pink-600 font-bold text-sm mt-2">{host.segment_name}</p>}</article>; })}</div>}
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="bg-slate-950 text-white rounded-3xl p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="text-pink-300 font-black uppercase tracking-wide">Be on SDTV Radio</p>
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

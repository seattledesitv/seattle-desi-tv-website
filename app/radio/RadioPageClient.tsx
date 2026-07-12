"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import SafeImage from "../components/SafeImage";
import RadioPlayer from "../components/radio/RadioPlayer";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isPubliclyHidden, loadHiddenUsers } from "../lib/publicVisibility";

const supabase = getSupabaseBrowserClient();

type RadioHost = { id: string; name: string; title?: string | null; segment_name?: string | null; image?: string | null; show_on_public_radio?: boolean | null; email?: string | null; user_id?: string | null };

function isProductionMember(row: RadioHost) {
  const text = `${row.title || ""} ${row.segment_name || ""}`.toLowerCase();
  return text.includes("production") || text.includes("producer") || text.includes("lead");
}

function RadioCard({ host }: { host: RadioHost }) {
  return <article className="bg-white border rounded-2xl p-5 text-center shadow-sm hover:shadow-xl transition">
    <SafeImage src={host.image || ""} alt={host.name} className="w-28 h-28 rounded-full object-cover mx-auto" fallbackClassName="w-28 h-28 rounded-full bg-pink-50 text-pink-600 grid place-items-center mx-auto font-black" fallbackLabel="SDTV" />
    <h3 className="text-xl font-black mt-4">{host.name}</h3>
    {host.title && <p className="text-gray-600 text-sm mt-1">{host.title}</p>}
    {host.segment_name && <p className="text-pink-600 font-bold text-sm mt-2">{host.segment_name}</p>}
  </article>;
}

export default function RadioPageClient() {
  const [hosts, setHosts] = useState<RadioHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManageStudio, setCanManageStudio] = useState(false);

  async function checkStudioAccess() {
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user;
    if (!currentUser) return;
    const adminResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    setCanManageStudio(String(adminResult.data?.role || "").toLowerCase().includes("admin"));
  }

  async function loadHosts() {
    setLoading(true);
    const hidden = await loadHiddenUsers(supabase);
    const modernResult = await supabase.from("radio_team_members").select("id,name,title,segment_name,image,email,user_id,show_on_public_radio").eq("show_on_public_radio", true).order("created_at", { ascending: false });
    if (!modernResult.error) {
      setHosts((modernResult.data || []).filter((row: any) => !isPubliclyHidden(row, hidden)));
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("radio_team_members").select("id,name,title,segment_name,image,email,user_id").order("created_at", { ascending: false });
    setHosts((data || []).filter((row: any) => !isPubliclyHidden(row, hidden)));
    setLoading(false);
  }

  useEffect(() => { loadHosts(); checkStudioAccess(); }, []);

  const productionTeam = hosts.filter(isProductionMember);
  const radioHosts = hosts.filter((host) => !isProductionMember(host));

  return <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-b from-white to-slate-100 text-slate-950">
    <SiteHeader />
    <section className="relative overflow-hidden bg-slate-950 text-white w-full max-w-full">
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
          <p className="mt-5 text-sm font-bold text-slate-500">Press Play to listen directly on Seattle Desi TV.</p>
        </div>
        <div className="min-w-0 w-full"><RadioPlayer /></div>
      </div>
    </section>

    <section id="hosts" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10 md:py-12 overflow-hidden">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div><p className="text-pink-600 font-black uppercase tracking-wide text-sm sm:text-base">Radio Team</p><h2 className="text-3xl md:text-4xl font-black">Hosts & Segments</h2><p className="text-gray-600 mt-1">Meet the voices behind Seattle Desi Radio.</p></div>
        {canManageStudio && <a href="/studio/radio-team" className="hidden md:inline-block text-pink-600 font-black">Studio Radio Team →</a>}
      </div>
      {loading ? <div className="bg-white border rounded-2xl p-8 text-gray-500">Loading radio hosts...</div> : hosts.length === 0 ? <div className="bg-white border rounded-2xl p-8 text-gray-500">Radio host profiles will appear here after they are added in Studio.</div> : <div className="space-y-10">
        {productionTeam.length > 0 && <div><h3 className="text-2xl font-black mb-4">Production Team</h3><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">{productionTeam.map((host) => <RadioCard key={host.id} host={host} />)}</div></div>}
        {radioHosts.length > 0 && <div><h3 className="text-2xl font-black mb-4">Hosts</h3><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">{radioHosts.map((host) => <RadioCard key={host.id} host={host} />)}</div></div>}
      </div>}
    </section>
    <SiteFooter />
  </main>;
}

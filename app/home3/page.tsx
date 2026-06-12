"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

type RecognitionRow = {
  key: string;
  name: string;
  email: string;
  count: number;
  photo?: string | null;
};

const supabase = getSupabaseBrowserClient();

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SD";
}

function medalLabel(index: number) {
  if (index === 0) return "Gold Volunteer";
  if (index === 1) return "Silver Volunteer";
  if (index === 2) return "Bronze Volunteer";
  return "Community Star";
}

function medalFrame(index: number) {
  if (index === 0) return "from-yellow-200 via-amber-400 to-yellow-600 w-44 h-44 md:w-52 md:h-52 shadow-[0_0_70px_rgba(250,204,21,.45)]";
  if (index === 1) return "from-slate-100 via-slate-300 to-slate-500 w-36 h-36 md:w-40 md:h-40";
  if (index === 2) return "from-orange-200 via-amber-700 to-orange-900 w-36 h-36 md:w-40 md:h-40";
  return "from-pink-300 via-pink-600 to-fuchsia-900 w-32 h-32 md:w-36 md:h-36";
}

function MedalCard({ person, index }: { person: RecognitionRow; index: number }) {
  return (
    <a href="/team" className={`group flex flex-col items-center ${index === 0 ? "md:-mt-8" : index > 2 ? "md:mt-16" : "md:mt-10"}`}>
      <div className={`relative rounded-full bg-gradient-to-br ${medalFrame(index)} p-2.5 shadow-2xl transition group-hover:-translate-y-1`}>
        <div className="absolute -left-2 -top-2 z-10 grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-slate-950 text-sm font-black text-white shadow-xl">
          #{index + 1}
        </div>
        <div className="h-full w-full overflow-hidden rounded-full bg-white p-1.5">
          {person.photo ? (
            <img src={person.photo} alt={person.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center rounded-full bg-slate-900 text-3xl font-black text-yellow-300">{initials(person.name)}</div>
          )}
        </div>
      </div>
      <div className="relative z-20 mt-3 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-center shadow-2xl backdrop-blur-md">
        <h3 className="max-w-[13rem] truncate text-sm font-black text-white md:text-base">{person.name}</h3>
        <p className="text-[11px] font-bold uppercase tracking-wide text-yellow-200">{medalLabel(index)} · {person.count} coverage</p>
      </div>
    </a>
  );
}

export default function Home3Page() {
  const [recognition, setRecognition] = useState<RecognitionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecognition() {
      setLoading(true);
      const [profilesResult, completedResult] = await Promise.all([
        supabase.from("volunteer_onboarding_submissions").select("email,full_name,photo_url"),
        supabase.from("event_crew_assignments").select("id,user_email,user_id,coverage_completed,completed_at").eq("coverage_completed", true).order("completed_at", { ascending: false }).limit(250),
      ]);

      const profilesByEmail: Record<string, any> = {};
      (profilesResult.data || []).forEach((profile: any) => {
        if (profile.email) profilesByEmail[String(profile.email).toLowerCase()] = profile;
      });

      const map: Record<string, RecognitionRow> = {};
      (completedResult.data || []).forEach((row: any) => {
        const email = String(row.user_email || "").toLowerCase();
        const key = email || row.user_id || row.id;
        const profile = profilesByEmail[email] || {};
        if (!map[key]) {
          map[key] = {
            key,
            email,
            name: profile.full_name || row.user_email || "SDTV Volunteer",
            photo: profile.photo_url,
            count: 0,
          };
        }
        map[key].count += 1;
      });

      setRecognition(Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5));
      setLoading(false);
    }

    loadRecognition();
  }, []);

  const people = useMemo(() => recognition, [recognition]);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <SiteHeader />

      <section className="relative overflow-hidden bg-[#12040f] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_8%,rgba(0,0,0,.92),transparent_18rem),radial-gradient(circle_at_100%_8%,rgba(0,0,0,.92),transparent_18rem),linear-gradient(100deg,#10040e_0%,#2a0719_45%,#10040e_100%)]" />
        <div className="absolute inset-0 opacity-90 bg-[linear-gradient(115deg,transparent_0_5%,rgba(255,218,73,.58)_14%,rgba(255,239,170,.14)_31%,transparent_46%),linear-gradient(70deg,transparent_0_56%,rgba(255,224,79,.16)_69%,rgba(255,238,166,.62)_84%,transparent_100%),radial-gradient(circle_at_12%_92%,rgba(255,208,52,.44),transparent_17rem),radial-gradient(circle_at_92%_92%,rgba(255,206,44,.38),transparent_17rem)]" />
        <div className="absolute inset-x-[-12%] bottom-[-130px] h-64 rounded-[50%] bg-white" />

        <div className="relative mx-auto grid min-h-[430px] max-w-7xl items-center gap-8 px-6 py-14 md:grid-cols-[.9fr_1.1fr] md:px-10 md:py-16">
          <div className="relative z-10">
            <p className="text-sm font-black uppercase tracking-[.22em] text-yellow-300">SDTV Recognition Wall</p>
            <h1 className="mt-3 text-5xl font-black leading-[.9] tracking-[-.07em] md:text-7xl">
              Thank You<br />Volunteers!
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80 md:text-lg">
              Celebrating the community members who help Seattle Desi TV cover events, tell stories, and support the Pacific Northwest Desi community.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="/recognition" className="rounded-full border border-yellow-300/70 bg-black/35 px-5 py-3 text-sm font-black text-yellow-100 shadow-2xl backdrop-blur">View Recognition →</a>
              <a href="/team" className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur">Meet the Team</a>
            </div>
          </div>

          <div className="relative z-10">
            {loading ? (
              <div className="rounded-3xl border border-white/15 bg-white/10 p-8 text-white/80 backdrop-blur">Loading recognition...</div>
            ) : people.length === 0 ? (
              <div className="rounded-3xl border border-white/15 bg-white/10 p-8 text-white/80 backdrop-blur">Recognition will appear after completed coverage is approved.</div>
            ) : (
              <div className="grid grid-cols-2 items-start justify-items-center gap-x-1 gap-y-4 md:grid-cols-5 md:gap-x-0">
                {people.map((person, index) => <MedalCard key={person.key} person={person} index={index} />)}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          <a href="/events" className="rounded-3xl border bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <p className="text-sm font-black uppercase tracking-wide text-pink-600">Community Calendar</p>
            <h2 className="mt-2 text-2xl font-black">Upcoming Events</h2>
            <p className="mt-2 text-gray-600">Browse approved SDTV community events.</p>
          </a>
          <a href="/radio" className="rounded-3xl border bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <p className="text-sm font-black uppercase tracking-wide text-pink-600">Seattle Desi Radio</p>
            <h2 className="mt-2 text-2xl font-black">Listen Live</h2>
            <p className="mt-2 text-gray-600">Music, interviews, and community voices.</p>
          </a>
          <a href="/businesses" className="rounded-3xl border bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <p className="text-sm font-black uppercase tracking-wide text-pink-600">Marketplace</p>
            <h2 className="mt-2 text-2xl font-black">Local Businesses</h2>
            <p className="mt-2 text-gray-600">Support local Desi businesses.</p>
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

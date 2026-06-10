"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

type TeamMember = { id: string; name: string; title: string; image: string; };
type Spotlight = { key: string; name: string; email: string; count: number; photo?: string; };
type CoverageThanks = { key: string; name: string; email: string; eventTitles: string[]; count: number; photo?: string; };

function startOfWeekMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function previousWeekRange() {
  const thisMonday = startOfWeekMonday(new Date());
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSundayEnd = new Date(thisMonday);
  lastSundayEnd.setMilliseconds(-1);
  return { start: lastMonday, end: lastSundayEnd };
}

function displayName(row: any, profilesByEmail: Record<string, any>) {
  const email = row.user_email || row.email || "";
  return profilesByEmail[email]?.full_name || row.user_name || email || "SDTV Volunteer";
}

export default function PublicTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [topVolunteers, setTopVolunteers] = useState<Spotlight[]>([]);
  const [weeklyThanks, setWeeklyThanks] = useState<CoverageThanks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeam() {
      const [teamResult, assignmentsResult, profilesResult] = await Promise.all([
        supabase.from("team_members").select("id,name,title,image").order("created_at", { ascending: true }),
        supabase.from("event_crew_assignments").select("id,user_id,user_email,event_title,coverage_completed,completed_at,status").eq("coverage_completed", true).order("completed_at", { ascending: false }).limit(500),
        supabase.from("volunteer_onboarding_submissions").select("email,full_name,photo_url"),
      ]);

      if (teamResult.error) setError(teamResult.error.message);
      else setMembers(teamResult.data || []);

      const profilesByEmail: Record<string, any> = {};
      (profilesResult.data || []).forEach((profile: any) => { if (profile.email) profilesByEmail[profile.email] = profile; });

      const completedRows = assignmentsResult.error ? [] : (assignmentsResult.data || []);
      const topMap: Record<string, Spotlight> = {};
      completedRows.forEach((row: any) => {
        const key = row.user_email || row.user_id || row.id;
        const profile = profilesByEmail[row.user_email || ""] || {};
        if (!topMap[key]) topMap[key] = { key, name: displayName(row, profilesByEmail), email: row.user_email || "", count: 0, photo: profile.photo_url };
        topMap[key].count += 1;
      });
      setTopVolunteers(Object.values(topMap).sort((a, b) => b.count - a.count).slice(0, 3));

      const { start, end } = previousWeekRange();
      const thanksMap: Record<string, CoverageThanks> = {};
      completedRows.filter((row: any) => {
        if (!row.completed_at) return false;
        const completed = new Date(row.completed_at);
        return completed >= start && completed <= end;
      }).forEach((row: any) => {
        const key = row.user_email || row.user_id || row.id;
        const profile = profilesByEmail[row.user_email || ""] || {};
        if (!thanksMap[key]) thanksMap[key] = { key, name: displayName(row, profilesByEmail), email: row.user_email || "", eventTitles: [], count: 0, photo: profile.photo_url };
        thanksMap[key].count += 1;
        if (row.event_title && !thanksMap[key].eventTitles.includes(row.event_title)) thanksMap[key].eventTitles.push(row.event_title);
      });
      setWeeklyThanks(Object.values(thanksMap).sort((a, b) => b.count - a.count));
      setLoading(false);
    }
    loadTeam();
  }, []);

  const { start, end } = previousWeekRange();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader />
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center">
            <p className="text-pink-300 font-black uppercase tracking-[0.3em]">Seattle Desi TV</p>
            <h1 className="text-4xl md:text-6xl font-black mt-3">Meet Our Team</h1>
            <p className="text-slate-300 max-w-2xl mx-auto mt-4">The community builders, creators, hosts, volunteers, and media team powering Seattle Desi TV.</p>
          </div>

          {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">Loading team...</div>}
          {error && <div className="bg-red-100 text-red-800 rounded-2xl p-6 mb-8">{error}</div>}

          {!loading && <div className="space-y-12">
            <section className="bg-white/10 border border-white/10 rounded-3xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
                <div>
                  <p className="text-pink-300 font-black uppercase tracking-wide">Team Spotlight</p>
                  <h2 className="text-3xl md:text-4xl font-black mt-2">Top 3 Volunteers</h2>
                  <p className="text-slate-300 mt-2">Recognizing volunteers based on completed SDTV event coverage.</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-5">
                {topVolunteers.map((volunteer, index) => <article key={volunteer.key} className="bg-white text-slate-950 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center gap-4">
                    {volunteer.photo ? <img src={volunteer.photo} alt={volunteer.name} className="w-16 h-16 rounded-2xl object-cover" /> : <div className="w-16 h-16 rounded-2xl bg-pink-50 grid place-items-center text-pink-600 font-black">#{index + 1}</div>}
                    <div>
                      <p className="text-xs font-black uppercase text-pink-600">#{index + 1} Volunteer</p>
                      <h3 className="text-xl font-black">{volunteer.name}</h3>
                      <p className="text-gray-600 text-sm">{volunteer.count} completed coverage item(s)</p>
                    </div>
                  </div>
                </article>)}
                {topVolunteers.length === 0 && <p className="text-slate-300">No completed coverage stats yet.</p>}
              </div>
            </section>

            <section className="bg-white text-slate-950 rounded-3xl p-6 md:p-8">
              <p className="text-pink-600 font-black uppercase tracking-wide">Thank You</p>
              <h2 className="text-3xl md:text-4xl font-black mt-2">Event Coverage Last Week</h2>
              <p className="text-gray-600 mt-2">Coverage completed from {start.toLocaleDateString()} to {end.toLocaleDateString()}.</p>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
                {weeklyThanks.map((person) => <article key={person.key} className="border rounded-2xl p-5 bg-slate-50">
                  <div className="flex gap-4 items-start">
                    {person.photo ? <img src={person.photo} alt={person.name} className="w-14 h-14 rounded-2xl object-cover" /> : <div className="w-14 h-14 rounded-2xl bg-white grid place-items-center text-pink-600 font-black">SDTV</div>}
                    <div>
                      <h3 className="text-xl font-black">{person.name}</h3>
                      <p className="text-gray-600 text-sm">Covered {person.count} event(s)</p>
                    </div>
                  </div>
                  {person.eventTitles.length > 0 && <ul className="list-disc ml-5 mt-4 text-sm text-gray-700 space-y-1">{person.eventTitles.slice(0, 4).map((title) => <li key={title}>{title}</li>)}</ul>}
                </article>)}
                {weeklyThanks.length === 0 && <p className="text-gray-600">No completed coverage was marked for last week yet.</p>}
              </div>
            </section>

            {!error && <section>
              <h2 className="text-3xl font-black mb-5">Team Members</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {members.map((member) => (
                  <article key={member.id} className="bg-white text-slate-950 rounded-2xl overflow-hidden shadow-xl">
                    {member.image ? <img src={member.image} alt={member.name} className="w-full h-72 object-cover" /> : <div className="w-full h-72 bg-pink-50 grid place-items-center text-pink-600 font-black">No image</div>}
                    <div className="p-5">
                      <h2 className="text-xl font-black">{member.name}</h2>
                      <p className="text-pink-600 font-bold mt-1">{member.title}</p>
                    </div>
                  </article>
                ))}
                {members.length === 0 && <p className="text-slate-300">No team members found.</p>}
              </div>
            </section>}
          </div>}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

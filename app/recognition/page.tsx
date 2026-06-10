"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const POINTS_PER_COVERAGE = 10;

type VolunteerScore = {
  key: string;
  name: string;
  email: string;
  photo?: string;
  total: number;
  month: number;
  points: number;
  badge: string;
  lastCompleted?: string | null;
  events: string[];
};

function monthStart() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function previousWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diff);
  thisMonday.setHours(0, 0, 0, 0);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSundayEnd = new Date(thisMonday);
  lastSundayEnd.setMilliseconds(-1);
  return { start: lastMonday, end: lastSundayEnd };
}

function dateText(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function badgeFor(total: number) {
  if (total >= 25) return "Community Legend";
  if (total >= 15) return "Coverage Champion";
  if (total >= 8) return "Story Builder";
  if (total >= 3) return "Rising Star";
  return "First Step";
}

function badgeClass(badge: string) {
  if (badge === "Community Legend") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (badge === "Coverage Champion") return "bg-purple-100 text-purple-800 border-purple-200";
  if (badge === "Story Builder") return "bg-blue-100 text-blue-800 border-blue-200";
  if (badge === "Rising Star") return "bg-green-100 text-green-800 border-green-200";
  return "bg-pink-50 text-pink-700 border-pink-100";
}

function VolunteerAvatar({ person, fallback }: { person: VolunteerScore; fallback: string }) {
  return person.photo ? (
    <img src={person.photo} alt={person.name} className="w-full h-full rounded-2xl object-cover" />
  ) : (
    <div className="w-full h-full rounded-2xl bg-pink-50 grid place-items-center text-pink-600 font-black">{fallback}</div>
  );
}

export default function RecognitionPage() {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<VolunteerScore[]>([]);
  const [message, setMessage] = useState("");

  async function loadRecognition() {
    setLoading(true);
    setMessage("");
    const [assignmentsResult, profilesResult] = await Promise.all([
      supabase
        .from("event_crew_assignments")
        .select("id,user_id,user_email,event_title,coverage_completed,completed_at")
        .eq("coverage_completed", true)
        .order("completed_at", { ascending: false })
        .limit(1000),
      supabase.from("volunteer_onboarding_submissions").select("user_id,email,full_name,photo_url"),
    ]);

    if (assignmentsResult.error) {
      setMessage(`Could not load recognition data: ${assignmentsResult.error.message}`);
      setScores([]);
      setLoading(false);
      return;
    }

    const profilesByEmail: Record<string, any> = {};
    const profilesByUserId: Record<string, any> = {};
    (profilesResult.data || []).forEach((profile: any) => {
      if (profile.email) profilesByEmail[String(profile.email).toLowerCase()] = profile;
      if (profile.user_id) profilesByUserId[profile.user_id] = profile;
    });

    const startOfMonth = monthStart();
    const map: Record<string, VolunteerScore> = {};

    (assignmentsResult.data || []).forEach((row: any) => {
      const profile = profilesByUserId[row.user_id] || profilesByEmail[String(row.user_email || "").toLowerCase()] || {};
      const email = profile.email || row.user_email || "";
      const key = email || row.user_id || row.id;
      const completedDate = row.completed_at ? new Date(row.completed_at) : null;

      if (!map[key]) {
        map[key] = {
          key,
          name: profile.full_name || email || "SDTV Volunteer",
          email,
          photo: profile.photo_url || "",
          total: 0,
          month: 0,
          points: 0,
          badge: "First Step",
          lastCompleted: row.completed_at,
          events: [],
        };
      }

      map[key].total += 1;
      map[key].points = map[key].total * POINTS_PER_COVERAGE;
      map[key].badge = badgeFor(map[key].total);
      if (completedDate && completedDate >= startOfMonth) map[key].month += 1;
      if (row.event_title && !map[key].events.includes(row.event_title)) map[key].events.push(row.event_title);
      if (row.completed_at && (!map[key].lastCompleted || new Date(row.completed_at) > new Date(map[key].lastCompleted || 0))) {
        map[key].lastCompleted = row.completed_at;
      }
    });

    setScores(Object.values(map).sort((a, b) => b.points - a.points || b.total - a.total));
    setLoading(false);
  }

  useEffect(() => { loadRecognition(); }, []);

  const topThree = scores.slice(0, 3);
  const topThisMonth = useMemo(() => [...scores].sort((a, b) => b.month - a.month || b.points - a.points).filter((score) => score.month > 0).slice(0, 5), [scores]);
  const totalPoints = scores.reduce((sum, person) => sum + person.points, 0);
  const totalCoverage = scores.reduce((sum, person) => sum + person.total, 0);
  const { start, end } = previousWeekRange();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader />
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-pink-300 font-black uppercase tracking-[0.3em]">Seattle Desi TV</p>
            <h1 className="text-4xl md:text-6xl font-black mt-3">Volunteer Recognition</h1>
            <p className="text-slate-300 max-w-3xl mx-auto mt-4">Celebrating the volunteers and team members who help cover SDTV community events.</p>
          </div>

          {loading && <div className="bg-white/10 rounded-2xl p-6">Loading recognition...</div>}
          {message && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-5 font-bold mb-6">{message}</div>}

          {!loading && (
            <div className="space-y-10">
              <section className="grid md:grid-cols-3 gap-5">
                <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
                  <p className="text-pink-300 font-black uppercase tracking-wide">Total Points</p>
                  <p className="text-4xl font-black mt-2">{totalPoints}</p>
                  <p className="text-slate-300 text-sm mt-2">10 points for every completed coverage item.</p>
                </div>
                <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
                  <p className="text-pink-300 font-black uppercase tracking-wide">Coverage Completed</p>
                  <p className="text-4xl font-black mt-2">{totalCoverage}</p>
                  <p className="text-slate-300 text-sm mt-2">Marked complete by the SDTV team.</p>
                </div>
                <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
                  <p className="text-pink-300 font-black uppercase tracking-wide">Contributors</p>
                  <p className="text-4xl font-black mt-2">{scores.length}</p>
                  <p className="text-slate-300 text-sm mt-2">Volunteers with completed coverage.</p>
                </div>
              </section>

              <section className="bg-white/10 border border-white/10 rounded-3xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
                  <div>
                    <p className="text-pink-300 font-black uppercase tracking-wide">Leaderboard</p>
                    <h2 className="text-3xl md:text-4xl font-black mt-2">Top 3 Volunteers</h2>
                    <p className="text-slate-300 mt-2">Ranked by points from completed SDTV coverage items.</p>
                  </div>
                  <button onClick={loadRecognition} className="bg-white text-slate-950 px-4 py-2 rounded-xl font-bold w-fit">Refresh</button>
                </div>
                <div className="grid md:grid-cols-3 gap-5">
                  {topThree.map((person, index) => (
                    <article key={person.key} className="bg-white text-slate-950 rounded-2xl p-6 shadow-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 shrink-0"><VolunteerAvatar person={person} fallback={`#${index + 1}`} /></div>
                        <div>
                          <p className="text-xs font-black uppercase text-pink-600">#{index + 1} Volunteer</p>
                          <h3 className="text-2xl font-black">{person.name}</h3>
                          <p className="text-gray-600 text-sm">{person.total} completed coverage item(s)</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className={`border rounded-full px-3 py-1 text-xs font-black ${badgeClass(person.badge)}`}>{person.badge}</span>
                        <span className="bg-slate-100 rounded-full px-3 py-1 text-xs font-black">{person.points} pts</span>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                        <div className="bg-pink-50 rounded-xl p-3">
                          <p className="text-2xl font-black text-pink-600">{person.month}</p>
                          <p className="text-xs font-bold text-gray-600">This Month</p>
                        </div>
                        <div className="bg-slate-100 rounded-xl p-3">
                          <p className="text-sm font-black">{dateText(person.lastCompleted) || "—"}</p>
                          <p className="text-xs font-bold text-gray-600">Last Coverage</p>
                        </div>
                      </div>
                    </article>
                  ))}
                  {topThree.length === 0 && <div className="bg-white text-slate-950 rounded-2xl p-8 md:col-span-3">No completed coverage has been marked yet.</div>}
                </div>
              </section>

              <section className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
                <div className="bg-white text-slate-950 rounded-3xl p-6 md:p-8">
                  <p className="text-pink-600 font-black uppercase tracking-wide">This Month</p>
                  <h2 className="text-3xl font-black mt-2">Monthly Champions</h2>
                  <p className="text-gray-600 mt-2">Volunteers with completed coverage this month.</p>
                  <div className="space-y-3 mt-6">
                    {topThisMonth.map((person, index) => (
                      <div key={person.key} className="flex items-center justify-between gap-3 border rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 shrink-0"><VolunteerAvatar person={person} fallback={`#${index + 1}`} /></div>
                          <div>
                            <p className="font-black">{person.name}</p>
                            <p className="text-gray-600 text-sm">{person.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-pink-600">{person.month}</p>
                          <p className="text-xs font-black text-gray-500">{person.points} pts</p>
                        </div>
                      </div>
                    ))}
                    {topThisMonth.length === 0 && <p className="text-gray-600">No coverage completed this month yet.</p>}
                  </div>
                </div>

                <div className="bg-white text-slate-950 rounded-3xl p-6 md:p-8">
                  <p className="text-pink-600 font-black uppercase tracking-wide">Hall of Fame</p>
                  <h2 className="text-3xl font-black mt-2">All Contributors</h2>
                  <p className="text-gray-600 mt-2">Week window for thank-you section: {start.toLocaleDateString()} to {end.toLocaleDateString()}.</p>
                  <div className="overflow-x-auto mt-6">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 pr-4">Rank</th>
                          <th className="py-3 pr-4">Volunteer</th>
                          <th className="py-3 pr-4">Points</th>
                          <th className="py-3 pr-4">Badge</th>
                          <th className="py-3 pr-4">Total</th>
                          <th className="py-3 pr-4">This Month</th>
                          <th className="py-3 pr-4">Recent Events</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scores.map((person, index) => (
                          <tr key={person.key} className="border-b align-top">
                            <td className="py-4 pr-4 font-black text-pink-600">#{index + 1}</td>
                            <td className="py-4 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 shrink-0"><VolunteerAvatar person={person} fallback="SD" /></div>
                                <div>
                                  <p className="font-black">{person.name}</p>
                                  <p className="text-gray-600 text-xs">{person.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 pr-4 font-black">{person.points}</td>
                            <td className="py-4 pr-4"><span className={`border rounded-full px-3 py-1 text-xs font-black whitespace-nowrap ${badgeClass(person.badge)}`}>{person.badge}</span></td>
                            <td className="py-4 pr-4 font-black">{person.total}</td>
                            <td className="py-4 pr-4 font-black">{person.month}</td>
                            <td className="py-4 pr-4 text-sm text-gray-600">{person.events.slice(0, 3).join(", ") || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {scores.length === 0 && <p className="text-gray-600 mt-4">No contributors yet.</p>}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

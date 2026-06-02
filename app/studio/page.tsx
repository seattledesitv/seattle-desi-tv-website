"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().trim().includes("admin");
}

type DashboardCounts = {
  events: number;
  pendingEvents: number;
  businesses: number;
  pendingBusinesses: number;
  crew: number;
  pendingCrew: number;
  team: number;
  radioTeam: number;
};

const emptyCounts: DashboardCounts = {
  events: 0,
  pendingEvents: 0,
  businesses: 0,
  pendingBusinesses: 0,
  crew: 0,
  pendingCrew: 0,
  team: 0,
  radioTeam: 0,
};

export default function StudioDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking Studio access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [counts, setCounts] = useState<DashboardCounts>(emptyCounts);

  const canAccessStudio = Boolean(user && roleContainsAdmin(role));

  async function loadCounts() {
    const [eventsResult, pendingEventsResult, businessesResult, pendingBusinessesResult, crewResult, pendingCrewResult, teamResult, radioTeamResult] = await Promise.all([
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }).neq("status", "approved"),
      supabase.from("local_businesses").select("id", { count: "exact", head: true }),
      supabase.from("local_businesses").select("id", { count: "exact", head: true }).neq("status", "approved"),
      supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }),
      supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).neq("status", "approved"),
      supabase.from("team_members").select("id", { count: "exact", head: true }),
      supabase.from("radio_team_members").select("id", { count: "exact", head: true }),
    ]);

    const errors = [
      eventsResult.error,
      pendingEventsResult.error,
      businessesResult.error,
      pendingBusinessesResult.error,
      crewResult.error,
      pendingCrewResult.error,
      teamResult.error,
      radioTeamResult.error,
    ].filter(Boolean);

    if (errors.length) {
      setActionMessage(`Some dashboard counts could not load: ${errors.map((error: any) => error.message).join(" | ")}`);
    }

    setCounts({
      events: eventsResult.count || 0,
      pendingEvents: pendingEventsResult.count || 0,
      businesses: businessesResult.count || 0,
      pendingBusinesses: pendingBusinessesResult.count || 0,
      crew: crewResult.count || 0,
      pendingCrew: pendingCrewResult.count || 0,
      team: teamResult.count || 0,
      radioTeam: radioTeamResult.count || 0,
    });
  }

  async function init() {
    setLoading(true);
    setMessage("Checking Studio access...");
    setActionMessage("");

    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);

    if (!currentUser) {
      setRole("");
      setCounts(emptyCounts);
      setMessage("Please login to access Studio.");
      setLoading(false);
      return;
    }

    const adminResult = await supabase
      .from("admins")
      .select("role")
      .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
      .maybeSingle();

    const nextRole = adminResult.data?.role || "";
    setRole(nextRole);

    if (!roleContainsAdmin(nextRole)) {
      setMessage("You are logged in, but this account does not have Studio admin access.");
      setLoading(false);
      return;
    }

    await loadCounts();
    setMessage("");
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut({ scope: "global" });
    try {
      Object.keys(localStorage)
        .filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY)
        .forEach((key) => localStorage.removeItem(key));
      Object.keys(sessionStorage)
        .filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY)
        .forEach((key) => sessionStorage.removeItem(key));
    } catch {}
    window.location.href = "/login";
  }

  useEffect(() => {
    init();
  }, []);

  const modules = [
    {
      title: "Events",
      href: "/studio/events",
      count: counts.events,
      secondary: `${counts.pendingEvents} pending / non-approved`,
      description: "Approve, hold, reject, delete, and review event listings with images.",
    },
    {
      title: "Businesses",
      href: "/studio/businesses",
      count: counts.businesses,
      secondary: `${counts.pendingBusinesses} pending / non-approved`,
      description: "Manage local business listings, offers, websites, images, and approval status.",
    },
    {
      title: "Crew Requests",
      href: "/studio/crew",
      count: counts.crew,
      secondary: `${counts.pendingCrew} pending / non-approved`,
      description: "Approve or reject crew requests and view event details with images.",
    },
    {
      title: "Team",
      href: "/studio/team",
      count: counts.team,
      secondary: "team members",
      description: "Add, edit, delete, and manage public SDTV team profiles.",
    },
    {
      title: "Radio Team",
      href: "/studio/radio-team",
      count: counts.radioTeam,
      secondary: "radio hosts / segments",
      description: "Manage RJ profiles, radio hosts, titles, segments, and images.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <a href="/" className="text-pink-300 font-bold">← Back to Seattle Desi TV</a>
            <h1 className="text-4xl md:text-5xl font-black mt-3">Seattle Desi TV Studio</h1>
            <p className="text-slate-300 mt-2">
              {user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Admin dashboard"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
            {user && <button onClick={logout} className="border border-red-400 text-red-300 px-5 py-3 rounded-xl font-bold">Logout</button>}
          </div>
        </div>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}

        {!loading && !canAccessStudio && (
          <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl">
            <h2 className="text-2xl font-black">Studio Access</h2>
            <p className="text-gray-600 mt-3">{message}</p>
            <a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a>
          </div>
        )}

        {!loading && canAccessStudio && (
          <div className="space-y-8">
            {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}

            <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {modules.map((module) => (
                <a key={module.href} href={module.href} className="bg-white text-slate-950 rounded-2xl p-6 border border-white/10 shadow-xl hover:scale-[1.01] transition block">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black">{module.title}</h2>
                      <p className="text-gray-600 mt-2">{module.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black text-pink-600">{module.count}</p>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">{module.secondary}</p>
                    </div>
                  </div>
                  <div className="mt-6 inline-block bg-slate-950 text-white px-4 py-2 rounded-xl font-bold">Open {module.title}</div>
                </a>
              ))}
            </section>

            <section className="bg-white/10 border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-black">Next Studio Upgrades</h2>
              <div className="grid md:grid-cols-3 gap-4 mt-4 text-slate-200">
                <div className="bg-slate-900 rounded-xl p-4">Cloudinary image upload for Team and Radio Team</div>
                <div className="bg-slate-900 rounded-xl p-4">Dedicated edit pages for Events and Businesses</div>
                <div className="bg-slate-900 rounded-xl p-4">Public Team and Radio pages powered by admin data</div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

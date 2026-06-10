"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

type Counts = {
  events: number;
  businesses: number;
  coverage: number;
  contacts: number;
  roles: number;
  assignments: number;
  availability: number;
  notifications: number;
};

const emptyCounts: Counts = {
  events: 0,
  businesses: 0,
  coverage: 0,
  contacts: 0,
  roles: 0,
  assignments: 0,
  availability: 0,
  notifications: 0,
};

export default function MyHubPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading...");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("general_public");
  const [counts, setCounts] = useState<Counts>(emptyCounts);

  const team = isTeamRole(role);
  const admin = isAdminRole(role);

  async function countQuery(query: any) {
    const result = await query;
    return result.count || 0;
  }

  async function loadHub() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    const nextEmail = user?.email || "";
    setEmail(nextEmail);
    const nextRole = await resolveUserRole(supabase, user);
    setRole(nextRole);

    if (!user?.id) {
      setCounts(emptyCounts);
      setMessage("Please login to access your personalized hub.");
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const [events, businesses, coverage, contacts, roles, assignments, availability, notifications] = await Promise.all([
      countQuery(supabase.from("events").select("id", { count: "exact", head: true }).eq("created_by", user.id)),
      countQuery(supabase.from("local_businesses").select("id", { count: "exact", head: true }).eq("created_by", user.id)),
      countQuery(supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).or(`user_id.eq.${user.id},user_email.eq.${nextEmail}`)),
      countQuery(supabase.from("contact_requests").select("id", { count: "exact", head: true }).ilike("email", nextEmail)),
      countQuery(supabase.from("user_role_requests").select("id", { count: "exact", head: true }).or(`user_id.eq.${user.id},email.eq.${nextEmail}`)),
      countQuery(supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "approved")),
      countQuery(supabase.from("crew_availability").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("available_date", today)),
      countQuery(supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false)),
    ]);

    setCounts({ events, businesses, coverage, contacts, roles, assignments, availability, notifications });
    setMessage("Your SDTV workspace overview.");
    setLoading(false);
  }

  useEffect(() => { loadHub(); }, []);

  const cards = [
    { title: "Portal", note: "General SDTV links and workspace entry point.", href: "/portal", value: "Open" },
    { title: "Volunteer Recognition", note: "Leaderboard, monthly champions, and SDTV hall of fame.", href: "/recognition", value: "View" },
    { title: "My Assignments", note: "Confirm, complete, and track event coverage.", href: "/my-assignments", value: team ? counts.assignments : "Team" },
    { title: "My Availability", note: "Share dates you can support coverage.", href: "/my-availability", value: team ? counts.availability : "Team" },
    { title: "My Events", note: "Events submitted from your account.", href: "/my-events", value: counts.events },
    { title: "My Businesses", note: "Business listings submitted from your account.", href: "/my-businesses", value: counts.businesses },
    { title: "My Coverage", note: "Coverage and crew requests tied to you.", href: "/my-coverage", value: counts.coverage },
    { title: "My Contact Requests", note: "Contact form submissions using your email.", href: "/my-contact-requests", value: counts.contacts },
    { title: "My Role Requests", note: "Team, crew, or access requests submitted by you.", href: "/my-role-requests", value: counts.roles },
    { title: "Notifications", note: "Unread SDTV alerts and updates.", href: "/notifications", value: counts.notifications },
    { title: "Account", note: "Login, role request, and account access.", href: "/login", value: email ? "Signed in" : "Login" },
    { title: "Studio", note: "Admin operations and content management.", href: "/studio", value: admin ? "Admin" : "Locked" },
  ];

  const stats = [
    { title: "Approved Assignments", value: counts.assignments, note: "Event coverage assigned to you." },
    { title: "Coverage Items", value: counts.coverage, note: "Coverage records connected to your account." },
    { title: "Availability Dates", value: counts.availability, note: "Upcoming availability shared by you." },
    { title: "Unread Alerts", value: counts.notifications, note: "Notifications waiting for your review." },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white/10 border border-white/10 rounded-3xl p-8 md:p-10 mb-8">
          <p className="text-pink-300 font-black uppercase tracking-wide">Seattle Desi TV Workspace</p>
          <h1 className="text-4xl md:text-6xl font-black mt-3">My Hub</h1>
          <p className="text-slate-300 max-w-3xl mt-3">One place for your SDTV portal, assignments, availability, notifications, submissions, and account tools.</p>
          <div className="flex flex-wrap gap-3 items-center mt-4">
            <p className="text-slate-400 text-sm">{loading ? "Loading..." : email ? `${email} · ${role}` : message}</p>
            <button onClick={loadHub} className="bg-white text-slate-950 px-4 py-2 rounded-xl font-bold text-sm">Refresh</button>
          </div>
        </div>

        {!loading && team && <section className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
            <div>
              <p className="text-pink-300 font-black uppercase tracking-wide">My SDTV Stats</p>
              <h2 className="text-3xl font-black mt-2">Coverage Scoreboard</h2>
              <p className="text-slate-300 mt-1">Your SDTV assignments, availability, and alerts at a glance.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/recognition" className="bg-white text-slate-950 px-4 py-2 rounded-xl font-bold w-fit">View Recognition</a>
              <a href="/my-assignments" className="bg-pink-600 text-white px-4 py-2 rounded-xl font-bold w-fit">Open Assignments</a>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {stats.map((stat) => <div key={stat.title} className="bg-white text-slate-950 rounded-2xl p-5">
              <p className="text-sm text-gray-500 font-black uppercase">{stat.title}</p>
              <p className="text-4xl font-black text-pink-600 mt-2">{stat.value}</p>
              <p className="text-gray-600 text-sm mt-2">{stat.note}</p>
            </div>)}
          </div>
        </section>}

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map((card) => (
            <a key={card.href + card.title} href={card.href} className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl border hover:scale-[1.01] transition block">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><h2 className="text-2xl font-black">{card.title}</h2><p className="text-gray-600 mt-2">{card.note}</p></div>
                <span className="bg-pink-50 text-pink-600 rounded-full px-4 py-1 text-sm font-black whitespace-nowrap shrink-0 text-center min-w-10">{card.value}</span>
              </div>
            </a>
          ))}
        </div>

        {!loading && !email && <div className="bg-white text-slate-950 rounded-3xl p-8 mt-8"><h2 className="text-2xl font-black">Login required</h2><p className="text-gray-600 mt-2">Login to see your submissions, requests, assignments, and notifications.</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}
      </div>
      <SiteFooter />
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

type Counts = {
  totalEvents: number;
  approvedEvents: number;
  pendingEvents: number;
  eventsThisMonth: number;
  totalBusinesses: number;
  approvedBusinesses: number;
  pendingBusinesses: number;
  coverageRequests: number;
  approvedCoverage: number;
  pendingCoverage: number;
  crewRequests: number;
  approvedCrew: number;
  completedCoverage: number;
  teamMembers: number;
  radioTeam: number;
  admins: number;
  roleRequests: number;
  pendingRoleRequests: number;
  approvedRoleRequests: number;
  notificationsUnread: number;
};

const emptyCounts: Counts = {
  totalEvents: 0,
  approvedEvents: 0,
  pendingEvents: 0,
  eventsThisMonth: 0,
  totalBusinesses: 0,
  approvedBusinesses: 0,
  pendingBusinesses: 0,
  coverageRequests: 0,
  approvedCoverage: 0,
  pendingCoverage: 0,
  crewRequests: 0,
  approvedCrew: 0,
  completedCoverage: 0,
  teamMembers: 0,
  radioTeam: 0,
  admins: 0,
  roleRequests: 0,
  pendingRoleRequests: 0,
  approvedRoleRequests: 0,
  notificationsUnread: 0,
};

function monthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

function nextThirtyDaysIso() {
  const next = new Date();
  next.setDate(next.getDate() + 30);
  return next.toISOString().split("T")[0];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function MetricCard({ title, value, note }: { title: string; value: number; note?: string }) {
  return (
    <div className="bg-white text-slate-950 rounded-2xl p-5 shadow-xl border border-white/10">
      <p className="text-sm font-black uppercase tracking-wide text-gray-500">{title}</p>
      <p className="text-4xl font-black text-pink-600 mt-2">{value}</p>
      {note && <p className="text-sm text-gray-500 mt-2">{note}</p>}
    </div>
  );
}

export default function StudioAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading analytics...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const canAccess = Boolean(user && isAdminRole(role));

  async function countQuery(query: any) {
    const result = await query;
    return result.count || 0;
  }

  async function loadAnalytics(currentUser: any) {
    const start = monthStartIso();
    const today = todayIso();
    const next30 = nextThirtyDaysIso();

    const [
      totalEvents,
      approvedEvents,
      pendingEvents,
      eventsThisMonth,
      totalBusinesses,
      approvedBusinesses,
      pendingBusinesses,
      coverageRequests,
      approvedCoverage,
      pendingCoverage,
      crewRequests,
      approvedCrew,
      completedCoverage,
      teamMembers,
      radioTeam,
      admins,
      roleRequests,
      pendingRoleRequests,
      approvedRoleRequests,
      notificationsUnread,
      upcomingResult,
    ] = await Promise.all([
      countQuery(supabase.from("events").select("id", { count: "exact", head: true })),
      countQuery(supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "approved")),
      countQuery(supabase.from("events").select("id", { count: "exact", head: true }).or("status.is.null,status.eq.pending")),
      countQuery(supabase.from("events").select("id", { count: "exact", head: true }).gte("date", start)),
      countQuery(supabase.from("local_businesses").select("id", { count: "exact", head: true })),
      countQuery(supabase.from("local_businesses").select("id", { count: "exact", head: true }).eq("status", "approved")),
      countQuery(supabase.from("local_businesses").select("id", { count: "exact", head: true }).or("status.is.null,status.eq.pending")),
      countQuery(supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("assignment_type", "owner_coverage_request")),
      countQuery(supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("assignment_type", "owner_coverage_request").eq("status", "approved")),
      countQuery(supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("assignment_type", "owner_coverage_request").or("status.is.null,status.eq.pending")),
      countQuery(supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("assignment_type", "team_member_request")),
      countQuery(supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("assignment_type", "team_member_request").eq("status", "approved")),
      countQuery(supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("coverage_completed", true)),
      countQuery(supabase.from("team_members").select("id", { count: "exact", head: true })),
      countQuery(supabase.from("radio_team_members").select("id", { count: "exact", head: true })),
      countQuery(supabase.from("admins").select("user_id", { count: "exact", head: true })),
      countQuery(supabase.from("user_role_requests").select("id", { count: "exact", head: true })),
      countQuery(supabase.from("user_role_requests").select("id", { count: "exact", head: true }).or("status.is.null,status.eq.pending")),
      countQuery(supabase.from("user_role_requests").select("id", { count: "exact", head: true }).eq("status", "approved")),
      countQuery(supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", currentUser.id).eq("read", false)),
      supabase.from("events").select("id,title,date,location,status").eq("status", "approved").gte("date", today).lte("date", next30).order("date", { ascending: true }).limit(10),
    ]);

    setCounts({ totalEvents, approvedEvents, pendingEvents, eventsThisMonth, totalBusinesses, approvedBusinesses, pendingBusinesses, coverageRequests, approvedCoverage, pendingCoverage, crewRequests, approvedCrew, completedCoverage, teamMembers, radioTeam, admins, roleRequests, pendingRoleRequests, approvedRoleRequests, notificationsUnread });
    setUpcomingEvents(upcomingResult.data || []);
    if (upcomingResult.error) setMessage(`Analytics loaded, but upcoming events failed: ${upcomingResult.error.message}`);
    else setMessage("");
  }

  async function init() {
    setLoading(true);
    setMessage("Loading analytics...");
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to view analytics."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage(`Studio analytics requires admin access. Current role: ${nextRole}`); setLoading(false); return; }
    await loadAnalytics(currentUser);
    setLoading(false);
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black">Studio Analytics</h1>
            <p className="text-slate-300 mt-2">Operational dashboard for Seattle Desi TV.</p>
            {user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role}</p>}
          </div>
          <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
        </div>

        {loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}<br /><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}

        {!loading && canAccess && <div className="space-y-8">
          {message && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{message}</div>}

          <section>
            <h2 className="text-2xl font-black mb-4">Events</h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
              <MetricCard title="Total Events" value={counts.totalEvents} />
              <MetricCard title="Approved Events" value={counts.approvedEvents} />
              <MetricCard title="Pending Events" value={counts.pendingEvents} />
              <MetricCard title="Events This Month" value={counts.eventsThisMonth} />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">Businesses</h2>
            <div className="grid md:grid-cols-3 gap-5">
              <MetricCard title="Total Businesses" value={counts.totalBusinesses} />
              <MetricCard title="Approved Businesses" value={counts.approvedBusinesses} />
              <MetricCard title="Pending Businesses" value={counts.pendingBusinesses} />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">Coverage & Crew</h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              <MetricCard title="Coverage Requests" value={counts.coverageRequests} />
              <MetricCard title="Pending Coverage" value={counts.pendingCoverage} />
              <MetricCard title="Approved Coverage" value={counts.approvedCoverage} />
              <MetricCard title="Crew Requests" value={counts.crewRequests} />
              <MetricCard title="Approved Crew" value={counts.approvedCrew} />
              <MetricCard title="Completed Coverage" value={counts.completedCoverage} />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">People & Roles</h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
              <MetricCard title="Team Members" value={counts.teamMembers} />
              <MetricCard title="Radio Team" value={counts.radioTeam} />
              <MetricCard title="Admins" value={counts.admins} />
              <MetricCard title="Unread Notifications" value={counts.notificationsUnread} />
              <MetricCard title="Role Requests" value={counts.roleRequests} />
              <MetricCard title="Pending Roles" value={counts.pendingRoleRequests} />
              <MetricCard title="Approved Roles" value={counts.approvedRoleRequests} />
            </div>
          </section>

          <section className="bg-white text-slate-950 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-black">Upcoming Events: Next 30 Days</h2>
              <a href="/studio/events" className="text-pink-600 font-bold">Open Events</a>
            </div>
            <div className="grid gap-3">
              {upcomingEvents.map((event) => <a key={event.id} href={`/studio/events/${event.id}`} className="border rounded-xl p-4 hover:bg-pink-50"><p className="font-black">{event.title}</p><p className="text-sm text-gray-600">{event.date} · {event.location}</p></a>)}
              {upcomingEvents.length === 0 && <p className="text-gray-500">No approved upcoming events in the next 30 days.</p>}
            </div>
          </section>

          <section className="bg-white/10 border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-black">Pending Approval Summary</h2>
            <div className="grid md:grid-cols-5 gap-4 mt-5">
              <a href="/studio/events/pending" className="bg-slate-900 rounded-xl p-4 font-bold">Events: {counts.pendingEvents}</a>
              <a href="/studio/businesses" className="bg-slate-900 rounded-xl p-4 font-bold">Businesses: {counts.pendingBusinesses}</a>
              <a href="/studio/coverage" className="bg-slate-900 rounded-xl p-4 font-bold">Coverage: {counts.pendingCoverage}</a>
              <a href="/studio/crew/pending" className="bg-slate-900 rounded-xl p-4 font-bold">Crew: {counts.crewRequests}</a>
              <a href="/studio/roles" className="bg-slate-900 rounded-xl p-4 font-bold">Roles: {counts.pendingRoleRequests}</a>
            </div>
          </section>
        </div>}
      </div>
    </main>
  );
}

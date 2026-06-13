"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../components/StudioHeader";
import { getSupabaseBrowserClient, AUTH_STORAGE_KEY } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

type DashboardCounts = { events: number; pendingEvents: number; approvedEvents: number; onHoldEvents: number; rejectedEvents: number; businesses: number; pendingBusinesses: number; crew: number; pendingCrew: number; volunteers: number; pendingVolunteers: number; team: number; radioTeam: number; roleRequests: number; coverageRequests: number; coverageCompleted: number; coverageCompletedThisMonth: number; coverageCompletionRate: number; videoWorkflows: number; videoAdminApprovals: number; videoCrewReviews: number; videoPublishingReady: number; };
const emptyCounts: DashboardCounts = { events: 0, pendingEvents: 0, approvedEvents: 0, onHoldEvents: 0, rejectedEvents: 0, businesses: 0, pendingBusinesses: 0, crew: 0, pendingCrew: 0, volunteers: 0, pendingVolunteers: 0, team: 0, radioTeam: 0, roleRequests: 0, coverageRequests: 0, coverageCompleted: 0, coverageCompletedThisMonth: 0, coverageCompletionRate: 0, videoWorkflows: 0, videoAdminApprovals: 0, videoCrewReviews: 0, videoPublishingReady: 0 };

function monthStartIso() { const date = new Date(); date.setDate(1); date.setHours(0, 0, 0, 0); return date.toISOString(); }

export default function StudioDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking Studio access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [counts, setCounts] = useState<DashboardCounts>(emptyCounts);
  const canAccessStudio = Boolean(user && isAdminRole(role));

  async function loadCounts() {
    const [eventsResult, pendingEventsResult, approvedEventsResult, onHoldEventsResult, rejectedEventsResult, businessesResult, pendingBusinessesResult, crewResult, pendingCrewResult, volunteersResult, pendingVolunteersResult, teamResult, radioTeamResult, roleRequestsResult, coverageRequestsResult, coverageCompletedResult, coverageCompletedThisMonthResult, videoWorkflowsResult, videoAdminApprovalsResult, videoCrewReviewsResult, videoPublishingReadyResult] = await Promise.all([
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }).or("status.is.null,status.eq.pending"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "on_hold"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("local_businesses").select("id", { count: "exact", head: true }),
      supabase.from("local_businesses").select("id", { count: "exact", head: true }).or("status.is.null,status.eq.pending"),
      supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }),
      supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).or("status.is.null,status.eq.pending"),
      supabase.from("user_role_requests").select("id", { count: "exact", head: true }).eq("requested_role", "volunteer"),
      supabase.from("user_role_requests").select("id", { count: "exact", head: true }).eq("requested_role", "volunteer").in("status", ["awaiting_orientation", "awaiting_onboarding", "awaiting_team_role_access", "pending"]),
      supabase.from("team_members").select("id", { count: "exact", head: true }),
      supabase.from("radio_team_members").select("id", { count: "exact", head: true }),
      supabase.from("user_role_requests").select("id", { count: "exact", head: true }).neq("requested_role", "volunteer").or("status.is.null,status.eq.pending"),
      supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("assignment_type", "owner_coverage_request").or("status.is.null,status.eq.pending"),
      supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("coverage_completed", true),
      supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("coverage_completed", true).gte("completed_at", monthStartIso()),
      supabase.from("event_video_workflows").select("id", { count: "exact", head: true }),
      supabase.from("event_video_workflows").select("id", { count: "exact", head: true }).eq("status", "awaiting_admin_approval"),
      supabase.from("event_video_workflows").select("id", { count: "exact", head: true }).eq("status", "awaiting_crew_review"),
      supabase.from("event_video_workflows").select("id", { count: "exact", head: true }).eq("status", "approved_for_publishing"),
    ]);
    const errors = [eventsResult.error, pendingEventsResult.error, approvedEventsResult.error, onHoldEventsResult.error, rejectedEventsResult.error, businessesResult.error, pendingBusinessesResult.error, crewResult.error, pendingCrewResult.error, volunteersResult.error, pendingVolunteersResult.error, teamResult.error, radioTeamResult.error, roleRequestsResult.error, coverageRequestsResult.error, coverageCompletedResult.error, coverageCompletedThisMonthResult.error, videoWorkflowsResult.error, videoAdminApprovalsResult.error, videoCrewReviewsResult.error, videoPublishingReadyResult.error].filter(Boolean);
    if (errors.length) setActionMessage(`Some dashboard counts could not load: ${errors.map((error: any) => error.message).join(" | ")}`);
    const crew = crewResult.count || 0;
    const completed = coverageCompletedResult.count || 0;
    setCounts({ events: eventsResult.count || 0, pendingEvents: pendingEventsResult.count || 0, approvedEvents: approvedEventsResult.count || 0, onHoldEvents: onHoldEventsResult.count || 0, rejectedEvents: rejectedEventsResult.count || 0, businesses: businessesResult.count || 0, pendingBusinesses: pendingBusinessesResult.count || 0, crew, pendingCrew: pendingCrewResult.count || 0, volunteers: volunteersResult.count || 0, pendingVolunteers: pendingVolunteersResult.count || 0, team: teamResult.count || 0, radioTeam: radioTeamResult.count || 0, roleRequests: roleRequestsResult.count || 0, coverageRequests: coverageRequestsResult.count || 0, coverageCompleted: completed, coverageCompletedThisMonth: coverageCompletedThisMonthResult.count || 0, coverageCompletionRate: crew ? Math.round((completed / crew) * 100) : 0, videoWorkflows: videoWorkflowsResult.count || 0, videoAdminApprovals: videoAdminApprovalsResult.count || 0, videoCrewReviews: videoCrewReviewsResult.count || 0, videoPublishingReady: videoPublishingReadyResult.count || 0 });
  }

  async function init() {
    setLoading(true); setMessage("Checking Studio access..."); setActionMessage("");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setRole(""); setCounts(emptyCounts); setMessage("Please login to access Studio."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("You are logged in, but this account does not have Studio admin access."); setLoading(false); return; }
    await loadCounts(); setMessage(""); setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut({ scope: "global" });
    try { Object.keys(localStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY).forEach((key) => localStorage.removeItem(key)); Object.keys(sessionStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY).forEach((key) => sessionStorage.removeItem(key)); } catch {}
    window.location.href = "/login";
  }

  useEffect(() => { init(); }, []);

  const attentionCards = [
    { title: "Pending Events", href: "/studio/events/pending", count: counts.pendingEvents, description: "Review new event submissions." },
    { title: "Pending Businesses", href: "/studio/businesses?status=pending", count: counts.pendingBusinesses, description: "Review business listings." },
    { title: "Volunteers", href: "/studio/volunteers", count: counts.pendingVolunteers, description: "Complete orientation and approve onboarding." },
    { title: "Role Requests", href: "/studio/roles", count: counts.roleRequests, description: "Approve public and SDTV team member roles." },
    { title: "Coverage Requests", href: "/studio/coverage", count: counts.coverageRequests, description: "Review organizer requests for SDTV coverage." },
    { title: "Pending Crew", href: "/studio/crew/pending", count: counts.pendingCrew, description: "Review team member coverage requests." },
    { title: "Video Approvals", href: "/studio/video-production?status=awaiting_admin_approval", count: counts.videoAdminApprovals, description: "Final approve crew-reviewed videos before publishing." },
  ];

  const coverageStats = [
    { title: "Completed Coverage", value: counts.coverageCompleted, note: "All completed crew coverage items." },
    { title: "This Month", value: counts.coverageCompletedThisMonth, note: "Completed coverage this month." },
    { title: "Pending Crew", value: counts.pendingCrew, note: "Crew requests needing review." },
    { title: "Completion Rate", value: `${counts.coverageCompletionRate}%`, note: "Completed vs total crew records." },
  ];

  const modules = [
    { title: "All Events", href: "/studio/events", count: counts.events, secondary: `${counts.approvedEvents} approved · ${counts.onHoldEvents} on hold · ${counts.rejectedEvents} rejected`, description: "Filter, calendar-view, approve, hold, reject, delete, and edit events." },
    { title: "Businesses", href: "/studio/businesses", count: counts.businesses, secondary: `${counts.pendingBusinesses} pending / non-approved`, description: "Manage local business listings, offers, websites, images, and approval status." },
    { title: "Volunteers", href: "/studio/volunteers", count: counts.volunteers, secondary: `${counts.pendingVolunteers} need action`, description: "Manage volunteer orientation, onboarding submissions, and final team access." },
    { title: "Coverage Requests", href: "/studio/coverage", count: counts.coverageRequests, secondary: "organizer requests", description: "Approve, hold, or decline SDTV coverage requests from event owners." },
    { title: "Crew Requests", href: "/studio/crew/pending", count: counts.pendingCrew, secondary: `${counts.crew} total`, description: "Approve or reject crew requests and assign team members to events." },
    { title: "Video Production", href: "/studio/video-production", count: counts.videoWorkflows, secondary: `${counts.videoCrewReviews} crew review · ${counts.videoAdminApprovals} admin approval · ${counts.videoPublishingReady} ready to publish`, description: "Manage event video editing, revisions, crew review, final approval, and publishing." },
    { title: "Assignments Calendar", href: "/studio/assignments-calendar", count: counts.events, secondary: "monthly schedule", description: "View event assignments with crew availability by date." },
    { title: "Role Requests", href: "/studio/roles", count: counts.roleRequests, secondary: "pending approvals", description: "Approve team-member requests and assign final account roles." },
    { title: "Team", href: "/studio/team", count: counts.team, secondary: "team members", description: "Add, edit, delete, and manage public SDTV team profiles." },
    { title: "Radio Team", href: "/studio/radio-team", count: counts.radioTeam, secondary: "radio hosts / segments", description: "Manage RJ profiles, radio hosts, titles, segments, and images." },
  ];

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="max-w-7xl mx-auto px-6 py-10"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><h1 className="text-4xl md:text-5xl font-black">Seattle Desi TV Studio</h1><p className="text-slate-300 mt-2">{user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Admin dashboard"}</p></div><div className="flex flex-wrap gap-3"><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>{user && <button onClick={logout} className="border border-red-400 text-red-300 px-5 py-3 rounded-xl font-bold">Logout</button>}</div></div>{loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccessStudio && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Studio Access</h2><p className="text-gray-600 mt-3">{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}{!loading && canAccessStudio && <div className="space-y-8">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<section><h2 className="text-2xl font-black mb-4">Team Coverage Stats</h2><div className="grid md:grid-cols-4 gap-5">{coverageStats.map((stat) => <div key={stat.title} className="bg-white text-slate-950 rounded-2xl p-6 shadow-xl"><p className="text-sm font-black uppercase tracking-wide text-gray-500">{stat.title}</p><p className="text-5xl font-black text-pink-600 mt-3">{stat.value}</p><p className="text-gray-600 mt-3 font-semibold">{stat.note}</p></div>)}</div></section><section><h2 className="text-2xl font-black mb-4">Needs Attention</h2><div className="grid md:grid-cols-2 xl:grid-cols-7 gap-5">{attentionCards.map((card) => <a key={card.href} href={card.href} className="bg-pink-600 text-white rounded-2xl p-6 shadow-xl hover:scale-[1.01] transition block"><p className="text-sm font-black uppercase tracking-wide opacity-80">{card.title}</p><p className="text-5xl font-black mt-3">{card.count}</p><p className="mt-3 font-semibold opacity-90">{card.description}</p><div className="mt-5 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 whitespace-nowrap">
  Review Now
</div></a>)}</div></section><section><h2 className="text-2xl font-black mb-4">Studio Modules</h2><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{modules.map((module) => <a key={module.href} href={module.href} className="bg-white text-slate-950 rounded-2xl p-6 border border-white/10 shadow-xl hover:scale-[1.01] transition block"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black">{module.title}</h2><p className="text-gray-600 mt-2">{module.description}</p></div><div className="text-right"><p className="text-4xl font-black text-pink-600">{module.count}</p><p className="text-xs text-gray-500 font-bold uppercase tracking-wide">{module.secondary}</p></div></div><div className="mt-6 inline-block bg-slate-950 text-white px-4 py-2 rounded-xl font-bold">Open {module.title}</div></a>)}</div></section><section className="bg-white/10 border border-white/10 rounded-2xl p-6"><h2 className="text-2xl font-black">Public Pages</h2><div className="grid md:grid-cols-3 gap-4 mt-4 text-slate-200"><a href="/events" className="bg-slate-900 rounded-xl p-4 font-bold">Public Events</a><a href="/team" className="bg-slate-900 rounded-xl p-4 font-bold">Public Team</a><a href="/radio-team" className="bg-slate-900 rounded-xl p-4 font-bold">Public Radio Team</a></div></section></div>}</div></main>;
}

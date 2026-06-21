"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isTeamRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

function statusText(value?: string | null) {
  const text = String(value || "pending").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dateText(value?: string | null) {
  if (!value) return "Date TBD";
  const d = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function MyCoveragePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [message, setMessage] = useState("Loading coverage opportunities...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const canRequest = Boolean(user && isTeamRole(role));

  const coverageRequests = useMemo(() => assignments.filter((row) => row.assignment_type === "owner_coverage_request" && String(row.status || "").toLowerCase() === "approved"), [assignments]);
  const opportunities = useMemo(() => {
    const approvedCoverageEventIds = new Set(coverageRequests.map((row) => row.event_id).filter(Boolean));
    return events.filter((event) => approvedCoverageEventIds.has(event.id));
  }, [events, coverageRequests]);

  function statsForEvent(eventId: string) {
    const rows = assignments.filter((row) => row.event_id === eventId);
    const userRows = rows.filter((row) => row.user_id === user?.id || String(row.user_email || "").toLowerCase() === String(user?.email || "").toLowerCase());
    return {
      crewRequested: rows.filter((row) => row.assignment_type === "team_member_request").length,
      crewApproved: rows.filter((row) => String(row.status || "").toLowerCase() === "approved" && row.assignment_type !== "owner_coverage_request").length,
      myRequest: userRows.find((row) => row.assignment_type === "team_member_request"),
      myAssignment: userRows.find((row) => String(row.status || "").toLowerCase() === "approved" && row.assignment_type !== "owner_coverage_request"),
    };
  }

  async function loadRows() {
    const { data: auth } = await supabase.auth.getUser();
    const currentUser = auth?.user || null;
    setUser(currentUser);
    const currentRole = await resolveUserRole(supabase, currentUser);
    setRole(currentRole);
    if (!currentUser?.id) { setMessage("Please login to view coverage opportunities."); return; }
    if (!isTeamRole(currentRole)) { setMessage(`Coverage opportunities are for approved SDTV team members. Current role: ${currentRole}`); return; }

    const [eventsResult, assignmentsResult] = await Promise.all([
      supabase.from("events").select("id,title,date,location,description,status,poc_email,poc_phone,ticket_url").eq("status", "approved").order("date", { ascending: true }).limit(200),
      supabase.from("event_crew_assignments").select("id,event_id,event_title,assignment_type,status,user_id,user_email,created_at").order("created_at", { ascending: false }).limit(1000),
    ]);

    if (eventsResult.error) { setMessage(eventsResult.error.message); return; }
    if (assignmentsResult.error) { setMessage(assignmentsResult.error.message); return; }
    setEvents(eventsResult.data || []);
    setAssignments(assignmentsResult.data || []);
    setMessage("Events where SDTV coverage has been approved and team members can request to join the crew.");
  }

  async function requestCrew(event: any) {
    if (!user?.id || !user?.email) { setActionMessage("Please login before requesting to join crew."); return; }
    setActionMessage("Submitting crew request...");
    const { error } = await supabase.from("event_crew_assignments").insert({
      event_id: event.id,
      event_title: event.title,
      user_id: user.id,
      user_email: user.email,
      assignment_type: "team_member_request",
      status: "pending",
    });
    if (error) { setActionMessage(`Request failed: ${error.message}`); return; }
    setActionMessage("Crew request submitted. Admin will review it in Event Ops.");
    await loadRows();
  }

  useEffect(() => { loadRows(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p>
          <h1 className="text-4xl md:text-5xl font-black mt-2">Coverage Opportunities</h1>
          <p className="text-slate-300 mt-2">{message}</p>
        </div>
        {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold mb-6">{actionMessage}</div>}
        {!canRequest ? <div className="bg-white text-slate-950 rounded-3xl p-8">Login as an approved SDTV team member to request crew coverage opportunities.</div> : opportunities.length === 0 ? <div className="bg-white text-slate-950 rounded-3xl p-8">No approved coverage opportunities are available right now.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {opportunities.map((event) => {
            const stats = statsForEvent(event.id);
            const alreadyAssigned = Boolean(stats.myAssignment);
            const alreadyRequested = Boolean(stats.myRequest);
            return <article key={event.id} className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-2xl font-black">{event.title}</h2><p className="text-gray-600 mt-1">{dateText(event.date)} · {event.location || "Location TBD"}</p></div>
                <span className="text-xs font-black bg-pink-50 text-pink-700 px-3 py-1 rounded-full">Coverage Needed</span>
              </div>
              {event.description && <p className="text-sm text-gray-600 mt-4 line-clamp-3">{event.description}</p>}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-2xl font-black">{stats.crewRequested}</p><p className="text-xs text-gray-500 font-bold">Crew Requests</p></div>
                <div className="bg-green-50 rounded-xl p-3"><p className="text-2xl font-black">{stats.crewApproved}</p><p className="text-xs text-gray-500 font-bold">Approved Crew</p></div>
              </div>
              <div className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-gray-700">
                <p><b>Coverage:</b> Approved by SDTV</p>
                <p><b>Your status:</b> {alreadyAssigned ? "Assigned" : alreadyRequested ? statusText(stats.myRequest?.status) : "Not requested"}</p>
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <a href={`/events/${event.id}`} className="border border-slate-900 px-4 py-2 rounded-lg font-bold text-sm">View Event</a>
                {event.location && <a href={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}`} target="_blank" rel="noreferrer" className="border border-slate-900 px-4 py-2 rounded-lg font-bold text-sm">Map</a>}
                {alreadyAssigned ? <a href="/my-assignments" className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Open Assignment</a> : alreadyRequested ? <button disabled className="bg-slate-200 text-slate-500 px-4 py-2 rounded-lg font-bold text-sm">Request Pending</button> : <button onClick={() => requestCrew(event)} className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Request To Join Crew</button>}
              </div>
            </article>;
          })}
        </div>}
      </section>
      <SiteFooter />
    </main>
  );
}

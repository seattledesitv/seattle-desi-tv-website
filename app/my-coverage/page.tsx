"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isTeamRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

function statusText(value?: string | null) { const text = String(value || "pending").replaceAll("_", " "); return text.charAt(0).toUpperCase() + text.slice(1); }
function dateText(value?: string | null) { if (!value) return "Date TBD"; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
function dateInput(value?: string | null) { return String(value || "").split("T")[0]; }
function monthInput(value?: string | null) { return dateInput(value).slice(0, 7); }
function eventImages(row: any) { const urls = Array.isArray(row?.image_urls) ? row.image_urls.filter(Boolean) : []; if (row?.image && !urls.includes(row.image)) urls.unshift(row.image); return urls; }
function FieldRow({ label, value }: { label: string; value: any }) { return <p><b>{label}:</b><br />{value || "—"}</p>; }

export default function MyCoveragePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [message, setMessage] = useState("Loading coverage opportunities...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [selectedId, setSelectedId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const canRequest = Boolean(user && isTeamRole(role));

  const coverageRequests = useMemo(() => assignments.filter((row) => row.assignment_type === "owner_coverage_request" && String(row.status || "").toLowerCase() === "approved"), [assignments]);
  const opportunities = useMemo(() => {
    const approvedCoverageEventIds = new Set(coverageRequests.map((row) => row.event_id).filter(Boolean));
    return events.filter((event) => approvedCoverageEventIds.has(event.id));
  }, [events, coverageRequests]);

  const filteredOpportunities = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return opportunities.filter((event) => {
      const status = String(event.status || "approved").toLowerCase();
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (monthFilter && monthInput(event.date) !== monthFilter) return false;
      if (!q) return true;
      return [event.title, event.location, event.description, event.status, event.poc_email, event.poc_phone].some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [opportunities, searchText, monthFilter, statusFilter]);

  const selectedEvent = opportunities.find((event) => event.id === selectedId) || filteredOpportunities[0] || null;

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
      supabase.from("events").select("id,title,date,location,description,status,poc_email,poc_phone,ticket_url,image,image_urls").eq("status", "approved").order("date", { ascending: true }).limit(200),
      supabase.from("event_crew_assignments").select("id,event_id,event_title,assignment_type,status,user_id,user_email,created_at").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (eventsResult.error) { setMessage(eventsResult.error.message); return; }
    if (assignmentsResult.error) { setMessage(assignmentsResult.error.message); return; }
    const nextEvents = eventsResult.data || [];
    setEvents(nextEvents);
    setAssignments(assignmentsResult.data || []);
    setMessage("Browse approved SDTV coverage opportunities and request to join as crew.");
  }

  async function requestCrew(event: any) {
    if (!user?.id || !user?.email) { setActionMessage("Please login before requesting to join crew."); return; }
    setActionMessage("Submitting crew request...");
    const { error } = await supabase.from("event_crew_assignments").insert({ event_id: event.id, event_title: event.title, user_id: user.id, user_email: user.email, assignment_type: "team_member_request", status: "pending" });
    if (error) { setActionMessage(`Request failed: ${error.message}`); return; }
    setActionMessage("Crew request submitted. Admin will review it in Event Ops.");
    await loadRows();
  }

  useEffect(() => { loadRows(); }, []);

  function selectEvent(id: string) { setSelectedId(id); }

  function OpportunityCard({ event }: { event: any }) {
    const stats = statsForEvent(event.id);
    const active = selectedEvent?.id === event.id;
    const image = eventImages(event)[0];
    const alreadyAssigned = Boolean(stats.myAssignment);
    const alreadyRequested = Boolean(stats.myRequest);
    return <button onClick={() => selectEvent(event.id)} className={`rounded-3xl border p-4 text-left text-slate-950 shadow-xl transition hover:-translate-y-0.5 ${active ? "border-pink-500 bg-pink-50 ring-2 ring-pink-100" : "border-white bg-white"}`}>
      <div className="flex gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-slate-100 grid place-items-center">{image ? <img src={image} alt={event.title} className="h-full w-full object-cover" /> : <span className="text-xs font-black text-pink-600">SDTV</span>}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2"><h2 className="text-lg font-black leading-tight line-clamp-2">{event.title}</h2><span className="text-xl">›</span></div>
          <p className="mt-1 text-sm text-slate-600">{dateText(event.date)}</p>
          <p className="text-sm text-slate-600 line-clamp-1">{event.location || "Location TBD"}</p>
          <div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">Coverage Needed</span>{alreadyAssigned ? <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">Assigned</span> : alreadyRequested ? <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-800">{statusText(stats.myRequest?.status)}</span> : null}</div>
        </div>
      </div>
    </button>;
  }

  const selectedStats = selectedEvent ? statsForEvent(selectedEvent.id) : null;
  const selectedImages = eventImages(selectedEvent || {});
  const alreadyAssigned = Boolean(selectedStats?.myAssignment);
  const alreadyRequested = Boolean(selectedStats?.myRequest);

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader /><section className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8"><p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p><h1 className="text-4xl md:text-5xl font-black mt-2">Coverage Opportunities</h1><p className="text-slate-300 mt-2">{message}</p></div>{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold mb-6">{actionMessage}</div>}{!canRequest ? <div className="bg-white text-slate-950 rounded-3xl p-8">Login as an approved SDTV team member to request crew coverage opportunities.</div> : <div className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-2xl"><div className="mb-5 grid gap-3 lg:grid-cols-[1fr_190px_180px_180px]"><input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search events by name, location, status..." className="rounded-xl border bg-white px-4 py-3 font-bold text-slate-950" /><input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="rounded-xl border bg-white px-4 py-3 font-bold text-slate-950" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border bg-white px-4 py-3 font-bold text-slate-950"><option value="all">All statuses</option><option value="approved">Approved</option><option value="pending">Pending</option></select><div className="rounded-xl border bg-slate-50 px-4 py-3 text-center"><p className="text-2xl font-black text-pink-600">{filteredOpportunities.length}</p><p className="text-xs font-bold text-slate-500">Opportunities</p></div></div><div className="mb-5 flex justify-end"><button type="button" onClick={() => { setSearchText(""); setMonthFilter(""); setStatusFilter("all"); }} className="font-black text-pink-600">Clear Filters</button></div>{opportunities.length === 0 ? <div className="rounded-3xl border p-8">No approved coverage opportunities are available right now.</div> : <div className="grid gap-6 xl:grid-cols-[430px_1fr]"><aside className="xl:sticky xl:top-6 h-fit"><div className="grid gap-4 max-h-[78vh] overflow-y-auto pr-1">{filteredOpportunities.map((event) => <OpportunityCard key={event.id} event={event} />)}{filteredOpportunities.length === 0 && <div className="rounded-3xl bg-slate-50 p-8 text-slate-950">No opportunities match this search/filter.</div>}</div></aside><section className="rounded-[2rem] border bg-white p-6 text-slate-950 min-h-[620px]">{!selectedEvent || !selectedStats ? <p className="text-slate-500">Select an opportunity to view event details.</p> : <div><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Selected Coverage Opportunity</p><h2 className="mt-1 text-3xl font-black">{selectedEvent.title}</h2><p className="mt-1 text-sm text-slate-600">{dateText(selectedEvent.date)} · {selectedEvent.location || "Location TBD"}</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">Coverage Approved</span><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Open for Crew Requests</span></div></div>{alreadyAssigned ? <a href="/my-assignments" className="rounded-xl bg-green-600 px-5 py-4 text-center font-black text-white">Open Assignment</a> : alreadyRequested ? <button disabled className="rounded-xl bg-slate-200 px-5 py-4 font-black text-slate-500">Request {statusText(selectedStats.myRequest?.status)}</button> : <button onClick={() => requestCrew(selectedEvent)} className="rounded-xl bg-pink-600 px-5 py-4 font-black text-white">Request To Join Crew</button>}</div>{selectedImages.length > 0 && <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">{selectedImages.map((url: string, index: number) => <img key={`${url}-${index}`} src={url} alt={`${selectedEvent.title} image ${index + 1}`} className="h-40 w-full rounded-xl border bg-white object-cover" />)}</div>}<div className="mt-6 grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border bg-slate-50 p-5"><h3 className="text-lg font-black">Event Details</h3><div className="mt-4 grid gap-4 text-sm"><FieldRow label="Date" value={dateText(selectedEvent.date)} /><FieldRow label="Location" value={selectedEvent.location || "Location TBD"} /><FieldRow label="Organizer email" value={selectedEvent.poc_email} /><FieldRow label="Organizer phone" value={selectedEvent.poc_phone} /><FieldRow label="Ticket / registration URL" value={selectedEvent.ticket_url ? <a href={selectedEvent.ticket_url} target="_blank" rel="noreferrer" className="break-all font-bold text-pink-600">{selectedEvent.ticket_url}</a> : "—"} /></div></section><section className="rounded-2xl border p-5"><h3 className="text-lg font-black">About This Event</h3><p className="mt-3 text-sm leading-6 text-slate-600">{selectedEvent.description || "No description added yet."}</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-2xl font-black">{selectedStats.crewRequested}</p><p className="text-xs font-bold text-slate-500">Crew Requests</p></div><div className="rounded-xl bg-green-50 p-4"><p className="text-2xl font-black">{selectedStats.crewApproved}</p><p className="text-xs font-bold text-slate-500">Approved Crew</p></div></div></section></div><section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5"><h3 className="font-black">What does crew do?</h3><p className="mt-2 text-sm text-slate-700">As a crew member, you can help with video recording, photography, interviews, social media coverage, and more to help SDTV bring this event to the community.</p><p className="mt-3 text-sm"><b>Your status:</b> {alreadyAssigned ? "Assigned" : alreadyRequested ? statusText(selectedStats.myRequest?.status) : "Not requested"}</p></section></div>}</section></div>}</div>}</section><SiteFooter /></main>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
type PortalTab = "overview" | "coverage" | "media" | "timeline";

function formatDate(value?: string | null) { if (!value) return "Date TBD"; const date = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(); }
function dateInput(value?: string | null) { return String(value || "").split("T")[0]; }
function statusText(value?: string | null) { const text = String(value || "pending").replaceAll("_", " "); return text.charAt(0).toUpperCase() + text.slice(1); }
function statusClass(value?: string | null) { const status = String(value || "pending").toLowerCase(); if (status === "approved") return "bg-green-50 text-green-700"; if (status === "pending") return "bg-yellow-50 text-yellow-800"; if (status.includes("hold")) return "bg-orange-50 text-orange-700"; if (status.includes("reject")) return "bg-red-50 text-red-700"; return "bg-slate-100 text-slate-700"; }
function label(value?: string | null) { return String(value || "not started").replaceAll("_", " "); }
function ageText(value?: string | null) { if (!value) return "No recent update"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "Updated recently"; const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)); if (days <= 0) return "Updated today"; if (days === 1) return "Updated yesterday"; return `Updated ${days} days ago`; }
function Step({ done, active, text, detail }: { done?: boolean; active?: boolean; text: string; detail?: string }) { return <div className="flex items-start gap-2 text-sm"><span className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-xs font-black ${done ? "bg-green-600 text-white" : active ? "bg-yellow-400 text-slate-950" : "bg-slate-200 text-slate-500"}`}>{done ? "✓" : active ? "!" : "•"}</span><span><span className={done ? "font-bold text-slate-900" : active ? "font-bold text-yellow-900" : "text-slate-500"}>{text}</span>{detail && <span className="block text-xs text-slate-500">{detail}</span>}</span></div>; }
function StatBox({ value, label }: { value: number; label: string }) { return <div className="rounded-2xl bg-white/10 p-4"><p className="text-3xl font-black">{value}</p><p className="text-xs font-bold text-slate-300">{label}</p></div>; }

export default function MyEventsV2Page() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading event listing status...");
  const [events, setEvents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [mediaSources, setMediaSources] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [activeTab, setActiveTab] = useState<PortalTab>("overview");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function loadRows() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user?.id) { setEvents([]); setMessage("Please login to view event listing status."); setLoading(false); return; }
    const { data, error } = await supabase.from("events").select("id,title,date,location,status,created_at,poc_email,poc_phone,description,ticket_url").eq("created_by", user.id).order("created_at", { ascending: false });
    const nextEvents = data || [];
    setEvents(nextEvents);
    setSelectedEventId((current) => current || nextEvents[0]?.id || "");
    setMessage(error ? error.message : "Track approval, coverage, media, video, and next steps for event listings you submitted.");
    const ids = nextEvents.map((event: any) => event.id).filter(Boolean);
    if (ids.length) {
      const [assignmentResult, influencerResult, workflowResult, mediaResult] = await Promise.all([
        supabase.from("event_crew_assignments").select("*").in("event_id", ids).limit(1000),
        supabase.from("event_influencer_intents").select("*").in("event_id", ids).limit(1000),
        supabase.from("event_video_workflows").select("*").in("event_id", ids).limit(300),
        supabase.from("event_coverage_sources").select("*").in("event_id", ids).limit(300),
      ]);
      setAssignments(assignmentResult.data || []); setInfluencers(influencerResult.data || []); setWorkflows(workflowResult.data || []); setMediaSources(mediaResult.data || []);
    } else { setAssignments([]); setInfluencers([]); setWorkflows([]); setMediaSources([]); }
    setLoading(false);
  }
  useEffect(() => { loadRows(); }, []);

  function stats(eventId: string) {
    const crewRows = assignments.filter((item) => item.event_id === eventId);
    const influencerRows = influencers.filter((item) => item.event_id === eventId);
    const workflow = workflows.find((item) => item.event_id === eventId);
    const media = mediaSources.filter((item) => item.event_id === eventId && item.source_type === "organizer_media");
    const approvedCrew = crewRows.filter((item) => String(item.status || "").toLowerCase() === "approved").length;
    const pendingCrew = crewRows.filter((item) => String(item.status || "pending").toLowerCase() === "pending").length;
    const approvedInfluencers = influencerRows.filter((item) => ["approved", "completed"].includes(String(item.status || "").toLowerCase())).length;
    const pendingInfluencers = influencerRows.filter((item) => String(item.status || "pending").toLowerCase() === "pending").length;
    const mediaReceived = media.some((item) => ["available", "assigned_to_editor", "editing", "published"].includes(String(item.status || "").toLowerCase()));
    const mediaRequested = media.some((item) => String(item.status || "").toLowerCase() === "requested");
    const latestMedia = media[0] || null;
    const submittedCrewMedia = crewRows.filter((item) => item.coverage_completed && !String(item.coverage_notes || "").toLowerCase().includes("no media content")).length;
    const coverageGreen = approvedCrew > 0 || approvedInfluencers > 0 || mediaReceived || submittedCrewMedia > 0;
    const coverageYellow = !coverageGreen && mediaRequested;
    const coverageLabel = coverageGreen ? (approvedCrew > 0 ? "Crew confirmed" : approvedInfluencers > 0 ? "Influencer confirmed" : "Media received") : coverageYellow ? "Waiting on organizer media" : "Coverage planning";
    return { crewRows, influencerRows, workflow, media, latestMedia, approvedCrew, pendingCrew, approvedInfluencers, pendingInfluencers, mediaReceived, mediaRequested, submittedCrewMedia, coverageGreen, coverageYellow, coverageLabel };
  }

  const visibleEvents = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return events.filter((event) => {
      const status = String(event.status || "pending").toLowerCase();
      const rowDate = dateInput(event.date);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (dateFrom && rowDate && rowDate < dateFrom) return false;
      if (dateTo && rowDate && rowDate > dateTo) return false;
      if (!needle) return true;
      return [event.title, event.location, event.status, event.poc_email, event.description].some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [events, searchText, statusFilter, dateFrom, dateTo]);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || visibleEvents[0] || null, [events, selectedEventId, visibleEvents]);
  const selectedStats = selectedEvent ? stats(selectedEvent.id) : null;
  const allStats = useMemo(() => events.map((event) => stats(event.id)), [events, assignments, influencers, workflows, mediaSources]);
  const summary = { total: events.length, approved: events.filter((event) => String(event.status || "").toLowerCase() === "approved").length, coverageOnTrack: allStats.filter((item) => item.coverageGreen).length, waitingOnMedia: allStats.filter((item) => item.mediaRequested && !item.mediaReceived).length };
  function selectEvent(id: string) { setSelectedEventId(id); setActiveTab("overview"); }
  const tabs: Array<[PortalTab, string]> = [["overview", "Overview"], ["coverage", "Coverage"], ["media", "Media"], ["timeline", "Timeline"]];

  function EventPortalCard({ event }: { event: any }) {
    const s = stats(event.id); const active = selectedEvent?.id === event.id; const healthClass = s.coverageGreen ? "bg-green-50 text-green-700" : s.coverageYellow ? "bg-yellow-50 text-yellow-800" : "bg-slate-100 text-slate-700";
    return <button onClick={() => selectEvent(event.id)} className={`rounded-3xl border p-4 text-left text-slate-950 shadow-xl transition hover:-translate-y-0.5 ${active ? "border-pink-500 bg-pink-50 ring-2 ring-pink-100" : "border-white bg-white"}`}><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-black leading-tight">{event.title}</h2><span className={`rounded-full px-2 py-1 text-[11px] font-black ${statusClass(event.status)}`}>{statusText(event.status)}</span></div><p className="mt-2 text-sm text-slate-600">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ""}</p><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black ${healthClass}`}>{s.coverageLabel}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">Video: {label(s.workflow?.status)}</span></div><p className="mt-3 text-xs font-bold text-slate-500">{ageText(s.workflow?.updated_at || s.workflow?.created_at || event.created_at)}</p></button>;
  }

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader /><section className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-black uppercase tracking-wide text-pink-300">My Hub</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Event Listing Status</h1><p className="mt-2 text-slate-300">{loading ? "Loading..." : message}</p></div><div className="flex flex-wrap gap-2"><a href="/my-events" className="rounded-xl border border-white/20 px-5 py-3 font-black text-white">Event Listings</a><a href="/events/new" className="rounded-xl bg-pink-600 px-5 py-3 text-center font-black text-white">Submit Event</a></div></div>
    <section className="mb-6 rounded-3xl bg-white/10 p-4 text-white"><div className="grid gap-3 md:grid-cols-4"><StatBox value={summary.total} label="Total listings" /><StatBox value={summary.approved} label="Approved" /><StatBox value={summary.coverageOnTrack} label="Coverage on track" /><StatBox value={summary.waitingOnMedia} label="Waiting on media" /></div><div className="mt-4 grid gap-3 lg:grid-cols-[1fr_170px_170px_180px]"><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search by event name, location, status..." className="rounded-xl border border-white/10 bg-white px-4 py-3 font-bold text-slate-950" /><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-xl border border-white/10 bg-white px-4 py-3 font-bold text-slate-950" /><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-xl border border-white/10 bg-white px-4 py-3 font-bold text-slate-950" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-white/10 bg-white px-4 py-3 font-bold text-slate-950"><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="on_hold">On hold</option><option value="rejected">Rejected</option></select></div><div className="mt-3 flex items-center justify-between text-sm text-slate-300"><span>{visibleEvents.length} of {events.length} event listing(s)</span><button type="button" onClick={() => { setSearchText(""); setStatusFilter("all"); setDateFrom(""); setDateTo(""); }} className="font-black text-pink-200">Clear filters</button></div></section>
    {events.length === 0 ? <div className="rounded-3xl border bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">No event listings found</h2><p className="mt-2 text-gray-600">Your submitted event listings will appear here.</p></div> : <div className="grid gap-6 xl:grid-cols-[430px_1fr]"><aside className="xl:sticky xl:top-6 h-fit"><div className="grid gap-4 max-h-[78vh] overflow-y-auto pr-1">{visibleEvents.map((event) => <EventPortalCard key={event.id} event={event} />)}{visibleEvents.length === 0 && <div className="rounded-3xl bg-white p-8 text-slate-950">No event listings match this search/filter.</div>}</div></aside><section className="rounded-[2rem] bg-white p-6 text-slate-950 shadow-2xl min-h-[620px]">{!selectedEvent || !selectedStats ? <p className="text-slate-500">Select an event listing to open its status view.</p> : <div><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Selected Event Listing</p><h2 className="mt-1 text-3xl font-black">{selectedEvent.title}</h2><p className="mt-1 text-sm text-slate-600">{formatDate(selectedEvent.date)} · {selectedEvent.location || "No location"}</p><p className="mt-2 text-sm text-slate-600">{selectedEvent.description || "No description added yet."}</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(selectedEvent.status)}`}>{statusText(selectedEvent.status)}</span></div><div className="mt-5 flex gap-2 overflow-x-auto pb-1">{tabs.map(([key, text]) => <button key={key} onClick={() => setActiveTab(key)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-black ${activeTab === key ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-700"}`}>{text}</button>)}</div>{activeTab === "overview" && <div className="grid gap-5 lg:grid-cols-2"><section className="mt-5 rounded-2xl bg-slate-50 p-5"><h3 className="text-lg font-black">Current Health</h3><p className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-black ${selectedStats.coverageGreen ? "bg-green-100 text-green-700" : selectedStats.coverageYellow ? "bg-yellow-100 text-yellow-800" : "bg-slate-200 text-slate-700"}`}>{selectedStats.coverageLabel}</p><p className="mt-3 text-sm text-slate-600">Video status: <b>{label(selectedStats.workflow?.status)}</b></p></section><section className="mt-5 rounded-2xl border p-5"><h3 className="text-lg font-black">Next Action</h3>{selectedStats.mediaRequested && !selectedStats.mediaReceived ? <p className="mt-2 text-sm text-yellow-800">SDTV requested a media folder from you. Please provide the link when ready.</p> : selectedStats.coverageGreen ? <p className="mt-2 text-sm text-green-700">Coverage is on track. SDTV will continue the workflow.</p> : <p className="mt-2 text-sm text-slate-600">SDTV is reviewing coverage options for this event.</p>}</section></div>}{activeTab === "coverage" && <section className="mt-5 rounded-2xl border p-5"><h3 className="text-lg font-black">Coverage Team</h3><div className="mt-3 grid gap-3 text-sm md:grid-cols-3"><p className="rounded-xl bg-slate-50 p-4"><b>Crew:</b><br />{selectedStats.approvedCrew} confirmed, {selectedStats.pendingCrew} pending</p><p className="rounded-xl bg-slate-50 p-4"><b>Influencers:</b><br />{selectedStats.approvedInfluencers} confirmed, {selectedStats.pendingInfluencers} pending</p><p className="rounded-xl bg-slate-50 p-4"><b>Media:</b><br />{selectedStats.mediaReceived ? "Organizer media received" : selectedStats.mediaRequested ? "Waiting for organizer media" : selectedStats.submittedCrewMedia > 0 ? "SDTV media submitted" : "Not received yet"}</p></div></section>}{activeTab === "media" && <section className="mt-5 rounded-2xl border p-5"><h3 className="text-lg font-black">Media</h3><p className="mt-2 text-sm text-slate-600">{selectedStats.mediaReceived ? "SDTV received the organizer media folder." : selectedStats.mediaRequested ? "SDTV is waiting for your event media folder." : selectedStats.submittedCrewMedia > 0 ? "SDTV crew submitted media from coverage." : "No media request or upload has been recorded yet."}</p>{selectedStats.latestMedia?.source_url && <a href={selectedStats.latestMedia.source_url} target="_blank" rel="noreferrer" className="mt-3 block break-all rounded-xl bg-slate-100 p-3 text-xs font-bold text-slate-700">{selectedStats.latestMedia.source_url}</a>}{selectedStats.mediaRequested && !selectedStats.mediaReceived && <a href={`/events/media-request/${selectedEvent.id}`} className="mt-4 inline-block rounded-xl bg-pink-600 px-5 py-4 text-center font-black text-white">Provide Media Folder</a>}</section>}{activeTab === "timeline" && <section className="mt-5 rounded-2xl border p-5"><h3 className="text-lg font-black">Event Journey</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><Step done text="Event submitted" detail={formatDate(selectedEvent.created_at)} /><Step done={String(selectedEvent.status).toLowerCase() === "approved"} active={String(selectedEvent.status).toLowerCase() === "pending"} text="Event approved" detail={String(selectedEvent.status).toLowerCase() === "pending" ? "Waiting for SDTV approval" : statusText(selectedEvent.status)} /><Step done={selectedStats.approvedCrew > 0 || selectedStats.approvedInfluencers > 0} active={!selectedStats.coverageGreen} text="Coverage confirmed" detail={`${selectedStats.approvedCrew} crew · ${selectedStats.approvedInfluencers} influencers`} /><Step done={selectedStats.mediaReceived || selectedStats.submittedCrewMedia > 0} active={selectedStats.mediaRequested} text="Media received" detail={selectedStats.mediaRequested && !selectedStats.mediaReceived ? "Waiting on organizer media" : ""} /><Step done={Boolean(selectedStats.workflow)} active={!selectedStats.workflow && selectedStats.coverageGreen} text="Video workflow started" detail={label(selectedStats.workflow?.status)} /><Step done={String(selectedStats.workflow?.status || "").includes("published")} active={String(selectedStats.workflow?.status || "").includes("editing") || String(selectedStats.workflow?.status || "").includes("review")} text="Published" /></div></section>}<a href={`/events/${selectedEvent.id}`} className="mt-5 inline-block rounded-xl bg-slate-950 px-5 py-4 text-center font-black text-white">Open Public Event Page</a></div>}</section></div>}
  </section><SiteFooter /></main>;
}

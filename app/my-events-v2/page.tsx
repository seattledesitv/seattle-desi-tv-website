"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
type PortalTab = "overview" | "coverage" | "media" | "contact" | "timeline";
function formatDate(value?: string | null) { if (!value) return "Date TBD"; const date = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(); }
function dateInput(value?: string | null) { return String(value || "").split("T")[0]; }
function monthInput(value?: string | null) { return dateInput(value).slice(0, 7); }
function statusText(value?: string | null) { const text = String(value || "pending").replaceAll("_", " "); return text.charAt(0).toUpperCase() + text.slice(1); }
function statusClass(value?: string | null) { const status = String(value || "pending").toLowerCase(); if (status === "approved") return "bg-green-50 text-green-700"; if (status === "pending") return "bg-yellow-50 text-yellow-800"; if (status.includes("hold")) return "bg-orange-50 text-orange-700"; if (status.includes("reject")) return "bg-red-50 text-red-700"; return "bg-slate-100 text-slate-700"; }
function label(value?: string | null) { return String(value || "not started").replaceAll("_", " "); }
function cleanPhone(v?: string | null) { return String(v || "").replace(/[^0-9+]/g, ""); }
function whatsappUrl(phone?: string | null, text?: string) { const n = cleanPhone(phone).replace(/^\+/, ""); return n ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}` : ""; }
function StatBox({ value, label }: { value: number; label: string }) { return <div className="rounded-2xl bg-white/10 p-4"><p className="text-3xl font-black">{value}</p><p className="text-xs font-bold text-slate-300">{label}</p></div>; }

export default function MyEventsV2Page() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading event listing status...");
  const [events, setEvents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [mediaSources, setMediaSources] = useState<any[]>([]);
  const [pocs, setPocs] = useState<Record<string, any>>({});
  const [selectedEventId, setSelectedEventId] = useState("");
  const [activeTab, setActiveTab] = useState<PortalTab>("overview");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState("");

  async function loadRows() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user?.id) { setEvents([]); setMessage("Please login to view event listing status."); setLoading(false); return; }
    const { data, error } = await supabase.from("events").select("id,title,date,location,status,created_at,poc_email,poc_phone,description,ticket_url,image,image_urls").eq("created_by", user.id).order("created_at", { ascending: false });
    const nextEvents = data || [];
    setEvents(nextEvents);
    setSelectedEventId((current) => current || nextEvents[0]?.id || "");
    setMessage(error ? error.message : "Track approval, coverage, media, video, and next steps for event listings you submitted.");
    const ids = nextEvents.map((event: any) => event.id).filter(Boolean);
    if (ids.length) {
      const [assignmentResult, influencerResult, workflowResult, mediaResult, pocResult] = await Promise.all([
        supabase.from("event_crew_assignments").select("*").in("event_id", ids).limit(1000),
        supabase.from("event_influencer_intents").select("*").in("event_id", ids).limit(1000),
        supabase.from("event_video_workflows").select("*").in("event_id", ids).limit(300),
        supabase.from("event_coverage_sources").select("*").in("event_id", ids).limit(300),
        supabase.from("event_admin_pocs").select("*").in("event_id", ids),
      ]);
      setAssignments(assignmentResult.data || []); setInfluencers(influencerResult.data || []); setWorkflows(workflowResult.data || []); setMediaSources(mediaResult.data || []);
      const map: Record<string, any> = {}; (pocResult.data || []).forEach((p: any) => { map[p.event_id] = p; }); setPocs(map);
    } else { setAssignments([]); setInfluencers([]); setWorkflows([]); setMediaSources([]); setPocs({}); }
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
    const submittedCrewMedia = crewRows.filter((item) => item.coverage_completed && !String(item.coverage_notes || "").toLowerCase().includes("no media content")).length;
    const coverageGreen = approvedCrew > 0 || approvedInfluencers > 0 || mediaReceived || submittedCrewMedia > 0;
    const coverageYellow = !coverageGreen && mediaRequested;
    const coverageLabel = coverageGreen ? (approvedCrew > 0 ? "Crew confirmed" : approvedInfluencers > 0 ? "Influencer confirmed" : "Media received") : coverageYellow ? "Waiting on organizer media" : "Coverage planning";
    return { workflow, media, approvedCrew, pendingCrew, approvedInfluencers, pendingInfluencers, mediaReceived, mediaRequested, submittedCrewMedia, coverageGreen, coverageYellow, coverageLabel };
  }
  const visibleEvents = useMemo(() => { const needle = searchText.trim().toLowerCase(); return events.filter((event) => { const status = String(event.status || "pending").toLowerCase(); if (statusFilter !== "all" && status !== statusFilter) return false; if (monthFilter && monthInput(event.date) !== monthFilter) return false; if (!needle) return true; return [event.title, event.location, event.status, event.poc_email, event.description].some((value) => String(value || "").toLowerCase().includes(needle)); }); }, [events, searchText, statusFilter, monthFilter]);
  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || visibleEvents[0] || null, [events, selectedEventId, visibleEvents]);
  const selectedStats = selectedEvent ? stats(selectedEvent.id) : null;
  const selectedPoc = selectedEvent ? pocs[selectedEvent.id] || null : null;
  const allStats = useMemo(() => events.map((event) => stats(event.id)), [events, assignments, influencers, workflows, mediaSources]);
  const summary = { total: events.length, approved: events.filter((event) => String(event.status || "").toLowerCase() === "approved").length, coverageOnTrack: allStats.filter((item) => item.coverageGreen).length, waitingOnMedia: allStats.filter((item) => item.mediaRequested && !item.mediaReceived).length };
  const tabs: Array<[PortalTab, string]> = [["overview", "Overview"], ["coverage", "Coverage"], ["media", "Media"], ["contact", "Contact SDTV"], ["timeline", "Timeline"]];
  function selectEvent(id: string) { setSelectedEventId(id); setActiveTab("overview"); setContactMessage(""); setSendStatus(""); }

  async function sendPocMessage() {
    if (!selectedEvent || !contactMessage.trim()) return;
    setSending(true); setSendStatus("Sending message...");
    const session = await supabase.auth.getSession(); const token = session.data.session?.access_token || "";
    const response = await fetch("/api/event-contact-poc", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" }, body: JSON.stringify({ event_id: selectedEvent.id, message: contactMessage }) });
    const result = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) setSendStatus(result.error || "Could not send message."); else { setSendStatus(result.message || "Message sent to SDTV."); setContactMessage(""); }
  }

  function EventPortalCard({ event }: { event: any }) { const s = stats(event.id); const active = selectedEvent?.id === event.id; const healthClass = s.coverageGreen ? "bg-green-50 text-green-700" : s.coverageYellow ? "bg-yellow-50 text-yellow-800" : "bg-slate-100 text-slate-700"; return <button onClick={() => selectEvent(event.id)} className={`rounded-3xl border p-4 text-left text-slate-950 shadow-xl transition hover:-translate-y-0.5 ${active ? "border-pink-500 bg-pink-50 ring-2 ring-pink-100" : "border-white bg-white"}`}><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-black leading-tight">{event.title}</h2><span className={`rounded-full px-2 py-1 text-[11px] font-black ${statusClass(event.status)}`}>{statusText(event.status)}</span></div><p className="mt-2 text-sm text-slate-600">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ""}</p><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black ${healthClass}`}>{s.coverageLabel}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">Video: {label(s.workflow?.status)}</span></div></button>; }

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader /><section className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-black uppercase tracking-wide text-pink-300">My Hub</p><h1 className="mt-2 text-4xl font-black md:text-5xl">My Event Status</h1><p className="mt-2 text-slate-300">{loading ? "Loading..." : message}</p></div><div className="flex flex-wrap gap-2"><a href="/my-events" className="rounded-xl border border-white/20 px-5 py-3 font-black text-white">My Event Listings</a><a href="/events/new" className="rounded-xl bg-pink-600 px-5 py-3 text-center font-black text-white">Submit Event</a></div></div><section className="mb-6 rounded-3xl bg-white/10 p-4 text-white"><div className="grid gap-3 md:grid-cols-4"><StatBox value={summary.total} label="Total listings" /><StatBox value={summary.approved} label="Approved" /><StatBox value={summary.coverageOnTrack} label="Coverage on track" /><StatBox value={summary.waitingOnMedia} label="Waiting on media" /></div><div className="mt-4 grid gap-3 lg:grid-cols-[1fr_190px_180px]"><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search by event name, location, status..." className="rounded-xl border border-white/10 bg-white px-4 py-3 font-bold text-slate-950" /><input type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="rounded-xl border border-white/10 bg-white px-4 py-3 font-bold text-slate-950" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-white/10 bg-white px-4 py-3 font-bold text-slate-950"><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="on_hold">On hold</option><option value="rejected">Rejected</option></select></div></section>{loading ? <div className="rounded-3xl bg-white p-8 text-slate-950">Loading...</div> : events.length === 0 ? <div className="rounded-3xl border bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">No event listings found</h2><p className="mt-2 text-gray-600">Your submitted event listings will appear here.</p></div> : <div className="grid gap-6 xl:grid-cols-[430px_1fr]"><aside className="xl:sticky xl:top-6 h-fit"><div className="grid gap-4 max-h-[78vh] overflow-y-auto pr-1">{visibleEvents.map((event) => <EventPortalCard key={event.id} event={event} />)}{visibleEvents.length === 0 && <div className="rounded-3xl bg-white p-8 text-slate-950">No event listings match this search/filter.</div>}</div></aside><section className="rounded-[2rem] bg-white p-6 text-slate-950 shadow-2xl min-h-[620px]">{!selectedEvent || !selectedStats ? <p className="text-slate-500">Select an event listing to open its status view.</p> : <div><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Selected Event Listing</p><h2 className="mt-1 text-3xl font-black">{selectedEvent.title}</h2><p className="mt-1 text-sm text-slate-600">{formatDate(selectedEvent.date)} · {selectedEvent.location || "No location"}</p><p className="mt-2 text-sm text-slate-600">{selectedEvent.description || "No description added yet."}</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(selectedEvent.status)}`}>{statusText(selectedEvent.status)}</span></div><div className="mt-5 flex gap-2 overflow-x-auto pb-1">{tabs.map(([key, text]) => <button key={key} onClick={() => setActiveTab(key)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-black ${activeTab === key ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-700"}`}>{text}</button>)}</div>{activeTab === "overview" && <div className="grid gap-5 lg:grid-cols-2"><section className="mt-5 rounded-2xl bg-slate-50 p-5"><h3 className="text-lg font-black">Current Health</h3><p className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-black ${selectedStats.coverageGreen ? "bg-green-100 text-green-700" : selectedStats.coverageYellow ? "bg-yellow-100 text-yellow-800" : "bg-slate-200 text-slate-700"}`}>{selectedStats.coverageLabel}</p><p className="mt-3 text-sm text-slate-600">Video status: <b>{label(selectedStats.workflow?.status)}</b></p></section><section className="mt-5 rounded-2xl border p-5"><h3 className="text-lg font-black">Your SDTV Contact</h3><div className="mt-3 flex items-center gap-4"><div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-pink-600 font-black">{selectedPoc?.admin_photo_url ? <img src={selectedPoc.admin_photo_url} alt={selectedPoc.admin_name || "SDTV POC"} className="h-full w-full object-cover" /> : "SDTV"}</div><div><p className="font-black">{selectedPoc?.admin_name || "SDTV Team"}</p><p className="text-sm text-slate-600">{selectedPoc?.admin_email || "info@seattledesitv.com"}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setActiveTab("contact")} className="rounded-xl bg-pink-600 px-4 py-3 font-black text-white">Message SDTV</button>{whatsappUrl(selectedPoc?.admin_phone, `Hi ${selectedPoc?.admin_name || "SDTV"}, I have a question about ${selectedEvent.title}.`) && <a href={whatsappUrl(selectedPoc?.admin_phone, `Hi ${selectedPoc?.admin_name || "SDTV"}, I have a question about ${selectedEvent.title}.`)} target="_blank" rel="noreferrer" className="rounded-xl bg-green-600 px-4 py-3 font-black text-white">WhatsApp POC</a>}</div></section></div>}{activeTab === "coverage" && <section className="mt-5 rounded-2xl bg-slate-50 p-5"><h3 className="text-lg font-black">Coverage Status</h3><p className="mt-2 text-sm text-slate-600">Crew confirmed: <b>{selectedStats.approvedCrew}</b> · Influencers confirmed: <b>{selectedStats.approvedInfluencers}</b> · Pending requests: <b>{selectedStats.pendingCrew + selectedStats.pendingInfluencers}</b></p></section>}{activeTab === "media" && <section className="mt-5 rounded-2xl bg-slate-50 p-5"><h3 className="text-lg font-black">Media Status</h3><p className="mt-2 text-sm text-slate-600">Organizer media sources: <b>{selectedStats.media.length}</b> · Media received: <b>{selectedStats.mediaReceived ? "Yes" : "No"}</b></p></section>}{activeTab === "contact" && <section className="mt-5 rounded-2xl border p-5"><h3 className="text-xl font-black">Contact SDTV About This Event</h3><div className="mt-4 flex items-center gap-4 rounded-2xl bg-slate-50 p-4"><div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-white text-pink-600 font-black">{selectedPoc?.admin_photo_url ? <img src={selectedPoc.admin_photo_url} alt={selectedPoc.admin_name || "SDTV POC"} className="h-full w-full object-cover" /> : "SDTV"}</div><div><p className="font-black">{selectedPoc?.admin_name || "SDTV Team"}</p><p className="text-sm text-slate-600">Message goes to {selectedPoc?.admin_email || "assigned SDTV admin"} and info@seattledesitv.com</p></div></div><textarea value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} rows={6} placeholder="Type your question or update for the SDTV team..." className="mt-4 w-full rounded-xl border p-4 outline-none focus:border-pink-500" /><div className="mt-4 flex flex-wrap gap-2"><button onClick={sendPocMessage} disabled={sending || !contactMessage.trim()} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">{sending ? "Sending..." : "Send Message"}</button>{whatsappUrl(selectedPoc?.admin_phone, `Hi ${selectedPoc?.admin_name || "SDTV"}, I have a question about ${selectedEvent.title}.`) && <a href={whatsappUrl(selectedPoc?.admin_phone, `Hi ${selectedPoc?.admin_name || "SDTV"}, I have a question about ${selectedEvent.title}.`)} target="_blank" rel="noreferrer" className="rounded-xl bg-green-600 px-5 py-3 font-black text-white">WhatsApp POC</a>}</div>{sendStatus && <p className="mt-3 rounded-xl bg-yellow-100 p-3 font-bold text-yellow-900">{sendStatus}</p>}</section>}{activeTab === "timeline" && <section className="mt-5 rounded-2xl bg-slate-50 p-5"><h3 className="text-lg font-black">Timeline</h3><p className="mt-2 text-sm text-slate-600">Submitted: {formatDate(selectedEvent.created_at)} · Status: {statusText(selectedEvent.status)}</p></section>}</div>}</section></div>}</section><SiteFooter /></main>;
}

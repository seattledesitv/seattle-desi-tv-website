"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import CheckedExternalLink from "../components/CheckedExternalLink";
import SafeImage from "../components/SafeImage";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { canRequestCrew as roleCanRequestCrew, resolveUserRole } from "../lib/roles";
import { firstError, normalizeUrl, requireText, validateOptionalEmail, validateOptionalImageFile, validateOptionalPhone, validateOptionalUrl } from "../lib/validation";

const supabase = getSupabaseBrowserClient();
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type EventRow = { id: string; title: string; date: string; location: string; description?: string | null; image?: string | null; image_urls?: string[] | null; ticket_url?: string | null; created_by?: string | null };
type InsertedEvent = { id: string; title: string; date: string; location: string };
type FieldProps = { label: string; required?: boolean; help?: string; children: ReactNode };

function Field({ label, required, help, children }: FieldProps) {
  return <label className="block text-sm font-bold text-slate-900"><span>{label}{required && <span className="text-pink-600"> *</span>}</span>{children}{help && <p className="text-xs text-gray-500 mt-1 font-normal">{help}</p>}</label>;
}

function firstImage(row: EventRow) { return Array.isArray(row.image_urls) && row.image_urls.length > 0 ? row.image_urls[0] : row.image || ""; }
function parseDate(value?: string | null) { if (!value) return null; const date = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(date.getTime()) ? null : date; }
function formatDate(value?: string | null) { const date = parseDate(value); return date ? date.toLocaleDateString() : value || ""; }
function siteOrigin() { return typeof window !== "undefined" ? window.location.origin : "https://seattledesitv.com"; }
function formatError(error: any) { return [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ") || String(error || "Unknown error"); }
function safeExternalUrl(value?: string | null) { const validated = validateOptionalUrl(value, "Ticket / registration URL"); return validated.ok && value ? normalizeUrl(value) : ""; }
function coverageLabel(status?: string) { const value = String(status || "not_requested").toLowerCase(); if (value === "approved") return "Coverage request approved"; if (value === "on_hold") return "Coverage request is under review"; if (value === "rejected") return "Coverage request declined"; if (value === "pending") return "Coverage request pending"; return "No coverage request yet"; }

async function uploadImage(file: File) {
  const validation = validateOptionalImageFile(file, "Event flyer", 5);
  if (!validation.ok) throw new Error(validation.message);
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) throw new Error("Cloudinary is not configured.");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  fd.append("folder", "seattle-desi-tv/events");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
  const out = await res.json();
  if (!res.ok) throw new Error(out?.error?.message || "Image upload failed.");
  return out.secure_url as string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [coverageByEvent, setCoverageByEvent] = useState<Record<string, any>>({});
  const [message, setMessage] = useState("Loading approved events...");
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState("general_public");
  const [authChecked, setAuthChecked] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [crewMessage, setCrewMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [requestingCrewEventId, setRequestingCrewEventId] = useState("");
  const [requestingCoverageEventId, setRequestingCoverageEventId] = useState("");
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth()));
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [viewMode, setViewMode] = useState<"cards" | "calendar">("cards");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [form, setForm] = useState({ title: "", date: "", location: "", description: "", ticket_url: "", poc_email: "", poc_phone: "" });

  const canRequestCrew = Boolean(user && roleCanRequestCrew(userRole));

  async function loadEvents() {
    const { data, error } = await supabase.from("events").select("id,title,date,location,description,image,image_urls,ticket_url,created_by").eq("status", "approved").order("date", { ascending: true });
    if (error) { setEvents([]); setMessage(`Could not load events: ${error.message}`); return; }
    setEvents(data || []);
    setMessage((data || []).length ? `Showing ${(data || []).length} approved event(s).` : "No approved events found.");
  }

  async function loadCoverageRequests(currentUser: any) { if (!currentUser?.id) { setCoverageByEvent({}); return; } const { data } = await supabase.from("event_crew_assignments").select("id,event_id,status,assignment_type,created_at,approved_at").eq("user_id", currentUser.id).eq("assignment_type", "owner_coverage_request").order("created_at", { ascending: false }); const next: Record<string, any> = {}; (data || []).forEach((row: any) => { if (!next[row.event_id]) next[row.event_id] = row; }); setCoverageByEvent(next); }
  async function loadRole(currentUser: any) { setUserRole(await resolveUserRole(supabase, currentUser)); }
  async function signOut() { await supabase.auth.signOut(); setUser(null); setUserRole("general_public"); setCoverageByEvent({}); }
  async function notify(type: string, title: string, date: string, location: string, reviewUrl: string, directUrl?: string) { const response = await fetch("/api/notify-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, title, date, location, submittedBy: user?.email || "unknown", reviewUrl, directUrl }) }); const result = await response.json().catch(() => null); return Boolean(response.ok && result?.ok); }

  function validateEventForm() {
    const eventDate = parseDate(form.date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dateError = !eventDate ? "Event date is required." : eventDate < today ? "Event date cannot be in the past." : null;
    return firstError(
      requireText(form.title, "Event title", 3),
      { ok: !dateError, message: dateError || undefined },
      requireText(form.location, "Venue / location", 3),
      validateOptionalUrl(form.ticket_url, "Ticket / registration URL"),
      validateOptionalEmail(form.poc_email, "Organizer contact email"),
      validateOptionalPhone(form.poc_phone, "Organizer contact phone"),
      validateOptionalImageFile(imageFiles[0], "Event flyer", 5)
    );
  }

  async function submitEvent() {
    setSubmitMessage("");
    if (!user?.id) { setSubmitMessage("Please login before submitting an event."); return; }
    const validationError = validateEventForm();
    if (validationError) { setSubmitMessage(validationError); return; }
    setSaving(true);
    try {
      const image = imageFiles[0] ? await uploadImage(imageFiles[0]) : "";
      const eventPayload: any = { ...form, ticket_url: safeExternalUrl(form.ticket_url) || null, image: image || null, poc_email: form.poc_email.trim() || user.email || null, poc_phone: form.poc_phone.trim() || null, created_by: user.id, status: "pending", approved: false };
      const { data, error } = await supabase.from("events").insert(eventPayload).select("id,title,date,location").single();
      if (error) throw error;
      const insertedEvent = data as InsertedEvent | null;
      if (insertedEvent) await notify("event", insertedEvent.title, insertedEvent.date, insertedEvent.location, `${siteOrigin()}/studio/events/pending`, `${siteOrigin()}/studio/events/${insertedEvent.id}`);
      setForm({ title: "", date: "", location: "", description: "", ticket_url: "", poc_email: "", poc_phone: "" });
      setImageFiles([]);
      setShowSubmitForm(false);
      setSubmitMessage("Event submitted successfully. It will appear after admin approval.");
      await loadEvents();
    } catch (error: any) { setSubmitMessage(`Could not submit event: ${formatError(error)}`); } finally { setSaving(false); }
  }

  async function requestCrew(event: EventRow) { setCrewMessage(""); if (!user?.id || !canRequestCrew) { setCrewMessage("Only approved SDTV team members can request to cover events."); return; } setRequestingCrewEventId(event.id); try { const crewPayload: any = { event_id: event.id, user_id: user.id, user_email: user.email || null, assignment_type: "team_member_request", status: "pending", event_title: event.title }; const { error } = await supabase.from("event_crew_assignments").insert(crewPayload); if (error) throw error; await notify("team member crew request", event.title, event.date, event.location, `${siteOrigin()}/studio/crew/pending`, `${siteOrigin()}/studio/events/${event.id}`); setCrewMessage("Crew request submitted for admin approval."); } catch (error: any) { setCrewMessage(`Could not submit crew request: ${formatError(error)}`); } finally { setRequestingCrewEventId(""); } }
  async function requestOwnerCoverage(event: EventRow) { setCrewMessage(""); if (!user?.id || event.created_by !== user.id) { setCrewMessage("Only the event creator can request SDTV coverage for this event."); return; } setRequestingCoverageEventId(event.id); try { const coveragePayload: any = { event_id: event.id, user_id: user.id, user_email: user.email || null, assignment_type: "owner_coverage_request", status: "pending", event_title: event.title }; const { error } = await supabase.from("event_crew_assignments").insert(coveragePayload); if (error) throw error; await notify("event owner coverage request", event.title, event.date, event.location, `${siteOrigin()}/studio/coverage`, `${siteOrigin()}/studio/events/${event.id}`); setCrewMessage("SDTV coverage request submitted for admin review."); await loadCoverageRequests(user); } catch (error: any) { setCrewMessage(`Could not submit coverage request: ${formatError(error)}`); } finally { setRequestingCoverageEventId(""); } }

  useEffect(() => { async function init() { const { data } = await supabase.auth.getUser(); const currentUser = data?.user || null; setUser(currentUser); await loadRole(currentUser); await loadCoverageRequests(currentUser); setAuthChecked(true); await loadEvents(); } init(); const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => { const nextUser = session?.user || null; setUser(nextUser); await loadRole(nextUser); await loadCoverageRequests(nextUser); }); return () => listener.subscription.unsubscribe(); }, []);

  const years = useMemo(() => Array.from(new Set(events.map((event) => parseDate(event.date)?.getFullYear()).filter(Boolean) as number[])).sort((a, b) => a - b), [events]);
  const filteredEvents = useMemo(() => events.filter((event) => { const date = parseDate(event.date); return date && String(date.getMonth()) === monthFilter && String(date.getFullYear()) === yearFilter; }), [events, monthFilter, yearFilter]);
  const calendarCells = useMemo(() => { const year = Number(yearFilter) || new Date().getFullYear(); const month = Number(monthFilter) || 0; const first = new Date(year, month, 1); const days = new Date(year, month + 1, 0).getDate(); const cells: Array<{ day: number | null; events: EventRow[] }> = []; for (let i = 0; i < first.getDay(); i++) cells.push({ day: null, events: [] }); for (let day = 1; day <= days; day++) cells.push({ day, events: filteredEvents.filter((event) => parseDate(event.date)?.getDate() === day) }); return cells; }, [filteredEvents, monthFilter, yearFilter]);

  function EventCard({ event }: { event: EventRow }) { const image = firstImage(event); const isOwner = Boolean(user?.id && event.created_by === user.id); const coverageRequest = coverageByEvent[event.id]; return <article className="border rounded-2xl overflow-hidden shadow-sm bg-white">{image ? <SafeImage src={image} alt={event.title} className="w-full h-56 object-cover bg-gray-100" fallbackClassName="w-full h-56 bg-pink-50 grid place-items-center text-pink-600 font-black" fallbackLabel="Seattle Desi TV" widthHint={1000} /> : <div className="w-full h-56 bg-pink-50 grid place-items-center text-pink-600 font-black">Seattle Desi TV</div>}<div className="p-5"><h2 className="text-xl font-black">{event.title}</h2><p className="text-gray-500 mt-1">{formatDate(event.date)} · {event.location}</p>{event.description && <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">{event.description}</p>}{isOwner && <div className="mt-4 rounded-xl border bg-slate-50 p-3 text-sm"><p className="font-black text-slate-900">Private Organizer View</p><p className="text-slate-600">{coverageLabel(coverageRequest?.status)}</p></div>}<div className="flex flex-wrap gap-3 mt-5"><a href={`/events/${event.id}`} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm">Details</a>{event.ticket_url && <CheckedExternalLink href={event.ticket_url} notFoundMessage="Page not found. This ticket/register link is not available." className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-60">Tickets / Register</CheckedExternalLink>}{event.location && <a href={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}`} target="_blank" rel="noreferrer" className="border px-4 py-2 rounded-lg font-bold text-sm">Map</a>}{isOwner && !coverageRequest && <button type="button" onClick={() => requestOwnerCoverage(event)} disabled={requestingCoverageEventId === event.id} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-60">{requestingCoverageEventId === event.id ? "Requesting..." : "Request SDTV Coverage"}</button>}{canRequestCrew && <button type="button" onClick={() => requestCrew(event)} disabled={requestingCrewEventId === event.id} className="border border-pink-600 text-pink-600 px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-60">{requestingCrewEventId === event.id ? "Requesting..." : "Request to Cover"}</button>}</div></div></article>; }

  return (
    <main className="min-h-screen bg-slate-50 text-[#081024]"><SiteHeader /><section className="px-6 md:px-14 py-10"><div className="max-w-7xl mx-auto"><div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"><div><p className="text-pink-600 font-black uppercase tracking-wide">Seattle Desi TV Events</p><h1 className="text-4xl md:text-5xl font-black mt-2">Community Events</h1><p className="text-gray-500 mt-2">Browse approved community events. Add an event only when you need to submit something for review.</p><p className="text-sm text-gray-500 mt-2">{message}</p>{user?.email && <p className="text-xs text-gray-500 mt-1">Logged in as {user.email} · {userRole}</p>}</div><div className="flex flex-wrap gap-3"><button type="button" onClick={() => setShowSubmitForm((value) => !value)} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold">{showSubmitForm ? "Hide Add Event" : "Add Event"}</button><button type="button" onClick={loadEvents} className="border border-pink-600 text-pink-600 px-5 py-3 rounded-xl font-bold bg-white">Refresh Events</button>{user && <button type="button" onClick={signOut} className="border border-red-300 text-red-600 px-5 py-3 rounded-xl font-bold bg-white">Logout</button>}</div></div>

      {(submitMessage || crewMessage) && <div className="mb-6 rounded-2xl border bg-white p-4 text-sm font-bold text-orange-700 whitespace-pre-line">{submitMessage || crewMessage}</div>}

      {showSubmitForm && <section className="mb-8 border rounded-3xl p-6 shadow-sm bg-white"><div className="flex items-start justify-between gap-4 mb-5"><div><h2 className="text-2xl font-black">Add Event</h2><p className="text-sm text-gray-500 mt-1">Submitted events appear after admin approval.</p></div><button type="button" onClick={() => setShowSubmitForm(false)} className="text-sm font-black text-gray-500">Collapse</button></div>{!authChecked ? <p className="text-gray-500">Checking login...</p> : user ? <div><div className="grid md:grid-cols-2 gap-4"><Field label="Event title" required><input className="w-full border rounded-lg p-3 mt-1" placeholder="Event name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="Event date" required><input className="w-full border rounded-lg p-3 mt-1" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label="Venue / location" required><input className="w-full border rounded-lg p-3 mt-1" placeholder="Venue, city, state" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field><Field label="Ticket / registration URL"><input className="w-full border rounded-lg p-3 mt-1" placeholder="https://example.com/tickets" value={form.ticket_url} onChange={(e) => setForm({ ...form, ticket_url: e.target.value })} /></Field><Field label="Organizer contact email"><input className="w-full border rounded-lg p-3 mt-1" placeholder="organizer@example.com" type="email" value={form.poc_email} onChange={(e) => setForm({ ...form, poc_email: e.target.value })} /></Field><Field label="Organizer contact phone"><input className="w-full border rounded-lg p-3 mt-1" placeholder="425-555-1234" value={form.poc_phone} onChange={(e) => setForm({ ...form, poc_phone: e.target.value })} /></Field><div className="md:col-span-2"><Field label="Event description"><textarea className="w-full border rounded-lg p-3 mt-1 min-h-28" placeholder="Tell viewers about the event." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div><div className="md:col-span-2"><Field label="Event flyer" help="Optional. Image must be JPG/PNG/WebP/GIF and 5MB or smaller."><input className="w-full border rounded-lg p-3 mt-1" type="file" accept="image/*" onChange={(e) => setImageFiles(Array.from(e.target.files || []))} /></Field></div></div>{submitMessage && <p className="text-sm text-orange-600 my-4 whitespace-pre-line">{submitMessage}</p>}<button type="button" onClick={submitEvent} disabled={saving} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full disabled:opacity-60 mt-5">{saving ? "Saving Event..." : "Submit Event for Approval"}</button></div> : <div><h3 className="text-xl font-black mb-3">Login to Add Event</h3><p className="text-sm text-gray-500 mb-4">You can browse events without login. Login is only required to submit a new event.</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold">Login to continue</a></div>}</section>}

      <section className="mb-6 bg-white border rounded-2xl p-4"><div className="flex flex-col md:flex-row md:items-end gap-4"><div><label htmlFor="event-month" className="block text-sm font-black text-slate-900">Month</label><select id="event-month" aria-label="Filter events by month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="border rounded-xl p-3 mt-1">{MONTHS.map((month, index) => <option key={month} value={String(index)}>{month}</option>)}</select></div><div><label htmlFor="event-year" className="block text-sm font-black text-slate-900">Year</label><select id="event-year" aria-label="Filter events by year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="border rounded-xl p-3 mt-1">{(years.length ? years : [new Date().getFullYear()]).map((year) => <option key={year} value={String(year)}>{year}</option>)}</select></div><div><p className="block text-sm font-black text-slate-900 mb-1">View</p><div className="flex gap-2"><button type="button" onClick={() => setViewMode("cards")} className={`px-4 py-3 rounded-xl font-bold ${viewMode === "cards" ? "bg-pink-600 text-white" : "bg-slate-100"}`}>Cards</button><button type="button" onClick={() => setViewMode("calendar")} className={`px-4 py-3 rounded-xl font-bold ${viewMode === "calendar" ? "bg-pink-600 text-white" : "bg-slate-100"}`}>Calendar</button></div></div><p className="text-sm text-gray-500 md:ml-auto">Showing {filteredEvents.length} event(s) for selected month.</p></div></section>

      {viewMode === "cards" ? <section>{filteredEvents.length === 0 ? <div className="border rounded-2xl p-8 text-gray-500 bg-white">No events found for this month.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{filteredEvents.map((event) => <EventCard key={event.id} event={event} />)}</div>}</section> : <section className="bg-white border rounded-2xl p-4 overflow-x-auto"><div className="grid grid-cols-7 gap-2 min-w-[720px]">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="text-center text-xs font-black text-gray-500">{day}</div>)}{calendarCells.map((cell, index) => <div key={index} className="min-h-32 border rounded-xl p-2 bg-slate-50">{cell.day && <p className="font-black text-sm">{cell.day}</p>}{cell.events.map((event) => <a key={event.id} href={`/events/${event.id}`} className="block mt-2 rounded-lg bg-white p-2 text-xs font-bold text-slate-900 shadow-sm">{event.title}</a>)}</div>)}</div></section>}
    </div></section><SiteFooter /></main>
  );
}

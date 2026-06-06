"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { canRequestCrew as roleCanRequestCrew, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type EventRow = {
  id: string;
  title: string;
  date: string;
  location: string;
  description?: string | null;
  image?: string | null;
  image_urls?: string[] | null;
  ticket_url?: string | null;
  created_by?: string | null;
};

type InsertedEvent = { id: string; title: string; date: string; location: string };

function firstImage(row: EventRow) {
  if (Array.isArray(row.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row.image || "";
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | null) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString() : value || "";
}

function siteOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "https://seattledesitv.com";
}

function formatError(error: any) {
  return [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ") || String(error || "Unknown error");
}

function coverageLabel(status?: string) {
  const value = String(status || "not_requested").toLowerCase();
  if (value === "approved") return "Coverage request approved";
  if (value === "on_hold") return "Coverage request is under review";
  if (value === "rejected") return "Coverage request declined";
  if (value === "pending") return "Coverage request pending";
  return "No coverage request yet";
}

async function uploadImage(file: File) {
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
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
    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,location,description,image,image_urls,ticket_url,created_by")
      .eq("status", "approved")
      .order("date", { ascending: true });

    if (error) {
      setEvents([]);
      setMessage(`Could not load events: ${error.message}`);
      return;
    }

    setEvents(data || []);
    setMessage((data || []).length ? `Showing ${(data || []).length} approved event(s).` : "No approved events found.");
  }

  async function loadCoverageRequests(currentUser: any) {
    if (!currentUser?.id) {
      setCoverageByEvent({});
      return;
    }

    const { data } = await supabase
      .from("event_crew_assignments")
      .select("id,event_id,status,assignment_type,created_at,approved_at")
      .eq("user_id", currentUser.id)
      .eq("assignment_type", "owner_coverage_request")
      .order("created_at", { ascending: false });

    const next: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      if (!next[row.event_id]) next[row.event_id] = row;
    });
    setCoverageByEvent(next);
  }

  async function loadRole(currentUser: any) {
    setUserRole(await resolveUserRole(supabase, currentUser));
  }

  async function signIn() {
    setAuthMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthMessage(formatError(error));
      return;
    }
    const nextUser = data.user || null;
    setUser(nextUser);
    await loadRole(nextUser);
    await loadCoverageRequests(nextUser);
    setPassword("");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole("general_public");
    setCoverageByEvent({});
  }

  async function notify(type: string, title: string, date: string, location: string, reviewUrl: string, directUrl?: string) {
    const response = await fetch("/api/notify-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, date, location, submittedBy: user?.email || "unknown", reviewUrl, directUrl }),
    });
    const result = await response.json().catch(() => null);
    return Boolean(response.ok && result?.ok);
  }

  async function submitEvent() {
    setSubmitMessage("");
    if (!user?.id) {
      setSubmitMessage("Please login before submitting an event.");
      return;
    }
    if (!form.title || !form.date || !form.location) {
      setSubmitMessage("Please enter event title, date, and location.");
      return;
    }

    setSaving(true);
    try {
      const image = imageFiles[0] ? await uploadImage(imageFiles[0]) : "";
      const eventPayload: any = { ...form, image: image || null, poc_email: form.poc_email || user.email || null, created_by: user.id, status: "pending", approved: false };
      const { data, error } = await supabase
        .from("events")
        .insert(eventPayload)
        .select("id,title,date,location")
        .single();
      if (error) throw error;
      const insertedEvent = data as InsertedEvent | null;
      if (insertedEvent) await notify("event", insertedEvent.title, insertedEvent.date, insertedEvent.location, `${siteOrigin()}/studio/events/pending`, `${siteOrigin()}/studio/events/${insertedEvent.id}`);
      setForm({ title: "", date: "", location: "", description: "", ticket_url: "", poc_email: "", poc_phone: "" });
      setImageFiles([]);
      setSubmitMessage("Event submitted successfully. It will appear after admin approval.");
      await loadEvents();
    } catch (error: any) {
      setSubmitMessage(`Could not submit event: ${formatError(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function requestCrew(event: EventRow) {
    setCrewMessage("");
    if (!user?.id || !canRequestCrew) {
      setCrewMessage("Only approved SDTV team members can request to cover events.");
      return;
    }
    setRequestingCrewEventId(event.id);
    try {
      const crewPayload: any = { event_id: event.id, user_id: user.id, user_email: user.email || null, assignment_type: "team_member_request", status: "pending", event_title: event.title };
      const { error } = await supabase.from("event_crew_assignments").insert(crewPayload);
      if (error) throw error;
      await notify("team member crew request", event.title, event.date, event.location, `${siteOrigin()}/studio/crew/pending`, `${siteOrigin()}/studio/events/${event.id}`);
      setCrewMessage("Crew request submitted for admin approval.");
    } catch (error: any) {
      setCrewMessage(`Could not submit crew request: ${formatError(error)}`);
    } finally {
      setRequestingCrewEventId("");
    }
  }

  async function requestOwnerCoverage(event: EventRow) {
    setCrewMessage("");
    if (!user?.id || event.created_by !== user.id) {
      setCrewMessage("Only the event creator can request SDTV coverage for this event.");
      return;
    }
    setRequestingCoverageEventId(event.id);
    try {
      const coveragePayload: any = { event_id: event.id, user_id: user.id, user_email: user.email || null, assignment_type: "owner_coverage_request", status: "pending", event_title: event.title };
      const { error } = await supabase.from("event_crew_assignments").insert(coveragePayload);
      if (error) throw error;
      await notify("event owner coverage request", event.title, event.date, event.location, `${siteOrigin()}/studio/coverage`, `${siteOrigin()}/studio/events/${event.id}`);
      setCrewMessage("SDTV coverage request submitted for admin review.");
      await loadCoverageRequests(user);
    } catch (error: any) {
      setCrewMessage(`Could not submit coverage request: ${formatError(error)}`);
    } finally {
      setRequestingCoverageEventId("");
    }
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user || null;
      setUser(currentUser);
      await loadRole(currentUser);
      await loadCoverageRequests(currentUser);
      setAuthChecked(true);
      await loadEvents();
    }
    init();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user || null;
      setUser(nextUser);
      await loadRole(nextUser);
      await loadCoverageRequests(nextUser);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const years = useMemo(() => Array.from(new Set(events.map((event) => parseDate(event.date)?.getFullYear()).filter(Boolean) as number[])).sort((a, b) => a - b), [events]);
  const filteredEvents = useMemo(() => events.filter((event) => {
    const date = parseDate(event.date);
    return date && String(date.getMonth()) === monthFilter && String(date.getFullYear()) === yearFilter;
  }), [events, monthFilter, yearFilter]);
  const calendarCells = useMemo(() => {
    const year = Number(yearFilter) || new Date().getFullYear();
    const month = Number(monthFilter) || 0;
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; events: EventRow[] }> = [];
    for (let i = 0; i < first.getDay(); i++) cells.push({ day: null, events: [] });
    for (let day = 1; day <= days; day++) cells.push({ day, events: filteredEvents.filter((event) => parseDate(event.date)?.getDate() === day) });
    return cells;
  }, [filteredEvents, monthFilter, yearFilter]);

  function EventCard({ event }: { event: EventRow }) {
    const image = firstImage(event);
    const isOwner = Boolean(user?.id && event.created_by === user.id);
    const coverageRequest = coverageByEvent[event.id];

    return (
      <article className="border rounded-2xl overflow-hidden shadow-sm bg-white">
        {image ? <img src={image} alt={event.title} className="w-full h-56 object-cover bg-gray-100" /> : <div className="w-full h-56 bg-pink-50 grid place-items-center text-pink-600 font-black">Seattle Desi TV</div>}
        <div className="p-5">
          <h2 className="text-xl font-black">{event.title}</h2>
          <p className="text-gray-500 mt-1">{formatDate(event.date)} · {event.location}</p>
          {event.description && <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">{event.description}</p>}
          {isOwner && <div className="mt-4 rounded-xl border bg-slate-50 p-3 text-sm"><p className="font-black text-slate-900">Private Organizer View</p><p className="text-slate-600">{coverageLabel(coverageRequest?.status)}</p></div>}
          <div className="flex flex-wrap gap-3 mt-5">
            <a href={`/events/${event.id}`} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm">Details</a>
            {event.ticket_url && <a href={event.ticket_url} target="_blank" rel="noreferrer" className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Tickets / Register</a>}
            {event.location && <a href={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}`} target="_blank" rel="noreferrer" className="border px-4 py-2 rounded-lg font-bold text-sm">Map</a>}
            {isOwner && !coverageRequest && <button type="button" onClick={() => requestOwnerCoverage(event)} disabled={requestingCoverageEventId === event.id} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-60">{requestingCoverageEventId === event.id ? "Requesting..." : "Request SDTV Coverage"}</button>}
            {canRequestCrew && <button type="button" onClick={() => requestCrew(event)} disabled={requestingCrewEventId === event.id} className="border border-pink-600 text-pink-600 px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-60">{requestingCrewEventId === event.id ? "Requesting..." : "Request to Cover"}</button>}
          </div>
        </div>
      </article>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-[#081024]">
      <SiteHeader />
      <section className="bg-slate-950 text-white px-6 md:px-14 py-12"><div className="max-w-7xl mx-auto"><p className="text-pink-300 font-black uppercase tracking-wide">Seattle Desi TV Events</p><h1 className="text-4xl md:text-6xl font-black mt-3">Community Events Calendar</h1><p className="text-slate-300 mt-3 max-w-3xl">Browse approved community events, submit your event, or request SDTV coverage after approval.</p></div></section>
      <section className="px-6 md:px-14 py-10"><div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"><p className="text-gray-500">{message}</p><button type="button" onClick={loadEvents} className="border border-pink-600 text-pink-600 px-5 py-3 rounded-xl font-bold bg-white">Refresh Events</button></div>
        <section className="grid lg:grid-cols-[420px_1fr] gap-8 items-start">
          <aside className="border rounded-2xl p-6 shadow-sm bg-white">
            {!authChecked ? <p className="text-gray-500">Checking login...</p> : user ? <div>
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 mb-5 text-sm">Logged in as <b>{user.email}</b><br />Role: <b>{userRole}</b><button type="button" onClick={signOut} className="block mt-2 text-red-600 font-bold">Logout</button></div>
              <h2 className="text-2xl font-black mb-4">Add New Event</h2>
              <input className="w-full border rounded-lg p-3 mb-3" placeholder="Event title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              <input className="w-full border rounded-lg p-3 mb-3" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              <input className="w-full border rounded-lg p-3 mb-3" placeholder="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
              <textarea className="w-full border rounded-lg p-3 mb-3 min-h-28" placeholder="Event description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              <input className="w-full border rounded-lg p-3 mb-3" placeholder="Ticket / registration URL" value={form.ticket_url} onChange={(event) => setForm({ ...form, ticket_url: event.target.value })} />
              <input className="w-full border rounded-lg p-3 mb-3" placeholder="POC email" value={form.poc_email} onChange={(event) => setForm({ ...form, poc_email: event.target.value })} />
              <input className="w-full border rounded-lg p-3 mb-3" placeholder="POC phone" value={form.poc_phone} onChange={(event) => setForm({ ...form, poc_phone: event.target.value })} />
              <input className="w-full border rounded-lg p-3 mb-3" type="file" accept="image/*" onChange={(event) => setImageFiles(Array.from(event.target.files || []))} />
              {submitMessage && <p className="text-sm text-orange-600 mb-3 whitespace-pre-line">{submitMessage}</p>}
              <button type="button" onClick={submitEvent} disabled={saving} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full disabled:opacity-60">{saving ? "Saving Event..." : "Submit Event for Approval"}</button>
            </div> : <div>
              <h2 className="text-2xl font-black mb-3">Login to Add Event</h2>
              <p className="text-sm text-gray-500 mb-4">Public users can submit events. Approved SDTV team members can request to cover events.</p>
              <input className="w-full border rounded-lg p-3 mb-3" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
              <input className="w-full border rounded-lg p-3 mb-3" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              {authMessage && <p className="text-sm text-orange-600 mb-3 whitespace-pre-line">{authMessage}</p>}
              <button type="button" onClick={signIn} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full">Login</button>
            </div>}
          </aside>
          <section>
            {crewMessage && <div className="border border-pink-200 bg-pink-50 text-pink-800 rounded-2xl p-4 mb-5 font-bold">{crewMessage}</div>}
            <div className="bg-white border rounded-2xl p-5 mb-6"><div className="grid md:grid-cols-[1fr_1fr_auto] gap-3"><select className="border rounded-lg p-3" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>{MONTHS.map((month, index) => <option key={month} value={String(index)}>{month}</option>)}</select><select className="border rounded-lg p-3" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>{Array.from(new Set([new Date().getFullYear(), ...years])).sort((a, b) => a - b).map((year) => <option key={year} value={String(year)}>{year}</option>)}</select><button className="bg-slate-900 text-white rounded-lg px-4 py-3 font-bold" onClick={() => setViewMode(viewMode === "cards" ? "calendar" : "cards")}>{viewMode === "cards" ? "Calendar View" : "Card View"}</button></div><p className="text-sm text-gray-500 mt-3">Showing {filteredEvents.length} event(s) for {MONTHS[Number(monthFilter)]} {yearFilter}</p></div>
            {viewMode === "calendar" ? <div className="bg-white border rounded-2xl p-5"><div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-gray-500 mb-2">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day}>{day}</div>)}</div><div className="grid grid-cols-7 gap-2">{calendarCells.map((cell, index) => <div key={index} className="min-h-28 border rounded-xl p-2 bg-gray-50 text-left">{cell.day && <p className="font-black text-sm mb-2">{cell.day}</p>}{cell.events.map((event) => <a href={`/events/${event.id}`} key={event.id} className="block text-xs bg-pink-50 text-pink-700 rounded-lg p-2 mb-1 font-bold">{event.title}</a>)}</div>)}</div></div> : <div>{filteredEvents.length === 0 ? <div className="border rounded-2xl p-8 text-gray-500 bg-white">No events found for this month.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{filteredEvents.map((event) => <EventCard key={event.id} event={event} />)}</div>}</div>}
          </section>
        </section>
      </div></section>
      <SiteFooter />
    </main>
  );
}

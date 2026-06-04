"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

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

function cleanRole(role: string) {
  return String(role || "general_public").toLowerCase().trim();
}

function roleCanRequestCrew(role: string) {
  const next = cleanRole(role);
  return next === "team_member" || next.includes("admin");
}

function formatError(error: any) {
  if (!error) return "Unknown error.";
  return [error.message, error.details, error.hint, error.code].filter(Boolean).join(" | ") || String(error);
}

function firstImage(row: EventRow) {
  if (Array.isArray(row.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row.image || "";
}

function siteOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "https://seattledesitv.com";
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
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "seattle-desi-tv/events");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message || "Image upload failed.");
  return result.secure_url as string;
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
  const [form, setForm] = useState({ title: "", date: "", location: "", description: "", ticket_url: "", poc_email: "", poc_phone: "" });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [submitMessage, setSubmitMessage] = useState("");
  const [crewMessage, setCrewMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [requestingCrewEventId, setRequestingCrewEventId] = useState("");
  const [requestingCoverageEventId, setRequestingCoverageEventId] = useState("");

  const canRequestCrew = Boolean(user && roleCanRequestCrew(userRole));

  async function loadCoverageRequests(currentUser: any) {
    if (!currentUser?.id) {
      setCoverageByEvent({});
      return;
    }

    const { data, error } = await supabase
      .from("event_crew_assignments")
      .select("id,event_id,status,assignment_type,created_at,approved_at")
      .eq("user_id", currentUser.id)
      .eq("assignment_type", "owner_coverage_request")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Coverage status load failed", error);
      setCoverageByEvent({});
      return;
    }

    const next: Record<string, any> = {};
    (data || []).forEach((request: any) => {
      if (!next[request.event_id]) next[request.event_id] = request;
    });
    setCoverageByEvent(next);
  }

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

  async function loadRole(currentUser: any) {
    if (!currentUser?.id) {
      setUserRole("general_public");
      return;
    }
    const { data } = await supabase
      .from("admins")
      .select("role")
      .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
      .maybeSingle();
    setUserRole(cleanRole(data?.role || "general_public"));
  }

  async function signIn() {
    setAuthMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthMessage(formatError(error));
      return;
    }
    setUser(data.user || null);
    await loadRole(data.user);
    await loadCoverageRequests(data.user);
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
      const { data, error } = await supabase
        .from("events")
        .insert({ ...form, image: image || null, poc_email: form.poc_email || user.email || null, created_by: user.id, status: "pending", approved: false })
        .select("id,title,date,location")
        .single();
      if (error) throw error;
      await notify("event", data.title, data.date, data.location, `${siteOrigin()}/studio/events/pending`, `${siteOrigin()}/studio/events/${data.id}`);
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
      const { error } = await supabase.from("event_crew_assignments").insert({
        event_id: event.id,
        user_id: user.id,
        user_email: user.email || null,
        assignment_type: "team_member_request",
        status: "pending",
        event_title: event.title,
      });
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
      const { error } = await supabase.from("event_crew_assignments").insert({
        event_id: event.id,
        user_id: user.id,
        user_email: user.email || null,
        assignment_type: "owner_coverage_request",
        status: "pending",
        event_title: event.title,
      });
      if (error) throw error;
      await notify("event owner coverage request", event.title, event.date, event.location, `${siteOrigin()}/studio/crew/pending`, `${siteOrigin()}/studio/events/${event.id}`);
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

  return (
    <main className="min-h-screen bg-white text-[#081024] px-6 md:px-14 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <a href="/" className="text-sm font-bold text-pink-600">← Back to Seattle Desi TV</a>
            <h1 className="text-4xl md:text-5xl font-black mt-3">Community Events</h1>
            <p className="text-gray-500 mt-2">Browse approved community events or login to submit a new one.</p>
            <p className="text-sm text-gray-500 mt-2">{message}</p>
          </div>
          <button type="button" onClick={loadEvents} className="border border-pink-600 text-pink-600 px-5 py-3 rounded-xl font-bold bg-white">Refresh Events</button>
        </div>

        <section className="grid lg:grid-cols-[420px_1fr] gap-8 items-start">
          <aside className="border rounded-2xl p-6 shadow-sm bg-white">
            {!authChecked ? <p className="text-gray-500">Checking login...</p> : user ? (
              <div>
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 mb-5 text-sm">Logged in as <b>{user.email}</b><br />Role: <b>{userRole}</b><button type="button" onClick={signOut} className="block mt-2 text-red-600 font-bold">Logout</button></div>
                <h2 className="text-2xl font-black mb-4">Add New Event</h2>
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <input className="w-full border rounded-lg p-3 mb-3" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                <textarea className="w-full border rounded-lg p-3 mb-3 min-h-28" placeholder="Event description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Ticket / registration URL" value={form.ticket_url} onChange={(e) => setForm({ ...form, ticket_url: e.target.value })} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="POC email" value={form.poc_email} onChange={(e) => setForm({ ...form, poc_email: e.target.value })} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="POC phone" value={form.poc_phone} onChange={(e) => setForm({ ...form, poc_phone: e.target.value })} />
                <input className="w-full border rounded-lg p-3 mb-3" type="file" accept="image/*" onChange={(e) => setImageFiles(Array.from(e.target.files || []))} />
                {submitMessage && <p className="text-sm text-orange-600 mb-3 whitespace-pre-line">{submitMessage}</p>}
                <button type="button" onClick={submitEvent} disabled={saving} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full disabled:opacity-60">{saving ? "Saving Event..." : "Submit Event for Approval"}</button>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-black mb-3">Login to Add Event</h2>
                <p className="text-sm text-gray-500 mb-4">Public users can submit events. Approved SDTV team members can request to cover events.</p>
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {authMessage && <p className="text-sm text-orange-600 mb-3 whitespace-pre-line">{authMessage}</p>}
                <button type="button" onClick={signIn} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full">Login</button>
              </div>
            )}
          </aside>

          <section>
            {crewMessage && <div className="border border-pink-200 bg-pink-50 text-pink-800 rounded-2xl p-4 mb-5 font-bold">{crewMessage}</div>}
            {events.length === 0 ? <div className="border rounded-2xl p-8 text-gray-500 bg-gray-50">{message}</div> : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {events.map((event) => {
                  const image = firstImage(event);
                  const d = event.date ? new Date(`${String(event.date).split("T")[0]}T00:00:00`) : null;
                  const isOwner = Boolean(user?.id && event.created_by === user.id);
                  const coverageRequest = coverageByEvent[event.id];
                  return (
                    <article key={event.id} className="border rounded-2xl overflow-hidden shadow-sm bg-white">
                      {image ? <img src={image} alt={event.title} className="w-full h-56 object-cover bg-gray-100" /> : <div className="w-full h-56 bg-pink-50 grid place-items-center text-pink-600 font-black">Seattle Desi TV</div>}
                      <div className="p-5">
                        <h2 className="text-xl font-black">{event.title}</h2>
                        <p className="text-gray-500 mt-1">{d ? d.toLocaleDateString() : event.date} · {event.location}</p>
                        {event.description && <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">{event.description}</p>}
                        {isOwner && (
                          <div className="mt-4 rounded-xl border bg-slate-50 p-3 text-sm">
                            <p className="font-black text-slate-900">Private Organizer View</p>
                            <p className="text-slate-600">{coverageLabel(coverageRequest?.status)}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3 mt-5">
                          {event.ticket_url && <a href={event.ticket_url} target="_blank" rel="noreferrer" className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Tickets / Register</a>}
                          {event.location && <a href={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}`} target="_blank" rel="noreferrer" className="border px-4 py-2 rounded-lg font-bold text-sm">Map</a>}
                          {isOwner && !coverageRequest && <button type="button" onClick={() => requestOwnerCoverage(event)} disabled={requestingCoverageEventId === event.id} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-60">{requestingCoverageEventId === event.id ? "Requesting..." : "Request SDTV Coverage"}</button>}
                          {canRequestCrew && <button type="button" onClick={() => requestCrew(event)} disabled={requestingCrewEventId === event.id} className="border border-pink-600 text-pink-600 px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-60">{requestingCrewEventId === event.id ? "Requesting..." : "Request to Cover"}</button>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

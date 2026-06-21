"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import CheckedExternalLink from "../../components/CheckedExternalLink";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", { auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

function cleanRole(role: string) { return String(role || "general_public").toLowerCase().trim(); }
function isTeamRole(role: string) { const next = cleanRole(role); return next === "team_member" || next.includes("admin"); }
function isAdminRole(role: string) { return cleanRole(role).includes("admin"); }
function getImages(event: any) { if (Array.isArray(event?.image_urls) && event.image_urls.length > 0) return event.image_urls; return event?.image ? [event.image] : []; }
function dateText(value?: string) { if (!value) return ""; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
function coverageLabel(status?: string) { const value = String(status || "not_requested").toLowerCase(); if (value === "approved") return "Coverage request approved"; if (value === "on_hold") return "Coverage request is under review"; if (value === "rejected") return "Coverage request declined"; if (value === "pending") return "Coverage request pending"; return "No coverage request yet"; }
function formatError(error: any) { return [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ") || String(error || "Unknown error"); }
function siteOrigin() { return typeof window !== "undefined" ? window.location.origin : "https://seattledesitv.com"; }

export default function EventDetailPage() {
  const params = useParams();
  const rawEventId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const eventId = String(rawEventId || "");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading event...");
  const [actionMessage, setActionMessage] = useState("");
  const [event, setEvent] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [coverageRequest, setCoverageRequest] = useState<any>(null);
  const [crewRequests, setCrewRequests] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const isOwner = Boolean(user?.id && event?.created_by === user.id);
  const canRequestCrew = Boolean(user && isTeamRole(role));
  const canAdmin = Boolean(user && isAdminRole(role));
  const images = getImages(event);

  async function loadRole(currentUser: any) {
    if (!currentUser?.id) { setRole("general_public"); return; }
    const adminResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    if (adminResult.data?.role) { setRole(cleanRole(adminResult.data.role)); return; }
    const requestResult = await supabase.from("user_role_requests").select("approved_role,requested_role,status").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
    setRole(cleanRole(requestResult.data?.approved_role || requestResult.data?.requested_role || "general_public"));
  }

  async function loadEvent() {
    const { data, error } = await supabase.from("events").select("id,title,date,location,description,image,image_urls,ticket_url,poc_email,poc_phone,created_by,status,crew_member_ids").eq("id", eventId).maybeSingle();
    if (error) { setMessage(`Could not load event: ${error.message}`); return null; }
    if (!data) { setMessage("Event not found."); return null; }
    setEvent(data);
    return data;
  }

  async function loadRequests(currentUser: any) {
    const { data } = await supabase.from("event_crew_assignments").select("id,event_id,user_id,user_email,assignment_type,status,created_at,approved_at,crew_confirmed,coverage_completed,coverage_notes").eq("event_id", eventId).order("created_at", { ascending: false });
    const rows = data || [];
    setCrewRequests(rows);
    const ownerCoverage = rows.find((r: any) => r.assignment_type === "owner_coverage_request" && (!currentUser?.id || r.user_id === currentUser.id));
    setCoverageRequest(ownerCoverage || rows.find((r: any) => r.assignment_type === "owner_coverage_request") || null);
  }

  async function init() {
    if (!eventId || eventId === "undefined") {
      setEvent(null);
      setMessage("Invalid event id.");
      setLoading(false);
      return;
    }
    if (eventId === "new") {
      setEvent(null);
      setMessage("Use the Events page to submit a new event.");
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    await loadRole(currentUser);
    const loadedEvent = await loadEvent();
    if (loadedEvent) await loadRequests(currentUser);
    setLoading(false);
  }

  async function notify(type: string, title: string, date: string, location: string, reviewUrl: string, directUrl?: string) {
    await fetch("/api/notify-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, title, date, location, submittedBy: user?.email || "unknown", reviewUrl, directUrl }) }).catch(() => null);
  }

  async function requestCoverage() {
    if (!user?.id || !isOwner || !event) return;
    setSaving(true); setActionMessage("Submitting coverage request...");
    const { error } = await supabase.from("event_crew_assignments").insert({ event_id: event.id, user_id: user.id, user_email: user.email || null, assignment_type: "owner_coverage_request", status: "pending", event_title: event.title });
    if (error) setActionMessage(`Could not request coverage: ${formatError(error)}`); else { await notify("event owner coverage request", event.title, event.date, event.location, `${siteOrigin()}/studio/coverage`, `${siteOrigin()}/studio/events/${event.id}`); setActionMessage("Coverage request submitted."); await loadRequests(user); }
    setSaving(false);
  }

  async function requestToCover() {
    if (!user?.id || !canRequestCrew || !event) return;
    setSaving(true); setActionMessage("Submitting crew request...");
    const { error } = await supabase.from("event_crew_assignments").insert({ event_id: event.id, user_id: user.id, user_email: user.email || null, assignment_type: "team_member_request", status: "pending", event_title: event.title });
    if (error) setActionMessage(`Could not request to cover: ${formatError(error)}`); else { await notify("team member crew request", event.title, event.date, event.location, `${siteOrigin()}/studio/crew/pending`, `${siteOrigin()}/studio/events/${event.id}`); setActionMessage("Request to cover submitted."); await loadRequests(user); }
    setSaving(false);
  }

  useEffect(() => { init(); }, [eventId]);

  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader />{loading ? <section className="max-w-5xl mx-auto px-6 py-16"><div className="bg-white rounded-2xl p-8 border">{message}</div></section> : !event ? <section className="max-w-5xl mx-auto px-6 py-16"><div className="bg-white rounded-2xl p-8 border"><p>{message}</p>{eventId === "new" && <a href="/events" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-black mt-5">Go to Event Submission</a>}</div></section> : <><section className="bg-slate-950 text-white"><div className="max-w-7xl mx-auto px-6 md:px-10 py-12 grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center"><div><a href="/events" className="text-pink-300 font-bold">← Back to Events</a><h1 className="text-4xl md:text-6xl font-black mt-4">{event.title}</h1><p className="text-slate-300 mt-4 text-lg">{dateText(event.date)} · {event.location}</p><div className="flex flex-wrap gap-3 mt-6">{event.ticket_url && <CheckedExternalLink href={event.ticket_url} notFoundMessage="Page not found. This ticket/register link is not available." className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black disabled:opacity-60">Tickets / Register</CheckedExternalLink>}<a href={`https://www.google.com/maps?q=${encodeURIComponent(event.location || "")}`} target="_blank" rel="noreferrer" className="bg-white text-slate-950 px-5 py-3 rounded-xl font-black">Open Map</a>{canAdmin && <a href={`/studio/events/${event.id}`} className="border border-white/70 px-5 py-3 rounded-xl font-black">Open in Studio</a>}</div></div>{images[0] ? <img src={images[0]} alt={event.title} className="w-full h-80 object-cover rounded-3xl shadow-xl" /> : <div className="w-full h-80 bg-white/10 rounded-3xl grid place-items-center text-pink-200 font-black">Seattle Desi TV</div>}</div></section><section className="max-w-7xl mx-auto px-6 md:px-10 py-10 grid lg:grid-cols-[1fr_360px] gap-8"><div className="space-y-6"><div className="bg-white border rounded-3xl p-6"><h2 className="text-2xl font-black">About This Event</h2><p className="text-gray-700 mt-4 whitespace-pre-line">{event.description || "No description provided."}</p></div>{images.length > 1 && <div className="bg-white border rounded-3xl p-6"><h2 className="text-2xl font-black mb-4">Gallery</h2><div className="grid md:grid-cols-3 gap-4">{images.map((image: string) => <img key={image} src={image} alt={event.title} className="w-full h-44 object-cover rounded-2xl" />)}</div></div>}</div><aside className="space-y-5"><div className="bg-white border rounded-3xl p-6"><h2 className="text-xl font-black">Event Details</h2><p className="text-gray-600 mt-3"><b>Date:</b> {dateText(event.date)}</p><p className="text-gray-600"><b>Location:</b> {event.location}</p>{user?.email && <p className="text-gray-600 mt-3"><b>Logged in:</b> {user.email}<br /><b>Role:</b> {role}</p>}</div>{isOwner && <div className="bg-white border rounded-3xl p-6"><h2 className="text-xl font-black">Organizer Coverage</h2><p className="text-gray-600 mt-3">{coverageLabel(coverageRequest?.status)}</p>{!coverageRequest && <button onClick={requestCoverage} disabled={saving} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl font-black mt-4">Request SDTV Coverage</button>}</div>}{canRequestCrew && <div className="bg-white border rounded-3xl p-6"><h2 className="text-xl font-black">SDTV Team</h2><p className="text-gray-600 mt-3">Request to cover this event as SDTV crew.</p><button onClick={requestToCover} disabled={saving} className="w-full border border-pink-600 text-pink-600 px-4 py-3 rounded-xl font-black mt-4">Request to Cover</button></div>}{canAdmin && <div className="bg-white border rounded-3xl p-6"><h2 className="text-xl font-black">Admin View</h2><p className="text-gray-600 mt-3">Crew/Coverage records: {crewRequests.length}</p><a href={`/studio/events/${event.id}`} className="block text-center bg-pink-600 text-white px-4 py-3 rounded-xl font-black mt-4">Manage Event</a></div>}{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}</aside></section></>}<SiteFooter /></main>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import CheckedExternalLink from "../../components/CheckedExternalLink";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

function cleanRole(role: string) { return String(role || "general_public").toLowerCase().trim(); }
function isTeamRole(role: string) { const next = cleanRole(role); return next === "team_member" || next.includes("admin"); }
function isAdminRole(role: string) { return cleanRole(role).includes("admin"); }
function getImages(event: any) { if (Array.isArray(event?.image_urls) && event.image_urls.length > 0) return event.image_urls; return event?.image ? [event.image] : []; }
function dateText(value?: string) { if (!value) return ""; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }
function compactDate(value?: string) { if (!value) return ""; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function coverageLabel(status?: string) { const value = String(status || "not_requested").toLowerCase(); if (value === "approved") return "Coverage request approved"; if (value === "on_hold") return "Coverage request is under review"; if (value === "rejected") return "Coverage request declined"; if (value === "pending") return "Coverage request pending"; return "No coverage request yet"; }
function formatError(error: any) { return [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ") || String(error || "Unknown error"); }
function siteOrigin() { return typeof window !== "undefined" ? window.location.origin : "https://seattledesitv.com"; }
function eventDate(value?: string) { if (!value) return null; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? null : d; }
function calendarStamp(value?: string) { const d = eventDate(value); if (!d) return ""; return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); }
function escapeIcs(value: string) { return String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }
function deriveTags(event: any) {
  const text = `${event?.title || ""} ${event?.description || ""}`.toLowerCase();
  const rules = [
    ["Music", ["music", "concert", "singer", "band", "dj"]],
    ["Dance", ["dance", "dancing", "classical dance", "bollywood"]],
    ["Community", ["community", "cultural", "association", "meetup"]],
    ["Family", ["family", "families", "all ages"]],
    ["Kids", ["kids", "children", "youth"]],
    ["Food", ["food", "dinner", "lunch", "cuisine", "restaurant"]],
    ["Charity", ["charity", "fundraiser", "nonprofit", "donation"]],
    ["Sports", ["sports", "cricket", "soccer", "tournament"]],
    ["Business", ["business", "networking", "entrepreneur", "conference"]],
    ["Festival", ["festival", "celebration", "utsav", "mela"]],
  ] as const;
  const matches = rules.filter(([, words]) => words.some((word) => text.includes(word))).map(([label]) => label);
  return matches.length ? matches.slice(0, 5) : ["Community Event"];
}
function countdownLabel(value?: string) {
  const target = eventDate(value);
  if (!target) return "Date to be announced";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "Event ended";
  if (diff === 0) return "Happening today";
  if (diff === 1) return "Starts tomorrow";
  return `Starts in ${diff} days`;
}

export default function EventDetailPage() {
  const params = useParams();
  const rawEventId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const eventId = String(rawEventId || "");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading event...");
  const [actionMessage, setActionMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [event, setEvent] = useState<any>(null);
  const [relatedEvents, setRelatedEvents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [coverageRequest, setCoverageRequest] = useState<any>(null);
  const [crewRequests, setCrewRequests] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const isOwner = Boolean(user?.id && event?.created_by === user.id);
  const canRequestCrew = Boolean(user && isTeamRole(role));
  const canAdmin = Boolean(user && isAdminRole(role));
  const images = getImages(event);
  const primaryImage = images[0] || null;
  const galleryImages = images.slice(1);
  const eventUrl = `${siteOrigin()}/events/${eventId}`;
  const tags = useMemo(() => deriveTags(event), [event]);
  const countdown = countdownLabel(event?.date);
  const eventEnded = countdown === "Event ended";

  async function loadRole(currentUser: any) {
    if (!currentUser?.id) { setRole("general_public"); return; }
    const adminResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    if (adminResult.data?.role) { setRole(cleanRole(adminResult.data.role)); return; }
    const requestResult = await supabase.from("user_role_requests").select("approved_role,requested_role,status").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
    setRole(cleanRole(requestResult.data?.approved_role || requestResult.data?.requested_role || "general_public"));
  }

  async function loadRelatedEvents(currentEvent: any) {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("events")
      .select("id,title,date,location,image,image_urls,ticket_url,status")
      .neq("id", currentEvent.id)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(3);
    setRelatedEvents(data || []);
  }

  async function loadEvent() {
    const { data, error } = await supabase.from("events").select("id,title,date,location,description,image,image_urls,ticket_url,created_by,status,crew_member_ids").eq("id", eventId).maybeSingle();
    if (error) { setMessage(`Could not load event: ${error.message}`); return null; }
    if (!data) { setMessage("Event not found."); return null; }
    setEvent(data);
    await loadRelatedEvents(data);
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
    if (!eventId || eventId === "undefined") { setEvent(null); setMessage("Invalid event id."); setLoading(false); return; }
    if (eventId === "new") { setEvent(null); setMessage("Use the Events page to submit a new event."); setLoading(false); return; }
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
    if (error) setActionMessage(`Could not request coverage: ${formatError(error)}`);
    else { await notify("event owner coverage request", event.title, event.date, event.location, `${siteOrigin()}/studio/coverage`, `${siteOrigin()}/studio/events/${event.id}`); setActionMessage("Coverage request submitted."); await loadRequests(user); }
    setSaving(false);
  }

  async function requestToCover() {
    if (!user?.id || !canRequestCrew || !event) return;
    setSaving(true); setActionMessage("Submitting crew request...");
    const { error } = await supabase.from("event_crew_assignments").insert({ event_id: event.id, user_id: user.id, user_email: user.email || null, assignment_type: "team_member_request", status: "pending", event_title: event.title });
    if (error) setActionMessage(`Could not request to cover: ${formatError(error)}`);
    else { await notify("team member crew request", event.title, event.date, event.location, `${siteOrigin()}/studio/crew/pending`, `${siteOrigin()}/studio/events/${event.id}`); setActionMessage("Request to cover submitted."); await loadRequests(user); }
    setSaving(false);
  }

  async function shareNative() {
    const payload = { title: event.title, text: `Check out ${event.title} on Seattle Desi TV`, url: eventUrl };
    try {
      if (navigator.share) await navigator.share(payload);
      else if (navigator.clipboard) { await navigator.clipboard.writeText(eventUrl); setShareMessage("Link copied!"); }
    } catch { /* User cancelled native share. */ }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(eventUrl); setShareMessage("Link copied!"); }
    catch { setShareMessage("Copy the page URL from your browser."); }
  }

  function downloadIcs() {
    if (!event) return;
    const start = calendarStamp(event.date);
    if (!start) return;
    const endDate = eventDate(event.date);
    if (!endDate) return;
    endDate.setDate(endDate.getDate() + 1);
    const end = endDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Seattle Desi TV//Events//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@seattledesitv.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `DESCRIPTION:${escapeIcs(event.description || `Event details: ${eventUrl}`)}`,
      `LOCATION:${escapeIcs(event.location || "")}`,
      `URL:${eventUrl}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${String(event.title || "event").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => { init(); }, [eventId]);
  useEffect(() => {
    if (!lightboxImage) return;
    const onKeyDown = (keyboardEvent: KeyboardEvent) => { if (keyboardEvent.key === "Escape") setLightboxImage(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxImage]);
  useEffect(() => { if (!shareMessage) return; const timer = window.setTimeout(() => setShareMessage(""), 2500); return () => window.clearTimeout(timer); }, [shareMessage]);

  const calendarText = encodeURIComponent(event ? `${event.title}\n${event.description || ""}\n${eventUrl}` : "");
  const calendarLocation = encodeURIComponent(event?.location || "");
  const calendarDates = event ? `${calendarStamp(event.date)}/${calendarStamp(event.date)}` : "";
  const googleCalendarUrl = event ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${calendarDates}&details=${calendarText}&location=${calendarLocation}` : "#";
  const outlookCalendarUrl = event ? `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&startdt=${eventDate(event.date)?.toISOString() || ""}&body=${calendarText}&location=${calendarLocation}` : "#";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      {loading ? (
        <section className="mx-auto max-w-5xl px-6 py-16"><div className="rounded-2xl border bg-white p-8">{message}</div></section>
      ) : !event ? (
        <section className="mx-auto max-w-5xl px-6 py-16"><div className="rounded-2xl border bg-white p-8"><p>{message}</p>{eventId === "new" && <a href="/events" className="mt-5 inline-block rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Go to Event Submission</a>}</div></section>
      ) : (
        <>
          <section className="relative overflow-hidden bg-slate-950 text-white">
            {primaryImage && <div className="absolute inset-0 bg-cover bg-center opacity-15 blur-sm scale-110" style={{ backgroundImage: `url(${primaryImage})` }} aria-hidden="true" />}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-950/75" />
            <div className="relative mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
              <a href="/events" className="font-bold text-pink-300">← Back to Events</a>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-black ${eventEnded ? "bg-slate-700 text-slate-200" : "bg-pink-600 text-white"}`}>{countdown}</span>
                {event.ticket_url && !eventEnded && <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-black text-emerald-200 ring-1 ring-emerald-300/40">Registration open</span>}
                {!event.ticket_url && !eventEnded && <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-slate-200">Event listing</span>}
              </div>
              <h1 className="mt-5 max-w-5xl text-4xl font-black md:text-6xl">{event.title}</h1>
              <p className="mt-4 text-lg text-slate-300">{dateText(event.date)} · {event.location}</p>
              <div className="mt-5 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-bold">{tag}</span>)}</div>
              <div className="mt-7 flex flex-wrap gap-3">
                {event.ticket_url && !eventEnded && <CheckedExternalLink href={event.ticket_url} notFoundMessage="Page not found. This ticket/register link is not available." className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">Tickets / Register</CheckedExternalLink>}
                <a href={`https://www.google.com/maps?q=${encodeURIComponent(event.location || "")}`} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Open Map</a>
                <button type="button" onClick={shareNative} className="rounded-xl border border-white/70 px-5 py-3 font-black">Share Event</button>
                {canAdmin && <a href={`/studio/events/${event.id}`} className="rounded-xl border border-pink-300 px-5 py-3 font-black text-pink-200">Open in Studio</a>}
              </div>
            </div>
          </section>

          <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:px-10 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <div className="rounded-3xl border bg-white p-6">
                <h2 className="text-2xl font-black">About This Event</h2>
                <p className="mt-4 whitespace-pre-line text-gray-700">{event.description || "No description provided."}</p>
              </div>

              {primaryImage && (
                <div className="rounded-3xl border bg-white p-6">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div><h2 className="text-2xl font-black">Full Event Flyer</h2><p className="mt-1 text-sm text-gray-500">The complete original flyer is shown without cropping.</p></div>
                    <button type="button" onClick={() => setLightboxImage(primaryImage)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Open full size</button>
                  </div>
                  <button type="button" onClick={() => setLightboxImage(primaryImage)} className="mt-5 w-full rounded-2xl bg-slate-100 p-3" aria-label="Open full event flyer">
                    <img src={primaryImage} alt={`${event.title} full flyer`} className="mx-auto max-h-[900px] w-full object-contain" />
                  </button>
                  <p className="mt-3 text-center text-xs font-bold text-gray-500">Click the flyer to enlarge it.</p>
                </div>
              )}

              {galleryImages.length > 0 && (
                <div className="rounded-3xl border bg-white p-6">
                  <div className="flex items-end justify-between gap-3"><div><h2 className="text-2xl font-black">Event Gallery</h2><p className="mt-1 text-sm text-gray-500">Swipe on mobile or select any image to view it full screen.</p></div><span className="text-sm font-black text-slate-500">{galleryImages.length} photos</span></div>
                  <div className="mt-5 flex snap-x gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3">
                    {galleryImages.map((image: string, index: number) => (
                      <button key={image} type="button" onClick={() => setLightboxImage(image)} className="min-w-[82%] snap-center rounded-2xl bg-slate-100 p-2 md:min-w-0">
                        <img src={image} alt={`${event.title} gallery image ${index + 1}`} className="h-64 w-full rounded-xl object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-3xl border bg-white">
                <div className="p-6"><h2 className="text-2xl font-black">Location</h2><p className="mt-2 text-gray-600">{event.location}</p></div>
                <iframe title={`Map for ${event.title}`} src={`https://www.google.com/maps?q=${encodeURIComponent(event.location || "")}&output=embed`} className="h-80 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>

              {relatedEvents.length > 0 && (
                <div className="rounded-3xl border bg-white p-6">
                  <div className="flex items-end justify-between gap-3"><div><h2 className="text-2xl font-black">You May Also Like</h2><p className="mt-1 text-sm text-gray-500">More upcoming events from Seattle Desi TV.</p></div><a href="/events" className="text-sm font-black text-pink-600">View all</a></div>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {relatedEvents.map((related: any) => {
                      const relatedImage = getImages(related)[0];
                      return <a key={related.id} href={`/events/${related.id}`} className="overflow-hidden rounded-2xl border bg-slate-50 transition hover:-translate-y-1 hover:shadow-lg">
                        {relatedImage ? <img src={relatedImage} alt={related.title} className="h-44 w-full object-cover" /> : <div className="grid h-44 place-items-center bg-slate-900 font-black text-pink-200">Seattle Desi TV</div>}
                        <div className="p-4"><p className="text-xs font-black uppercase tracking-wide text-pink-600">{compactDate(related.date)}</p><h3 className="mt-2 line-clamp-2 font-black">{related.title}</h3><p className="mt-2 line-clamp-1 text-sm text-slate-600">{related.location}</p></div>
                      </a>;
                    })}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <div className="rounded-3xl border bg-white p-6">
                <h2 className="text-xl font-black">Event Details</h2>
                <p className="mt-3 text-gray-600"><b>Date:</b><br />{dateText(event.date)}</p>
                <p className="mt-3 text-gray-600"><b>Location:</b><br />{event.location}</p>
                <p className="mt-3 text-gray-600"><b>Status:</b><br />{countdown}</p>
              </div>

              <div className="rounded-3xl border bg-white p-6">
                <h2 className="text-xl font-black">Share This Event</h2>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${event.title} ${eventUrl}`)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-3 py-3 text-center text-sm font-black text-white">WhatsApp</a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-700 px-3 py-3 text-center text-sm font-black text-white">Facebook</a>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${encodeURIComponent(eventUrl)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-950 px-3 py-3 text-center text-sm font-black text-white">X</a>
                  <button type="button" onClick={copyLink} className="rounded-xl border border-slate-300 px-3 py-3 text-sm font-black">Copy Link</button>
                </div>
                {shareMessage && <p className="mt-3 text-center text-sm font-bold text-emerald-700">{shareMessage}</p>}
              </div>

              <div className="rounded-3xl border bg-white p-6">
                <h2 className="text-xl font-black">Add to Calendar</h2>
                <div className="mt-4 space-y-2">
                  <a href={googleCalendarUrl} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-black hover:bg-slate-50">Google Calendar</a>
                  <a href={outlookCalendarUrl} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-black hover:bg-slate-50">Outlook</a>
                  <button type="button" onClick={downloadIcs} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-black hover:bg-slate-50">Apple / Download .ics</button>
                </div>
              </div>

              <div className="rounded-3xl border bg-white p-6 text-center">
                <h2 className="text-xl font-black">Scan to Share</h2>
                <p className="mt-2 text-sm text-slate-500">Open this event instantly on another device.</p>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(eventUrl)}`} alt={`QR code for ${event.title}`} className="mx-auto mt-4 h-52 w-52 rounded-xl border bg-white p-2" loading="lazy" />
              </div>

              {isOwner && <div className="rounded-3xl border bg-white p-6"><h2 className="text-xl font-black">Organizer Coverage</h2><p className="mt-3 text-gray-600">{coverageLabel(coverageRequest?.status)}</p>{!coverageRequest && <button onClick={requestCoverage} disabled={saving} className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 font-black text-white">Request SDTV Coverage</button>}</div>}
              {canRequestCrew && <div className="rounded-3xl border bg-white p-6"><h2 className="text-xl font-black">SDTV Team</h2><p className="mt-3 text-gray-600">Request to cover this event as SDTV crew.</p><button onClick={requestToCover} disabled={saving} className="mt-4 w-full rounded-xl border border-pink-600 px-4 py-3 font-black text-pink-600">Request to Cover</button></div>}
              {canAdmin && <div className="rounded-3xl border bg-white p-6"><h2 className="text-xl font-black">Admin View</h2><p className="mt-3 text-gray-600">Crew/Coverage records: {crewRequests.length}</p><a href={`/studio/events/${event.id}`} className="mt-4 block rounded-xl bg-pink-600 px-4 py-3 text-center font-black text-white">Manage Event</a></div>}
              {actionMessage && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}
            </aside>
          </section>
        </>
      )}

      {lightboxImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Full event image">
          <button type="button" onClick={() => setLightboxImage(null)} className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 font-black text-slate-950">Close</button>
          <button type="button" onClick={() => setLightboxImage(null)} className="flex h-full w-full items-center justify-center" aria-label="Close image preview">
            <img src={lightboxImage} alt={`${event?.title || "Event"} image`} className="max-h-[92vh] max-w-[96vw] object-contain" />
          </button>
        </div>
      )}

      <SiteFooter />
    </main>
  );
}

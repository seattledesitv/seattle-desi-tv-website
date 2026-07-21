"use client";

import { useEffect, useState } from "react";
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const isOwner = Boolean(user?.id && event?.created_by === user.id);
  const canRequestCrew = Boolean(user && isTeamRole(role));
  const canAdmin = Boolean(user && isAdminRole(role));
  const images = getImages(event);
  const primaryImage = images[0] || null;
  const galleryImages = images.slice(1);

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

  useEffect(() => { init(); }, [eventId]);
  useEffect(() => {
    if (!lightboxImage) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setLightboxImage(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxImage]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      {loading ? (
        <section className="mx-auto max-w-5xl px-6 py-16"><div className="rounded-2xl border bg-white p-8">{message}</div></section>
      ) : !event ? (
        <section className="mx-auto max-w-5xl px-6 py-16"><div className="rounded-2xl border bg-white p-8"><p>{message}</p>{eventId === "new" && <a href="/events" className="mt-5 inline-block rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Go to Event Submission</a>}</div></section>
      ) : (
        <>
          <section className="bg-slate-950 text-white">
            <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-12 md:px-10 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <a href="/events" className="font-bold text-pink-300">← Back to Events</a>
                <h1 className="mt-4 text-4xl font-black md:text-6xl">{event.title}</h1>
                <p className="mt-4 text-lg text-slate-300">{dateText(event.date)} · {event.location}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {event.ticket_url && <CheckedExternalLink href={event.ticket_url} notFoundMessage="Page not found. This ticket/register link is not available." className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">Tickets / Register</CheckedExternalLink>}
                  <a href={`https://www.google.com/maps?q=${encodeURIComponent(event.location || "")}`} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Open Map</a>
                  {canAdmin && <a href={`/studio/events/${event.id}`} className="rounded-xl border border-white/70 px-5 py-3 font-black">Open in Studio</a>}
                </div>
              </div>
              {primaryImage ? (
                <button type="button" onClick={() => setLightboxImage(primaryImage)} className="group relative min-h-80 w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-3 shadow-2xl" aria-label="Open full event flyer">
                  <img src={primaryImage} alt={event.title} className="h-80 w-full rounded-2xl object-contain transition duration-300 group-hover:scale-[1.01]" />
                  <span className="absolute bottom-5 right-5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-black text-white backdrop-blur">View full flyer</span>
                </button>
              ) : (
                <div className="grid h-80 w-full place-items-center rounded-3xl bg-white/10 font-black text-pink-200">Seattle Desi TV</div>
              )}
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
                    <div>
                      <h2 className="text-2xl font-black">Full Event Flyer</h2>
                      <p className="mt-1 text-sm text-gray-500">The complete original flyer is shown without cropping.</p>
                    </div>
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
                  <h2 className="mb-4 text-2xl font-black">Event Gallery</h2>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {galleryImages.map((image: string) => (
                      <button key={image} type="button" onClick={() => setLightboxImage(image)} className="rounded-2xl bg-slate-100 p-2">
                        <img src={image} alt={event.title} className="h-56 w-full rounded-xl object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <div className="rounded-3xl border bg-white p-6">
                <h2 className="text-xl font-black">Event Details</h2>
                <p className="mt-3 text-gray-600"><b>Date:</b> {dateText(event.date)}</p>
                <p className="text-gray-600"><b>Location:</b> {event.location}</p>
                {user?.email && <p className="mt-3 text-gray-600"><b>Logged in:</b> {user.email}<br /><b>Role:</b> {role}</p>}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Full event flyer">
          <button type="button" onClick={() => setLightboxImage(null)} className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 font-black text-slate-950">Close</button>
          <button type="button" onClick={() => setLightboxImage(null)} className="flex h-full w-full items-center justify-center" aria-label="Close flyer preview">
            <img src={lightboxImage} alt={`${event?.title || "Event"} flyer`} className="max-h-[92vh] max-w-[96vw] object-contain" />
          </button>
        </div>
      )}

      <SiteFooter />
    </main>
  );
}

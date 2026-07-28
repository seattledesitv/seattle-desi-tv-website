"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../../components/MyHubHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const RELATIONSHIPS = ["Organizer", "Co-Organizer", "Community Partner", "Educational Partner", "Charity Partner", "Venue Partner", "Media Partner", "Sponsor"];

function dateText(value?: string | null) {
  if (!value) return "Date not available";
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function LinkOrganizationEventPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading organizations and events...");
  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [eventId, setEventId] = useState("");
  const [relationship, setRelationship] = useState("Organizer");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const currentUser = auth?.user || null;
    setUser(currentUser);
    if (!currentUser?.id) { setMessage("Please log in to link an event to an organization."); setLoading(false); return; }

    const [submitted, managed, eventResult, requestResult] = await Promise.all([
      supabase.from("community_organizations").select("id,name,location,category,submitted_by").eq("submitted_by", currentUser.id).order("name"),
      supabase.from("organization_managers").select("organization_id,community_organizations(id,name,location,category)").eq("user_id", currentUser.id).eq("active", true),
      supabase.from("events").select("id,title,date,location,status,approved").or("status.eq.approved,approved.eq.true").order("date", { ascending: false }).limit(500),
      supabase.from("organization_event_link_requests").select("id,organization_id,event_id,relationship,status,admin_notes,created_at,community_organizations(name),events(title,date)").eq("requested_by", currentUser.id).order("created_at", { ascending: false }),
    ]);

    const map = new Map<string, any>();
    (submitted.data || []).forEach((row: any) => map.set(row.id, row));
    if (!managed.error) (managed.data || []).forEach((row: any) => { if (row.community_organizations) map.set(row.organization_id, row.community_organizations); });
    const nextOrganizations = Array.from(map.values());
    setOrganizations(nextOrganizations);
    setOrganizationId((current) => current || new URLSearchParams(window.location.search).get("organization") || nextOrganizations[0]?.id || "");
    setEvents(eventResult.data || []);
    setRequests(requestResult.error ? [] : requestResult.data || []);
    setMessage(submitted.error ? submitted.error.message : eventResult.error ? eventResult.error.message : "Select an existing approved event and submit the relationship for SDTV approval.");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((event) => `${event.title || ""} ${event.location || ""} ${event.date || ""}`.toLowerCase().includes(q));
  }, [events, search]);

  async function submit() {
    if (!user?.id || !organizationId || !eventId) { setMessage("Select an organization and an event."); return; }
    setSaving(true);
    setMessage("Submitting event link request...");
    const payload = { organization_id: organizationId, event_id: eventId, requested_by: user.id, relationship, request_notes: notes.trim() || null, status: "pending", updated_at: new Date().toISOString() };
    const result = await supabase.from("organization_event_link_requests").upsert(payload, { onConflict: "organization_id,event_id,requested_by" });
    setSaving(false);
    if (result.error) { setMessage(`Could not submit request: ${result.error.message}`); return; }
    setNotes("");
    setMessage("Event link request submitted for SDTV approval.");
    await load();
  }

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader/><section className="mx-auto max-w-6xl px-6 py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-black uppercase tracking-wide text-pink-300">My Organizations</p><h1 className="mt-2 text-4xl font-black">Link an Existing Event</h1><p className="mt-2 max-w-3xl text-slate-300">Connect an event already listed on Seattle Desi TV to an organization you manage. SDTV will review the request before the relationship appears publicly.</p></div><a href="/my-organizations" className="rounded-xl border border-white/20 px-5 py-3 font-black">Back to My Organizations</a></div>
    {message&&<div className="mt-6 rounded-2xl bg-white/10 p-4 font-bold">{message}</div>}
    {loading?<div className="mt-6 rounded-3xl bg-white/10 p-8">Loading...</div>:organizations.length===0?<div className="mt-6 rounded-3xl bg-white p-8 text-slate-950">No organizations are available for your account.</div>:<div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Request Event Link</h2><div className="mt-5 grid gap-4"><label className="grid gap-1 font-black">Organization<select value={organizationId} onChange={(e)=>setOrganizationId(e.target.value)} className="rounded-xl border p-3 font-normal">{organizations.map((organization)=><option key={organization.id} value={organization.id}>{organization.name} · {organization.location || organization.category || "Seattle Area"}</option>)}</select></label><label className="grid gap-1 font-black">Search events<input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by event name, location, or date..." className="rounded-xl border p-3 font-normal"/></label><label className="grid gap-1 font-black">Existing event<select value={eventId} onChange={(e)=>setEventId(e.target.value)} className="rounded-xl border p-3 font-normal"><option value="">Select an event...</option>{filteredEvents.map((event)=><option key={event.id} value={event.id}>{event.title} · {dateText(event.date)} · {event.location || "No location"}</option>)}</select></label><label className="grid gap-1 font-black">Organization relationship<select value={relationship} onChange={(e)=>setRelationship(e.target.value)} className="rounded-xl border p-3 font-normal">{RELATIONSHIPS.map((item)=><option key={item}>{item}</option>)}</select></label><label className="grid gap-1 font-black">Notes for SDTV <span className="font-normal text-slate-400">(optional)</span><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Explain how the organization is connected to this event." className="min-h-28 rounded-xl border p-3 font-normal"/></label><button onClick={submit} disabled={saving||!eventId} className="rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-50">{saving?"Submitting...":"Submit for Approval"}</button></div></section>
      <aside className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Your Requests</h2><div className="mt-4 space-y-3">{requests.length===0?<p className="text-slate-500">No event-link requests submitted yet.</p>:requests.map((request)=><article key={request.id} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{request.events?.title || "Event"}</h3><p className="text-sm text-slate-500">{request.community_organizations?.name || "Organization"}</p></div><span className={`rounded-full px-2 py-1 text-xs font-black uppercase ${request.status==="approved"?"bg-green-100 text-green-700":request.status==="rejected"?"bg-red-100 text-red-700":"bg-amber-100 text-amber-800"}`}>{request.status}</span></div><p className="mt-2 text-sm"><b>Relationship:</b> {request.relationship}</p>{request.admin_notes&&<p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm"><b>SDTV note:</b> {request.admin_notes}</p>}</article>)}</div></aside>
    </div>}
  </section><SiteFooter/></main>;
}

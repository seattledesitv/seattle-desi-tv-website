"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const RELATIONSHIPS = ["Organizer", "Co-Organizer", "Community Partner", "Educational Partner", "Charity Partner", "Venue Partner", "Media Partner", "Sponsor"];

type Mode = "owner" | "admin";

function label(value?: string | null) {
  return String(value || "").replaceAll("_", " ") || "—";
}

export default function EventOrganizationManager({ mode }: { mode: Mode }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading events and organizations...");
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [relationship, setRelationship] = useState("Organizer");
  const [isPrimary, setIsPrimary] = useState(false);
  const [search, setSearch] = useState("");

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);
  const visibleOrganizations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((organization) => `${organization.name || ""} ${organization.category || ""} ${organization.organization_type || ""} ${organization.location || ""}`.toLowerCase().includes(q));
  }, [organizations, search]);

  async function loadLinks(eventId: string) {
    if (!eventId) { setLinks([]); return; }
    const { data, error } = await supabase.from("event_organizations").select("id,event_id,organization_id,relationship,is_primary,display_order,community_organizations(id,name,organization_type,category,location)").eq("event_id", eventId).order("is_primary", { ascending: false }).order("display_order", { ascending: true });
    setLinks(data || []);
    if (error) setMessage(`Could not load organization links: ${error.message}`);
  }

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const currentUser = auth?.user || null;
    setUser(currentUser);
    if (!currentUser?.id) { setMessage("Please login to manage event organizations."); setLoading(false); return; }

    const eventQuery = supabase.from("events").select("id,title,date,location,status,created_by").order("date", { ascending: false }).limit(400);
    if (mode === "owner") eventQuery.eq("created_by", currentUser.id);
    const [eventResult, organizationResult] = await Promise.all([
      eventQuery,
      supabase.from("community_organizations").select("id,name,organization_type,category,location,status,approved,submitted_by").or(`and(status.eq.approved,approved.eq.true),submitted_by.eq.${currentUser.id}`).order("name", { ascending: true }),
    ]);

    const nextEvents = eventResult.data || [];
    setEvents(nextEvents);
    setOrganizations(organizationResult.data || []);
    const firstId = selectedEventId || nextEvents[0]?.id || "";
    setSelectedEventId(firstId);
    await loadLinks(firstId);
    setMessage(eventResult.error ? `Could not load events: ${eventResult.error.message}` : organizationResult.error ? `Could not load organizations: ${organizationResult.error.message}` : "");
    setLoading(false);
  }

  useEffect(() => { load(); }, [mode]);
  useEffect(() => { if (selectedEventId) loadLinks(selectedEventId); }, [selectedEventId]);

  async function addLink() {
    if (!selectedEventId || !organizationId) { setMessage("Select an event and organization."); return; }
    setSaving(true);
    setMessage("Adding organization relationship...");
    if (isPrimary) await supabase.from("event_organizations").update({ is_primary: false }).eq("event_id", selectedEventId).eq("is_primary", true);
    const { error } = await supabase.from("event_organizations").insert({ event_id: selectedEventId, organization_id: organizationId, relationship, is_primary: isPrimary, display_order: links.length, created_by: user?.id || null });
    if (error) setMessage(`Could not add organization: ${error.message}`);
    else { setOrganizationId(""); setRelationship("Organizer"); setIsPrimary(false); setMessage("Organization relationship added."); await loadLinks(selectedEventId); }
    setSaving(false);
  }

  async function updateLink(linkId: string, values: any) {
    setSaving(true);
    if (values.is_primary) await supabase.from("event_organizations").update({ is_primary: false }).eq("event_id", selectedEventId).eq("is_primary", true);
    const { error } = await supabase.from("event_organizations").update(values).eq("id", linkId).eq("event_id", selectedEventId);
    setMessage(error ? `Could not update relationship: ${error.message}` : "Organization relationship updated.");
    await loadLinks(selectedEventId);
    setSaving(false);
  }

  async function removeLink(linkId: string) {
    if (!window.confirm("Remove this organization relationship from the event?")) return;
    setSaving(true);
    const { error } = await supabase.from("event_organizations").delete().eq("id", linkId).eq("event_id", selectedEventId);
    setMessage(error ? `Could not remove relationship: ${error.message}` : "Organization relationship removed.");
    await loadLinks(selectedEventId);
    setSaving(false);
  }

  return <div className="space-y-6">
    {message && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}
    <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Event Selection</p><h2 className="mt-1 text-2xl font-black">Choose an event</h2></div><button onClick={load} className="rounded-xl bg-slate-100 px-4 py-3 font-black">Refresh</button></div>
      {loading ? <p className="mt-4 text-slate-500">Loading...</p> : events.length === 0 ? <p className="mt-4 text-slate-500">No events are available.</p> : <select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)} className="mt-4 w-full rounded-xl border p-3 font-bold">{events.map((event) => <option key={event.id} value={event.id}>{event.title} · {event.date || "No date"} · {label(event.status)}</option>)}</select>}
      {selectedEvent && <p className="mt-3 text-sm font-bold text-slate-500">{selectedEvent.location || "No location"}</p>}
    </section>

    {selectedEvent && <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
      <div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Organizations</p><h2 className="mt-1 text-2xl font-black">Manage relationships</h2><p className="mt-2 text-sm text-slate-500">Add organizers, partners, sponsors, or media relationships for this event.</p></div>
      <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_220px_auto]">
        <div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search organizations..." className="mb-2 w-full rounded-xl border bg-white p-3" /><select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="w-full rounded-xl border bg-white p-3"><option value="">Select organization...</option>{visibleOrganizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name} · {organization.location || organization.category || "Community"}</option>)}</select></div>
        <select value={relationship} onChange={(event) => setRelationship(event.target.value)} className="rounded-xl border bg-white p-3">{RELATIONSHIPS.map((item) => <option key={item}>{item}</option>)}</select>
        <div className="flex flex-col gap-2"><label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold"><input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} /> Primary</label><button onClick={addLink} disabled={saving || !organizationId} className="rounded-xl bg-pink-600 px-4 py-3 font-black text-white disabled:opacity-50">Add Relationship</button></div>
      </div>

      <div className="mt-5 space-y-3">{links.map((link) => { const organization = link.community_organizations; return <article key={link.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black">{organization?.name || "Community Organization"}</h3>{link.is_primary && <span className="rounded-full bg-pink-100 px-2 py-1 text-[10px] font-black uppercase text-pink-700">Primary</span>}</div><p className="mt-1 text-sm text-slate-500">{organization?.organization_type || organization?.category || "Community organization"} · {organization?.location || "Seattle Area"}</p></div><div className="flex flex-wrap gap-2"><select value={link.relationship} onChange={(event) => updateLink(link.id, { relationship: event.target.value })} disabled={saving} className="rounded-xl border p-2 font-bold">{RELATIONSHIPS.map((item) => <option key={item}>{item}</option>)}</select><button onClick={() => updateLink(link.id, { is_primary: true })} disabled={saving || link.is_primary} className="rounded-xl border px-3 py-2 text-sm font-black disabled:opacity-40">Set Primary</button><button onClick={() => removeLink(link.id)} disabled={saving} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">Remove</button></div></div></article>; })}{links.length === 0 && <div className="rounded-2xl border border-dashed p-6 text-center font-bold text-slate-500">No organizations are linked to this event yet.</div>}</div>
    </section>}
  </div>;
}

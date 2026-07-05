"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
function dateText(v?: string | null) { if (!v) return "Date TBD"; const d = new Date(`${String(v).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString(); }
function cleanPhone(v?: string | null) { return String(v || "").replace(/[^0-9+]/g, ""); }

export default function EventPocsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [pocs, setPocs] = useState<Record<string, any>>({});
  const [eventSearch, setEventSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [form, setForm] = useState<any>({});
  const canAccess = Boolean(user && isAdminRole(role));

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    return events.filter((event) => !q || `${event.title || ""} ${event.location || ""} ${event.poc_email || ""}`.toLowerCase().includes(q));
  }, [events, eventSearch]);
  const selectedEvent = events.find((event) => event.id === selectedEventId) || filteredEvents[0] || null;

  async function load() {
    setLoading(true); setMessage("Loading...");
    const auth = await supabase.auth.getUser(); const current = auth.data?.user || null; setUser(current);
    const nextRole = current ? await resolveUserRole(supabase, current) : ""; setRole(nextRole);
    if (!current || !isAdminRole(nextRole)) { setMessage("Studio admin access required."); setLoading(false); return; }
    const [eventsResult, adminsResult, profilesResult, teamResult, pocsResult] = await Promise.all([
      supabase.from("events").select("id,title,date,location,status,poc_email,poc_phone,created_at").order("date", { ascending: false }).limit(500),
      supabase.from("admins").select("user_id,email,role,name,created_at").order("created_at", { ascending: false }),
      supabase.from("user_profiles").select("user_id,email,full_name,profile_photo_url,phone"),
      supabase.from("team_members").select("name,email,image,user_id"),
      supabase.from("event_admin_pocs").select("*")
    ]);
    if (eventsResult.error) { setMessage(eventsResult.error.message); setLoading(false); return; }
    if (pocsResult.error) { setMessage("Run supabase/event-admin-poc.sql first, then refresh this page."); setLoading(false); return; }
    const profileByUser: Record<string, any> = {}; const profileByEmail: Record<string, any> = {}; const teamByEmail: Record<string, any> = {};
    (profilesResult.data || []).forEach((p: any) => { if (p.user_id) profileByUser[p.user_id] = p; if (p.email) profileByEmail[String(p.email).toLowerCase()] = p; });
    (teamResult.data || []).forEach((t: any) => { if (t.email) teamByEmail[String(t.email).toLowerCase()] = t; });
    const adminRows = (adminsResult.data || []).filter((a: any) => a.email).map((a: any) => {
      const email = String(a.email || "").toLowerCase(); const profile = profileByUser[a.user_id || ""] || profileByEmail[email] || {}; const team = teamByEmail[email] || {};
      return { ...a, email, displayName: a.name || profile.full_name || team.name || email, phone: profile.phone || "", photo: profile.profile_photo_url || team.image || "" };
    }).sort((a: any, b: any) => String(a.displayName).localeCompare(String(b.displayName)));
    const pocMap: Record<string, any> = {}; (pocsResult.data || []).forEach((p: any) => { pocMap[p.event_id] = p; });
    setEvents(eventsResult.data || []); setAdmins(adminRows); setPocs(pocMap); setSelectedEventId((currentId) => currentId || eventsResult.data?.[0]?.id || ""); setMessage(""); setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!selectedEvent) return;
    const current = pocs[selectedEvent.id] || {};
    setForm({ admin_user_id: current.admin_user_id || "", admin_email: current.admin_email || "", admin_name: current.admin_name || "", admin_phone: current.admin_phone || "", admin_photo_url: current.admin_photo_url || "", notes: current.notes || "" });
  }, [selectedEventId, pocs, selectedEvent?.id]);

  function chooseAdmin(id: string) {
    const admin = admins.find((a) => String(a.user_id || a.email) === id);
    if (!admin) return;
    setForm({ ...form, admin_user_id: admin.user_id || null, admin_email: admin.email, admin_name: admin.displayName, admin_phone: form.admin_phone || admin.phone || "", admin_photo_url: admin.photo || form.admin_photo_url || "" });
  }
  async function save() {
    if (!selectedEvent) return;
    setSaving(true); setMessage("Saving POC...");
    const session = await supabase.auth.getSession(); const token = session.data.session?.access_token || "";
    const response = await fetch("/api/studio/event-poc", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" }, body: JSON.stringify({ ...form, event_id: selectedEvent.id }) });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) setMessage(result.error || "Could not save POC."); else { setMessage("Event Admin POC saved."); await load(); }
  }

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">Studio</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Event Admin POCs</h1><p className="mt-3 max-w-3xl text-slate-300">Assign the SDTV admin contact shown to organizers on My Event Status. Email goes to the assigned POC and info@seattledesitv.com.</p></div><button onClick={load} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button></div>{loading && <div className="rounded-2xl bg-white/10 p-6 font-bold">{message}</div>}{!loading && !canAccess && <div className="rounded-2xl bg-white p-8 font-bold text-slate-950">{message}</div>}{!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[420px_1fr]"><aside className="rounded-3xl bg-white p-4 text-slate-950"><input value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} placeholder="Search events..." className="w-full rounded-xl border p-3 font-bold" /><div className="mt-4 grid max-h-[72vh] gap-3 overflow-y-auto pr-1">{filteredEvents.map((event) => <button key={event.id} onClick={() => setSelectedEventId(event.id)} className={`rounded-2xl border p-4 text-left ${selectedEvent?.id === event.id ? "border-pink-500 bg-pink-50 ring-2 ring-pink-100" : "bg-white hover:bg-slate-50"}`}><p className="font-black">{event.title}</p><p className="mt-1 text-sm text-slate-600">{dateText(event.date)} · {event.location || "No location"}</p><p className="mt-2 text-xs font-bold text-slate-500">Organizer: {event.poc_email || "—"}</p>{pocs[event.id]?.admin_email && <p className="mt-2 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">POC: {pocs[event.id].admin_name || pocs[event.id].admin_email}</p>}</button>)}</div></aside><section className="rounded-3xl bg-white p-6 text-slate-950">{!selectedEvent ? <p>No event selected.</p> : <><div className="mb-6"><p className="text-xs font-black uppercase tracking-wide text-pink-600">Selected Event</p><h2 className="mt-1 text-3xl font-black">{selectedEvent.title}</h2><p className="mt-1 text-slate-600">{dateText(selectedEvent.date)} · {selectedEvent.location || "No location"}</p></div><div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]"><div className="space-y-4"><label className="grid gap-1 font-black">Choose Admin<select value={form.admin_user_id || form.admin_email || ""} onChange={(e) => chooseAdmin(e.target.value)} className="rounded-xl border p-3 font-normal"><option value="">Select admin...</option>{admins.map((admin) => <option key={admin.user_id || admin.email} value={admin.user_id || admin.email}>{admin.displayName} · {admin.email}</option>)}</select></label><label className="grid gap-1 font-black">POC Name<input value={form.admin_name || ""} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 font-black">POC Email<input value={form.admin_email || ""} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 font-black">POC WhatsApp / Phone<input value={form.admin_phone || ""} onChange={(e) => setForm({ ...form, admin_phone: e.target.value })} placeholder="+1425..." className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 font-black">POC Photo URL<input value={form.admin_photo_url || ""} onChange={(e) => setForm({ ...form, admin_photo_url: e.target.value })} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 font-black">Internal Notes<textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="rounded-xl border p-3 font-normal" /></label><button onClick={save} disabled={saving} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Event POC"}</button></div><div className="rounded-3xl border bg-slate-50 p-5"><p className="text-sm font-black uppercase tracking-wide text-slate-500">Organizer Preview</p><div className="mt-4 flex items-center gap-4"><div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-white text-pink-600 font-black">{form.admin_photo_url ? <img src={form.admin_photo_url} alt={form.admin_name || "Admin POC"} className="h-full w-full object-cover" /> : "SDTV"}</div><div><h3 className="text-xl font-black">{form.admin_name || "SDTV Team"}</h3><p className="text-sm font-bold text-slate-600">Your SDTV event contact</p><p className="text-sm text-slate-500">{form.admin_email || "info@seattledesitv.com"}</p></div></div>{cleanPhone(form.admin_phone) && <a href={`https://wa.me/${cleanPhone(form.admin_phone).replace(/^\+/, "")}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl bg-green-600 px-4 py-3 font-black text-white">WhatsApp POC</a>}</div></div></>}</section>{message && <div className="lg:col-span-2 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}</div>}</div></main>;
}

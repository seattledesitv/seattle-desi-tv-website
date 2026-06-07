"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const STATUSES = ["all", "pending", "approved", "on_hold", "rejected"];

function roleContainsAdmin(role: string) { return String(role || "").toLowerCase().trim().includes("admin"); }
function normalizedStatus(status?: string | null) { return String(status || "pending").toLowerCase(); }
function parseDate(value?: string | null) { if (!value) return null; const parsed = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function formatDate(value?: string | null) { const parsed = parseDate(value); if (!parsed) return value || ""; return parsed.toLocaleDateString(); }
function statusClass(status?: string | null) { const normalized = normalizedStatus(status); if (normalized === "approved") return "bg-green-100 text-green-800"; if (normalized === "rejected") return "bg-red-100 text-red-800"; if (normalized === "on_hold") return "bg-yellow-100 text-yellow-800"; return "bg-gray-100 text-gray-800"; }
function getImage(row: any) { if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0]; return row?.image || ""; }
function ImageThumb({ src, label }: { src?: string; label: string }) { if (!src) return <div className="w-28 h-28 rounded-xl bg-pink-50 grid place-items-center text-pink-600 font-black text-xs text-center px-2">No image</div>; return <img src={src} alt={label} className="w-28 h-28 rounded-xl object-cover bg-gray-100 border" />; }

export default function StudioEventsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const canAccess = Boolean(user && roleContainsAdmin(role));

  async function loadEvents() {
    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,location,description,status,image,image_urls,ticket_url,poc_email,poc_phone,created_at,featured,featured_order")
      .order("date", { ascending: true });
    if (error) { setActionMessage(`Could not load events: ${error.message}`); return; }
    setEvents(data || []);
  }

  async function init() {
    setLoading(true);
    setMessage("Checking access...");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setRole(""); setEvents([]); setMessage("Please login to access Studio Events."); setLoading(false); return; }
    const adminResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    const nextRole = adminResult.data?.role || "";
    setRole(nextRole);
    if (!roleContainsAdmin(nextRole)) { setMessage("You are logged in, but this account does not have admin access."); setLoading(false); return; }
    await loadEvents();
    setMessage("");
    setLoading(false);
  }

  async function updateEventStatus(id: string, status: string) {
    setActionMessage("Updating event...");
    const payload: any = { status };
    if (status === "approved") { payload.approved = true; payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); } else { payload.approved = false; }
    const { error } = await supabase.from("events").update(payload).eq("id", id);
    if (error) { setActionMessage(`Event update failed: ${error.message}`); return; }
    setActionMessage(`Event marked ${status}.`);
    await loadEvents();
  }

  async function updateFeatured(id: string, featured: boolean, featuredOrder: number = 0) {
    setActionMessage("Updating featured event...");
    const { error } = await supabase.from("events").update({ featured, featured_order: Number(featuredOrder || 0) }).eq("id", id);
    if (error) { setActionMessage(`Featured update failed: ${error.message}`); return; }
    setActionMessage(featured ? "Event added to homepage hero." : "Event removed from homepage hero.");
    await loadEvents();
  }

  async function deleteEvent(id: string, title: string) {
    const ok = window.confirm(`Delete event: ${title}? This cannot be undone.`);
    if (!ok) return;
    setActionMessage("Deleting event...");
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { setActionMessage(`Event delete failed: ${error.message}`); return; }
    setActionMessage("Event deleted.");
    await loadEvents();
  }

  async function logout() {
    await supabase.auth.signOut({ scope: "global" });
    try { Object.keys(localStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY).forEach((key) => localStorage.removeItem(key)); } catch {}
    window.location.href = "/login";
  }

  useEffect(() => { init(); }, []);

  const years = useMemo(() => { const list = Array.from(new Set(events.map((event) => parseDate(event.date)?.getFullYear()).filter(Boolean) as number[])); return list.sort((a, b) => a - b); }, [events]);
  const counts = useMemo(() => { const base: Record<string, number> = { all: events.length, pending: 0, approved: 0, on_hold: 0, rejected: 0 }; events.forEach((event) => { const status = normalizedStatus(event.status); if (base[status] === undefined) base[status] = 0; base[status] += 1; }); return base; }, [events]);
  const filteredEvents = useMemo(() => { const search = searchText.trim().toLowerCase(); return events.filter((event) => { const eventDate = parseDate(event.date); const status = normalizedStatus(event.status); const matchesStatus = statusFilter === "all" || status === statusFilter; const matchesMonth = monthFilter === "all" || (eventDate && String(eventDate.getMonth()) === monthFilter); const matchesYear = yearFilter === "all" || (eventDate && String(eventDate.getFullYear()) === yearFilter); const matchesSearch = !search || [event.title, event.location, event.description, event.poc_email].filter(Boolean).join(" ").toLowerCase().includes(search); return matchesStatus && matchesMonth && matchesYear && matchesSearch; }); }, [events, statusFilter, monthFilter, yearFilter, searchText]);

  const calendarContext = useMemo(() => {
    const now = new Date();
    const selectedYear = yearFilter !== "all" ? Number(yearFilter) : years[0] || now.getFullYear();
    const selectedMonth = monthFilter !== "all" ? Number(monthFilter) : now.getMonth();
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const leadingEmptyDays = firstDay.getDay();
    const cells: Array<{ day: number | null; events: any[] }> = [];
    for (let i = 0; i < leadingEmptyDays; i += 1) cells.push({ day: null, events: [] });
    for (let day = 1; day <= daysInMonth; day += 1) { const dayEvents = filteredEvents.filter((event) => { const eventDate = parseDate(event.date); return eventDate && eventDate.getFullYear() === selectedYear && eventDate.getMonth() === selectedMonth && eventDate.getDate() === day; }); cells.push({ day, events: dayEvents }); }
    return { selectedYear, selectedMonth, cells };
  }, [filteredEvents, monthFilter, yearFilter, years]);

  function resetFilters() { setStatusFilter("all"); setMonthFilter("all"); setYearFilter("all"); setSearchText(""); }

  function EventActions({ event }: { event: any }) {
    return (
      <div className="flex flex-wrap gap-2 md:justify-end md:items-center">
        <a href={`/studio/events/${event.id}`} className="bg-slate-900 text-white px-3 py-2 rounded-lg font-bold text-sm">Edit</a>
        {event.featured ? <button onClick={() => updateFeatured(event.id, false, event.featured_order || 0)} className="bg-purple-700 text-white px-3 py-2 rounded-lg font-bold text-sm">Remove Hero</button> : <button onClick={() => updateFeatured(event.id, true, event.featured_order || 0)} className="bg-purple-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Feature Hero</button>}
        <button onClick={() => updateEventStatus(event.id, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button>
        <button onClick={() => updateEventStatus(event.id, "on_hold")} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">On Hold</button>
        <button onClick={() => updateEventStatus(event.id, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button>
        <button onClick={() => deleteEvent(event.id, event.title)} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><a href="/studio" className="text-pink-300 font-bold">← Back to Studio</a><h1 className="text-4xl md:text-5xl font-black mt-3">Events Management</h1><p className="text-slate-300 mt-2">{user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Studio events"}</p></div><div className="flex flex-wrap gap-3"><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>{user && <button onClick={logout} className="border border-red-400 text-red-300 px-5 py-3 rounded-xl font-bold">Logout</button>}</div></div>
        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Access Required</h2><p className="text-gray-600 mt-3">{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}
        {!loading && canAccess && <div className="space-y-8">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">{STATUSES.map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`text-left rounded-2xl p-5 border ${statusFilter === status ? "bg-pink-600 border-pink-600 text-white" : "bg-white/10 border-white/10 text-white"}`}><p className="text-sm opacity-80 capitalize">{status === "all" ? "All Events" : status.replace("_", " ")}</p><p className="text-3xl font-black">{counts[status] || 0}</p></button>)}</div><section className="bg-white text-slate-950 rounded-2xl p-6"><div className="grid lg:grid-cols-[1.4fr_1fr_1fr_auto_auto] gap-3 mb-5"><input className="border rounded-lg p-3" placeholder="Search title, location, description, POC..." value={searchText} onChange={(event) => setSearchText(event.target.value)} /><select className="border rounded-lg p-3" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}><option value="all">All months</option>{MONTHS.map((month, index) => <option key={month} value={String(index)}>{month}</option>)}</select><select className="border rounded-lg p-3" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}><option value="all">All years</option>{years.map((year) => <option key={year} value={String(year)}>{year}</option>)}</select><button type="button" onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")} className="bg-slate-900 text-white px-4 py-3 rounded-lg font-bold">{viewMode === "list" ? "Calendar View" : "List View"}</button><button type="button" onClick={resetFilters} className="border px-4 py-3 rounded-lg font-bold">Reset</button></div><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4"><h2 className="text-2xl font-black">{viewMode === "list" ? "Filtered Events" : `${MONTHS[calendarContext.selectedMonth]} ${calendarContext.selectedYear}`}</h2><p className="text-sm text-gray-500">Showing {filteredEvents.length} of {events.length} event(s)</p></div>{viewMode === "list" ? <div className="grid gap-4">{filteredEvents.map((event) => <article key={event.id} className="border rounded-xl p-4 grid md:grid-cols-[112px_1fr_auto] gap-4 items-center"><ImageThumb src={getImage(event)} label={event.title} /><div><h3 className="text-xl font-black">{event.title}</h3><p className="text-sm text-gray-600">{formatDate(event.date)} · {event.location}</p>{event.description && <p className="text-sm text-gray-700 mt-2 line-clamp-2">{event.description}</p>}{event.ticket_url && <a href={event.ticket_url} target="_blank" className="inline-block text-sm text-pink-600 font-bold mt-2">Ticket link</a>}<div className="flex flex-wrap gap-2 mt-3"><span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${statusClass(event.status)}`}>{event.status || "pending"}</span>{event.featured && <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">Homepage Hero</span>}{event.poc_email && <span className="text-xs bg-gray-100 px-2 py-1 rounded">POC: {event.poc_email}</span>}</div>{event.featured && <div className="mt-3 flex items-center gap-2"><span className="text-xs font-bold">Hero Order</span><input type="number" min="0" defaultValue={event.featured_order || 0} className="border rounded px-2 py-1 w-24" onBlur={(e) => updateFeatured(event.id, true, Number(e.target.value || 0))} /></div>}</div><EventActions event={event} /></article>)}{filteredEvents.length === 0 && <p className="text-gray-500">No events match the selected filters.</p>}</div> : <div>{monthFilter === "all" && <p className="text-sm text-orange-600 font-bold mb-3">Calendar view uses the current month unless you choose a month above.</p>}<div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-gray-500 mb-2">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day}>{day}</div>)}</div><div className="grid grid-cols-7 gap-2">{calendarContext.cells.map((cell, index) => <div key={index} className="min-h-32 border rounded-xl p-2 bg-gray-50 text-left">{cell.day && <p className="text-sm font-black text-gray-700 mb-2">{cell.day}</p>}<div className="space-y-1">{cell.events.map((event) => <a key={event.id} href={`/studio/events/${event.id}`} className={`block rounded-lg px-2 py-1 text-xs font-bold ${statusClass(event.status)}`}>{event.title}</a>)}</div></div>)}</div></div>}</section></div>}
      </div>
    </main>
  );
}

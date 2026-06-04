"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", { auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

function isAdminRole(role: string) { return String(role || "").toLowerCase().includes("admin"); }
function firstImage(event: any) { if (Array.isArray(event?.image_urls) && event.image_urls.length > 0) return event.image_urls[0]; return event?.image || ""; }
function dateText(value?: string) { if (!value) return ""; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
function todayIso() { return new Date().toISOString().split("T")[0]; }
function monthIso() { return new Date().toISOString().slice(0, 7); }

export default function AssignmentsCalendarPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [month, setMonth] = useState(monthIso());
  const [events, setEvents] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);

  const canAccess = Boolean(user && isAdminRole(role));

  const startDate = `${month}-01`;
  const endDate = useMemo(() => {
    const d = new Date(`${month}-01T00:00:00`);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  }, [month]);

  function memberFor(id: string) { return members.find((m) => m.user_id === id) || null; }
  function availabilityFor(userId: string, date: string) { return availability.find((a) => a.user_id === userId && a.available_date === date) || null; }

  async function loadData() {
    const [eventsResult, membersResult, availabilityResult] = await Promise.all([
      supabase.from("events").select("id,title,date,location,image,image_urls,status,crew_member_ids,poc_email,poc_phone").gte("date", startDate).lt("date", endDate).order("date", { ascending: true }),
      supabase.from("admins").select("user_id,email,role,name").order("email", { ascending: true }),
      supabase.from("crew_availability").select("user_id,user_email,available_date,status,note").gte("available_date", startDate).lt("available_date", endDate)
    ]);

    if (eventsResult.error) setMessage(`Could not load events: ${eventsResult.error.message}`); else setEvents(eventsResult.data || []);
    if (membersResult.error) setMessage(`Could not load members: ${membersResult.error.message}`); else setMembers((membersResult.data || []).filter((m: any) => m.user_id));
    if (availabilityResult.error) setMessage(`Could not load availability: ${availabilityResult.error.message}`); else setAvailability(availabilityResult.data || []);
  }

  async function init() {
    setLoading(true);
    const session = await supabase.auth.getSession();
    const currentUser = session.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access the assignments calendar."); setLoading(false); return; }

    const roleResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    const nextRole = roleResult.data?.role || "";
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This page is for admins only."); setLoading(false); return; }

    await loadData();
    setMessage("");
    setLoading(false);
  }

  useEffect(() => { init(); }, []);
  useEffect(() => { if (!loading && canAccess) loadData(); }, [month]);

  return <main className="min-h-screen bg-slate-950 text-white px-6 py-10"><div className="max-w-7xl mx-auto"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><a href="/studio" className="text-pink-300 font-bold">← Back to Studio</a><h1 className="text-4xl md:text-5xl font-black mt-3">Assignments Calendar</h1><p className="text-slate-300 mt-2">View assigned crew and availability by event date.</p></div><div className="flex gap-3"><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="text-slate-950 rounded-xl px-4 py-3 font-bold" /><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button></div></div>{loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}{!loading && canAccess && <div className="space-y-5"><div className="bg-white/10 rounded-2xl p-5"><p className="text-slate-300">Events This Month</p><p className="text-4xl font-black">{events.length}</p></div><div className="grid gap-5">{events.map((event) => { const image = firstImage(event); const crewIds = Array.isArray(event.crew_member_ids) ? event.crew_member_ids : []; return <article key={event.id} className="bg-white text-slate-950 rounded-2xl p-4 grid lg:grid-cols-[120px_1fr] gap-4"><div>{image ? <img src={image} alt={event.title} className="w-28 h-28 rounded-xl object-cover" /> : <div className="w-28 h-28 bg-pink-50 rounded-xl grid place-items-center text-pink-600 font-black text-xs">No image</div>}</div><div><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3"><div><h2 className="text-xl font-black">{event.title}</h2><p className="text-gray-600">{dateText(event.date)} · {event.location}</p><p className="text-xs text-gray-500 mt-1">Status: {event.status || "unknown"}</p></div><a href={`/studio/events/${event.id}`} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm text-center">Open Event</a></div><div className="mt-4"><h3 className="font-black mb-2">Assigned Crew ({crewIds.length})</h3>{crewIds.length === 0 && <p className="text-sm text-gray-500">No crew assigned yet.</p>}<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{crewIds.map((crewId: string) => { const member = memberFor(crewId); const av = availabilityFor(crewId, event.date); return <div key={crewId} className="border rounded-xl p-3 text-sm"><p className="font-black">{member?.name || member?.email || crewId}</p><p className="text-gray-600">{member?.email || "No email"}</p><p className="mt-2">Availability: <b>{av?.status || "not marked"}</b></p>{av?.note && <p className="text-gray-500 mt-1">{av.note}</p>}</div>; })}</div></div></div></article>; })}{events.length === 0 && <div className="bg-white text-slate-950 rounded-2xl p-8">No events found for this month.</div>}</div></div>}</div></main>;
}

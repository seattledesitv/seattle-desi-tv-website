"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", {
  auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().includes("admin");
}

function dateText(value?: string) {
  if (!value) return "";
  const d = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function getImage(row: any) {
  if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row?.image || "";
}

export default function PendingEventsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);

  const canAccess = Boolean(user && roleContainsAdmin(role));

  async function loadEvents() {
    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,location,description,status,image,image_urls,ticket_url,poc_email,created_at")
      .or("status.is.null,status.eq.pending")
      .order("created_at", { ascending: false });

    if (error) setActionMessage(`Could not load pending events: ${error.message}`);
    else setEvents(data || []);
  }

  async function init() {
    setLoading(true);
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);

    if (!currentUser) {
      setMessage("Please login to access pending events.");
      setLoading(false);
      return;
    }

    const adminResult = await supabase
      .from("admins")
      .select("role")
      .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
      .maybeSingle();

    const nextRole = adminResult.data?.role || "";
    setRole(nextRole);

    if (!roleContainsAdmin(nextRole)) {
      setMessage("This account does not have admin access.");
      setLoading(false);
      return;
    }

    await loadEvents();
    setMessage("");
    setLoading(false);
  }

  async function updateEventStatus(id: string, status: string) {
    setActionMessage("Updating event...");
    const payload: any = { status, approved: status === "approved" };
    if (status === "approved") {
      payload.approved_by = user?.email || user?.id || null;
      payload.approved_at = new Date().toISOString();
    }

    const { error } = await supabase.from("events").update(payload).eq("id", id);
    if (error) setActionMessage(`Update failed: ${error.message}`);
    else {
      setActionMessage(`Event marked ${status}.`);
      await loadEvents();
    }
  }

  async function deleteEvent(id: string, title: string) {
    if (!window.confirm(`Delete event: ${title}?`)) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) setActionMessage(`Delete failed: ${error.message}`);
    else {
      setActionMessage("Event deleted.");
      await loadEvents();
    }
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <a href="/studio" className="text-pink-300 font-bold">← Back to Studio</a>
        <h1 className="text-4xl md:text-5xl font-black mt-3">Pending Events</h1>
        <p className="text-slate-300 mt-2 mb-8">Review new event submissions waiting for approval.</p>

        {loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}

        {!loading && canAccess && (
          <div className="space-y-5">
            {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}
            <div className="bg-white/10 rounded-2xl p-5"><p className="text-slate-300">Pending Events</p><p className="text-4xl font-black">{events.length}</p></div>
            <div className="grid gap-4">
              {events.map((event) => (
                <article key={event.id} className="bg-white text-slate-950 rounded-2xl p-4 grid md:grid-cols-[112px_1fr_auto] gap-4 items-center">
                  {getImage(event) ? <img src={getImage(event)} alt={event.title} className="w-28 h-28 rounded-xl object-cover" /> : <div className="w-28 h-28 bg-pink-50 rounded-xl grid place-items-center text-pink-600 font-black text-xs">No image</div>}
                  <div>
                    <h2 className="text-xl font-black">{event.title}</h2>
                    <p className="text-sm text-gray-600">{dateText(event.date)} · {event.location}</p>
                    {event.description && <p className="text-sm text-gray-700 mt-2 line-clamp-2">{event.description}</p>}
                    {event.poc_email && <p className="text-xs text-gray-500 mt-2">POC: {event.poc_email}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <a href={`/studio/events/${event.id}`} className="bg-slate-900 text-white px-3 py-2 rounded-lg font-bold text-sm">Edit</a>
                    <button onClick={() => updateEventStatus(event.id, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button>
                    <button onClick={() => updateEventStatus(event.id, "on_hold")} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">On Hold</button>
                    <button onClick={() => updateEventStatus(event.id, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button>
                    <button onClick={() => deleteEvent(event.id, event.title)} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button>
                  </div>
                </article>
              ))}
              {events.length === 0 && <div className="bg-white text-slate-950 rounded-2xl p-8">No pending events.</div>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

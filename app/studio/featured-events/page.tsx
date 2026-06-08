"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

function firstImage(row: any) {
  if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row?.image || "";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function FeaturedEventsStudioPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [events, setEvents] = useState<any[]>([]);
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadEvents() {
    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,location,status,image,image_urls,ticket_url,featured,featured_order")
      .eq("status", "approved")
      .order("featured_order", { ascending: true })
      .order("date", { ascending: true });

    if (error) {
      setMessage(`Could not load events: ${error.message}`);
      return;
    }
    setEvents(data || []);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);

    if (!currentUser) {
      setMessage("Please login to manage featured events.");
      setLoading(false);
      return;
    }

    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);

    if (!isAdminRole(nextRole)) {
      setMessage(`Admin access required. Current role: ${nextRole}`);
      setLoading(false);
      return;
    }

    await loadEvents();
    setMessage("");
    setLoading(false);
  }

  async function updateFeatured(id: string, featured: boolean, featuredOrder = 0) {
    setMessage("Updating featured event...");
    const { error } = await supabase
      .from("events")
      .update({ featured, featured_order: Number(featuredOrder || 0) })
      .eq("id", id);

    if (error) {
      setMessage(`Featured update failed: ${error.message}`);
      return;
    }

    setMessage(featured ? "Event added to homepage featured section." : "Event removed from homepage featured section.");
    await loadEvents();
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p className="text-pink-300 font-black uppercase tracking-wide">Studio Marketing</p>
            <h1 className="text-4xl md:text-5xl font-black mt-3">Featured Events</h1>
            <p className="text-slate-300 mt-2">Promote approved events on the homepage featured event strip.</p>
            {user?.email && <p className="text-slate-400 text-sm mt-2">{user.email} · {role}</p>}
          </div>
          <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
        </div>

        {message && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold mb-6">{message}</div>}
        {loading && <div className="bg-white/10 rounded-2xl p-6">Loading...</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}

        {!loading && canAccess && (
          <div className="bg-white text-slate-950 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-2xl font-black">Approved Events</h2>
              <p className="text-sm text-gray-500">{events.filter((event) => event.featured).length} featured of {events.length} approved events</p>
            </div>

            <div className="grid gap-4">
              {events.map((event) => {
                const image = firstImage(event);
                return (
                  <article key={event.id} className="border rounded-xl p-4 grid md:grid-cols-[112px_1fr_auto] gap-4 items-center">
                    {image ? <img src={image} alt={event.title} className="w-28 h-28 rounded-xl object-cover bg-gray-100 border" /> : <div className="w-28 h-28 rounded-xl bg-pink-50 grid place-items-center text-pink-600 font-black text-xs text-center px-2">No image</div>}
                    <div>
                      <h3 className="text-xl font-black">{event.title}</h3>
                      <p className="text-sm text-gray-600">{formatDate(event.date)} · {event.location || "Location TBD"}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">Approved</span>
                        {event.featured && <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">Homepage Featured</span>}
                      </div>
                      {event.featured && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs font-bold">Display Order</span>
                          <input type="number" min="0" defaultValue={event.featured_order || 0} onBlur={(e) => updateFeatured(event.id, true, Number(e.target.value || 0))} className="border rounded px-2 py-1 w-24" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {event.featured ? <button onClick={() => updateFeatured(event.id, false, event.featured_order || 0)} className="bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm">Remove Featured</button> : <button onClick={() => updateFeatured(event.id, true, event.featured_order || 0)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Feature Event</button>}
                      <a href={`/studio/events/${event.id}`} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm">Edit Event</a>
                      <a href={`/events/${event.id}`} className="border px-4 py-2 rounded-lg font-bold text-sm">Public Page</a>
                    </div>
                  </article>
                );
              })}
              {events.length === 0 && <p className="text-gray-500">No approved events found.</p>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

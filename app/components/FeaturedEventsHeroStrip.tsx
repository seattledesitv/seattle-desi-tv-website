"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type FeaturedEvent = {
  id: string;
  title: string;
  date?: string | null;
  location?: string | null;
  image?: string | null;
  image_urls?: string[] | null;
  ticket_url?: string | null;
  featured_order?: number | null;
};

function firstImage(row: FeaturedEvent) {
  if (Array.isArray(row.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row.image || "/hero-sdtv.png";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function FeaturedEventsHeroStrip() {
  const [events, setEvents] = useState<FeaturedEvent[]>([]);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("events")
        .select("id,title,date,location,image,image_urls,ticket_url,featured_order")
        .eq("status", "approved")
        .eq("featured", true)
        .gte("date", today)
        .order("featured_order", { ascending: true })
        .order("date", { ascending: true })
        .limit(3);
      if (!error) setEvents(data || []);
    }
    load();
  }, []);

  if (events.length === 0) return null;

  return (
    <section className="bg-slate-950 text-white border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-pink-300 font-black uppercase tracking-wide">Featured Event Hero</p>
            <h2 className="text-2xl md:text-3xl font-black">Promoted Events</h2>
          </div>
          <a href="/events" className="text-pink-300 font-black">View Events →</a>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {events.map((event) => (
            <a key={event.id} href={event.ticket_url || `/events/${event.id}`} target={event.ticket_url ? "_blank" : undefined} rel={event.ticket_url ? "noreferrer" : undefined} className="bg-white/10 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/15 transition block">
              <img src={firstImage(event)} alt={event.title} className="w-full h-44 object-cover" />
              <div className="p-5">
                <p className="text-pink-300 text-xs font-black uppercase tracking-wide">Homepage Hero Event</p>
                <h3 className="text-xl font-black mt-2">{event.title}</h3>
                <p className="text-slate-300 text-sm mt-2">{formatDate(event.date)} · {event.location || "Location TBD"}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

type EventRow = {
  id: string;
  title: string;
  date: string;
  location: string;
  description?: string | null;
  image?: string | null;
  image_urls?: string[] | null;
  ticket_url?: string | null;
  status?: string | null;
};

function getImages(event: EventRow) {
  if (Array.isArray(event.image_urls) && event.image_urls.length > 0) return event.image_urls;
  return event.image ? [event.image] : [];
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [message, setMessage] = useState("Loading approved events...");

  async function loadEvents() {
    setMessage("Loading approved events...");

    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,location,description,image,image_urls,ticket_url,status,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Events load error", error);
      setEvents([]);
      setMessage(`Could not load events: ${error.message}`);
      return;
    }

    setEvents(data || []);
    setMessage((data || []).length ? `Showing ${(data || []).length} approved event(s).` : "No approved events found.");
  }

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <main className="min-h-screen bg-white text-[#081024] px-6 md:px-14 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <a href="/" className="text-sm font-bold text-pink-600">← Back to Seattle Desi TV</a>
            <h1 className="text-4xl md:text-5xl font-black mt-3">Community Events</h1>
            <p className="text-gray-500 mt-2">Approved Seattle Desi TV community events.</p>
            <p className="text-sm text-gray-500 mt-2">{message}</p>
          </div>

          <button
            type="button"
            onClick={loadEvents}
            className="border border-pink-600 text-pink-600 px-5 py-3 rounded-xl font-bold bg-white"
          >
            Refresh Events
          </button>
        </div>

        {events.length === 0 ? (
          <div className="border rounded-2xl p-8 text-gray-500 bg-gray-50">{message}</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {events.map((event) => {
              const images = getImages(event);
              const d = event.date ? new Date(`${String(event.date).split("T")[0]}T00:00:00`) : null;

              return (
                <article key={event.id} className="border rounded-2xl overflow-hidden shadow-sm bg-white">
                  {images.length > 0 ? (
                    <img src={images[0]} alt={event.title} className="w-full h-56 object-cover bg-gray-100" />
                  ) : (
                    <div className="w-full h-56 bg-pink-50 grid place-items-center text-pink-600 font-black">
                      Seattle Desi TV
                    </div>
                  )}

                  <div className="p-5">
                    <h2 className="text-xl font-black">{event.title}</h2>
                    <p className="text-gray-500 mt-1">
                      {d ? d.toLocaleDateString() : event.date} · {event.location}
                    </p>
                    {event.description && <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">{event.description}</p>}

                    <div className="flex flex-wrap gap-3 mt-5">
                      {event.ticket_url && (
                        <a href={event.ticket_url} target="_blank" rel="noreferrer" className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
                          Tickets / Register
                        </a>
                      )}
                      {event.location && (
                        <a href={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}`} target="_blank" rel="noreferrer" className="border px-4 py-2 rounded-lg font-bold text-sm">
                          Map
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const EVENT_BUCKET = "event-images";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
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

function formatError(error: any) {
  if (!error) return "Unknown error.";
  const parts = [error.message, error.details, error.hint, error.code].filter(Boolean);
  return parts.join(" | ") || String(error);
}

async function uploadFileToBucket(file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(EVENT_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(EVENT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [message, setMessage] = useState("Loading approved events...");
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [submitMessage, setSubmitMessage] = useState("");
  const [saving, setSaving] = useState(false);

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
      setMessage(`Could not load events: ${formatError(error)}`);
      return;
    }

    setEvents(data || []);
    setMessage((data || []).length ? `Showing ${(data || []).length} approved event(s).` : "No approved events found.");
  }

  async function signIn() {
    setAuthMessage("");
    if (!email || !password) {
      setAuthMessage("Please enter email and password.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthMessage(formatError(error));
      return;
    }

    setUser(data.user || null);
    setPassword("");
    setAuthMessage("Logged in successfully.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setAuthMessage("Logged out.");
  }

  async function submitEvent() {
    setSubmitMessage("");

    if (!user?.id) {
      setSubmitMessage("Please login before submitting an event.");
      return;
    }

    if (!title || !date || !location) {
      setSubmitMessage("Please enter event title, date, and location.");
      return;
    }

    setSaving(true);

    try {
      const eventPayload = {
        title,
        date,
        location,
        description: description || null,
        ticket_url: ticketUrl || null,
        poc_email: pocEmail || user.email || null,
        poc_phone: pocPhone || null,
        created_by: user.id,
        status: "pending",
      };

      const { data: insertedEvent, error: insertError } = await supabase
        .from("events")
        .insert(eventPayload)
        .select("id")
        .single();

      if (insertError) throw insertError;

      let imageMessage = "";

      if (imageFiles.length > 0 && insertedEvent?.id) {
        try {
          const imageUrl = await uploadFileToBucket(imageFiles[0]);
          const { error: updateError } = await supabase
            .from("events")
            .update({ image: imageUrl })
            .eq("id", insertedEvent.id);

          if (updateError) {
            imageMessage = ` Event was saved, but image link update failed: ${formatError(updateError)}`;
          }
        } catch (uploadError: any) {
          imageMessage = ` Event was saved, but image upload failed: ${formatError(uploadError)}`;
        }
      }

      setTitle("");
      setDate("");
      setLocation("");
      setDescription("");
      setTicketUrl("");
      setPocEmail("");
      setPocPhone("");
      setImageFiles([]);
      setSubmitMessage(`Event submitted successfully. It will appear after admin approval.${imageMessage}`);
      await loadEvents();
    } catch (error: any) {
      console.error("Event submit error", error);
      setSubmitMessage(`Could not submit event: ${formatError(error)}`);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setAuthChecked(true);
      await loadEvents();
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-white text-[#081024] px-6 md:px-14 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <a href="/" className="text-sm font-bold text-pink-600">← Back to Seattle Desi TV</a>
            <h1 className="text-4xl md:text-5xl font-black mt-3">Community Events</h1>
            <p className="text-gray-500 mt-2">Browse approved community events or login to submit a new one.</p>
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

        <section className="grid lg:grid-cols-[420px_1fr] gap-8 items-start">
          <aside className="border rounded-2xl p-6 shadow-sm bg-white">
            {!authChecked ? (
              <p className="text-gray-500">Checking login...</p>
            ) : user ? (
              <div>
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 mb-5 text-sm">
                  Logged in as <b>{user.email}</b>
                  <button type="button" onClick={signOut} className="block mt-2 text-red-600 font-bold">Logout</button>
                </div>

                <h2 className="text-2xl font-black mb-4">Add New Event</h2>
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
                <textarea className="w-full border rounded-lg p-3 mb-3 min-h-28" placeholder="Event description" value={description} onChange={(e) => setDescription(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Ticket / registration URL" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="POC email (internal)" type="email" value={pocEmail} onChange={(e) => setPocEmail(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="POC phone (internal)" value={pocPhone} onChange={(e) => setPocPhone(e.target.value)} />
                <label className="block text-sm font-bold mb-2">Upload event image / poster</label>
                <input className="w-full border rounded-lg p-3 mb-3" type="file" accept="image/*" onChange={(e) => setImageFiles(Array.from(e.target.files || []))} />
                {imageFiles.length > 0 && <p className="text-xs text-gray-500 mb-3">Selected {imageFiles.length} image(s). Only the first image is uploaded in this safe mode.</p>}
                {submitMessage && <p className="text-sm text-orange-600 mb-3 whitespace-pre-line">{submitMessage}</p>}
                <button type="button" onClick={submitEvent} disabled={saving} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full disabled:opacity-60">
                  {saving ? "Saving Event..." : "Submit Event for Approval"}
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-black mb-3">Login to Add Event</h2>
                <p className="text-sm text-gray-500 mb-4">You can browse events without login. Login is only required to submit a new event.</p>
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {authMessage && <p className="text-sm text-orange-600 mb-3 whitespace-pre-line">{authMessage}</p>}
                <button type="button" onClick={signIn} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full">Login</button>
              </div>
            )}
          </aside>

          <section>
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
          </section>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function statusText(value?: string | null) {
  const text = String(value || "pending").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dateInput(value?: string | null) {
  return String(value || "").split("T")[0];
}

export default function MyEventsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading your events...");
  const [rows, setRows] = useState<any[]>([]);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState<any>({});

  async function loadRows() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user?.id) {
      setRows([]);
      setMessage("Please login to view events submitted from your profile.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,location,description,ticket_url,poc_email,poc_phone,status,created_at,created_by")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setRows(data || []);
    setMessage(error ? error.message : "Events submitted from your profile.");
    setLoading(false);
  }

  function startEdit(row: any) {
    setEditingId(row.id);
    setEditForm({
      title: row.title || "",
      date: dateInput(row.date),
      location: row.location || "",
      description: row.description || "",
      ticket_url: row.ticket_url || "",
      poc_email: row.poc_email || "",
      poc_phone: row.poc_phone || "",
    });
  }

  async function saveEvent(row: any) {
    setMessage("");
    if (!editForm.title?.trim() || !editForm.date || !editForm.location?.trim()) {
      setMessage("Please enter event title, date, and location.");
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user?.id || row.created_by !== user.id) {
      setSaving(false);
      setMessage("You can only edit events submitted from your own profile.");
      return;
    }
    const payload = {
      title: editForm.title.trim(),
      date: editForm.date,
      location: editForm.location.trim(),
      description: editForm.description?.trim() || null,
      ticket_url: editForm.ticket_url?.trim() || null,
      poc_email: editForm.poc_email?.trim() || null,
      poc_phone: editForm.poc_phone?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("events").update(payload).eq("id", row.id).eq("created_by", user.id);
    setSaving(false);
    if (error) {
      setMessage(`Could not update event: ${error.message}`);
      return;
    }
    setEditingId("");
    setEditForm({});
    setMessage("Event updated. If the event is already approved, SDTV admins may review changes if needed.");
    await loadRows();
  }

  useEffect(() => { loadRows(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p>
            <h1 className="text-4xl md:text-5xl font-black mt-2">My Events</h1>
            <p className="text-slate-300 mt-2">{loading ? "Loading..." : message}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/my-events-v2" className="border border-white/20 text-white px-5 py-3 rounded-xl font-black text-center">Open Event Portal</a>
            <a href="/events/new" className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black text-center">Submit Event</a>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="bg-white text-slate-950 rounded-3xl p-8 border"><h2 className="text-2xl font-black">No events found</h2><p className="text-gray-600 mt-2">Your submitted events will appear here.</p></div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {rows.map((row) => (
              <article key={row.id} className="bg-white text-slate-950 rounded-3xl p-6 border shadow-xl">
                <div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-black">{row.title}</h2><span className="bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap">{statusText(row.status)}</span></div>
                <p className="text-gray-600 mt-3">{formatDate(row.date)}{row.location ? ` · ${row.location}` : ""}</p>
                {editingId === row.id ? <div className="mt-5 grid gap-3">
                  <input className="rounded-xl border p-3" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Event title" />
                  <input className="rounded-xl border p-3" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                  <input className="rounded-xl border p-3" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="Location" />
                  <textarea className="min-h-24 rounded-xl border p-3" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" />
                  <input className="rounded-xl border p-3" value={editForm.ticket_url} onChange={(e) => setEditForm({ ...editForm, ticket_url: e.target.value })} placeholder="Ticket / registration URL" />
                  <input className="rounded-xl border p-3" value={editForm.poc_email} onChange={(e) => setEditForm({ ...editForm, poc_email: e.target.value })} placeholder="Organizer email" />
                  <input className="rounded-xl border p-3" value={editForm.poc_phone} onChange={(e) => setEditForm({ ...editForm, poc_phone: e.target.value })} placeholder="Organizer phone" />
                  <div className="flex gap-2"><button onClick={() => saveEvent(row)} disabled={saving} className="flex-1 rounded-xl bg-pink-600 px-4 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button><button onClick={() => { setEditingId(""); setEditForm({}); }} className="rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700">Cancel</button></div>
                </div> : <div className="mt-5 flex flex-wrap gap-2"><a href={`/events/${row.id}`} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">View</a><button onClick={() => startEdit(row)} className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white">Edit</button></div>}
              </article>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

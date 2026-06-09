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

export default function MyEventsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading your events...");
  const [rows, setRows] = useState<any[]>([]);

  async function loadRows() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user?.id) {
      setRows([]);
      setMessage("Please login to view events submitted from your account.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,location,status,created_at")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setRows(data || []);
    setMessage(error ? error.message : "Events submitted from your account.");
    setLoading(false);
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
          <a href="/events/new" className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black text-center">Submit Event</a>
        </div>

        {rows.length === 0 ? (
          <div className="bg-white text-slate-950 rounded-3xl p-8 border"><h2 className="text-2xl font-black">No events found</h2><p className="text-gray-600 mt-2">Your submitted events will appear here.</p></div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {rows.map((row) => (
              <a key={row.id} href={`/events/${row.id}`} className="bg-white text-slate-950 rounded-3xl p-6 border shadow-xl block hover:scale-[1.01] transition">
                <div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-black">{row.title}</h2><span className="bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap">{statusText(row.status)}</span></div>
                <p className="text-gray-600 mt-3">{formatDate(row.date)}{row.location ? ` · ${row.location}` : ""}</p>
              </a>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

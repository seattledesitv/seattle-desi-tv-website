"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

function statusText(value?: string | null) {
  const text = String(value || "pending").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function MyCoveragePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    async function loadRows() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      const email = user?.email || "";
      if (!user?.id && !email) { setMessage("Please login to view your coverage requests."); return; }
      const { data, error } = await supabase.from("event_crew_assignments").select("id,event_id,event_title,assignment_type,status,created_at").or(`user_id.eq.${user?.id},user_email.eq.${email}`).order("created_at", { ascending: false });
      setRows(data || []);
      setMessage(error ? error.message : "Coverage and crew requests tied to you.");
    }
    loadRows();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8"><p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p><h1 className="text-4xl md:text-5xl font-black mt-2">My Coverage</h1><p className="text-slate-300 mt-2">{message}</p></div>
        {rows.length === 0 ? <div className="bg-white text-slate-950 rounded-3xl p-8">No coverage requests found.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{rows.map((row) => <a key={row.id} href={row.event_id ? `/events/${row.event_id}` : "/my-hub"} className="bg-white text-slate-950 rounded-3xl p-6 block"><h2 className="text-2xl font-black">{row.event_title || "Coverage Request"}</h2><p className="text-pink-600 font-black mt-2">{statusText(row.status)}</p><p className="text-gray-600 mt-2">{String(row.assignment_type || "coverage").replaceAll("_", " ")}</p></a>)}</div>}
      </section>
      <SiteFooter />
    </main>
  );
}

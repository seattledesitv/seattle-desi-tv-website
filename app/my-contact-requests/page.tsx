"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function MyContactRequestsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    async function loadRows() {
      const { data: auth } = await supabase.auth.getUser();
      const email = auth?.user?.email || "";
      if (!email) { setMessage("Please login to view contact requests submitted with your email."); return; }
      const { data, error } = await supabase.from("contact_requests").select("id,name,email,interest,message,created_at").ilike("email", email).order("created_at", { ascending: false });
      setRows(data || []);
      setMessage(error ? error.message : "Contact requests submitted with your email.");
    }
    loadRows();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8"><p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p><h1 className="text-4xl md:text-5xl font-black mt-2">My Contact Requests</h1><p className="text-slate-300 mt-2">{message}</p></div>
        {rows.length === 0 ? <div className="bg-white text-slate-950 rounded-3xl p-8">No contact requests found.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{rows.map((row) => <article key={row.id} className="bg-white text-slate-950 rounded-3xl p-6"><h2 className="text-2xl font-black">{row.interest || "Contact Request"}</h2><p className="text-gray-600 mt-2">{row.name || row.email}</p>{row.message && <p className="text-gray-700 mt-3 line-clamp-4">{row.message}</p>}</article>)}</div>}
      </section>
      <SiteFooter />
    </main>
  );
}

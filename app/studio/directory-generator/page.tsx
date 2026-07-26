"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

type Kind = "businesses" | "organizations";

export default function DirectoryGeneratorPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("Checking access...");
  const [kind, setKind] = useState<Kind>("businesses");
  const [count, setCount] = useState(25);
  const [location, setLocation] = useState("Seattle metropolitan area, Washington");
  const [categories, setCategories] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user || null;
      if (!user) { setMessage("Please login to access the directory generator."); setLoading(false); return; }
      const role = await resolveUserRole(supabase, user);
      if (!isAdminRole(role)) { setMessage("Admin access required."); setLoading(false); return; }
      setAllowed(true); setMessage(""); setLoading(false);
    })();
  }, []);

  async function generate() {
    setRunning(true); setResult(null); setMessage(`Generating ${count} ${kind} as draft research candidates...`);
    const session = await supabase.auth.getSession();
    const response = await fetch("/api/studio/directory-generation", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session.data.session?.access_token || ""}` },
      body: JSON.stringify({ kind, count, location, categories: categories.split(",").map((v) => v.trim()).filter(Boolean) }),
    });
    const json = await response.json().catch(() => ({}));
    setRunning(false);
    if (!response.ok) { setMessage(json.error || "Generation failed."); return; }
    setResult(json);
    setMessage(`Created ${json.inserted || 0} new draft ${kind}. ${json.skippedDuplicates || 0} duplicate candidates were skipped.`);
  }

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><section className="mx-auto max-w-5xl px-6 py-10">
    <a href="/studio" className="font-black text-pink-300">← Back to Studio</a>
    <h1 className="mt-3 text-4xl font-black md:text-5xl">Directory Batch Generator</h1>
    <p className="mt-3 max-w-3xl text-slate-300">Generate the next batch of businesses or community organizations as pending research records. Duplicate names are skipped and nothing is published automatically.</p>
    {loading && <div className="mt-8 rounded-3xl bg-white/10 p-6">{message}</div>}
    {!loading && !allowed && <div className="mt-8 rounded-3xl bg-white p-6 font-bold text-slate-950">{message}</div>}
    {!loading && allowed && <div className="mt-8 space-y-6">
      {message && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}
      <section className="rounded-3xl bg-white p-6 text-slate-950">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 font-black">Directory type<select value={kind} onChange={(e)=>setKind(e.target.value as Kind)} className="rounded-xl border p-3 font-normal"><option value="businesses">Businesses</option><option value="organizations">Organizations</option></select></label>
          <label className="grid gap-2 font-black">How many?<select value={count} onChange={(e)=>setCount(Number(e.target.value))} className="rounded-xl border p-3 font-normal"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>
          <label className="grid gap-2 font-black md:col-span-2">Location<input value={location} onChange={(e)=>setLocation(e.target.value)} className="rounded-xl border p-3 font-normal"/></label>
          <label className="grid gap-2 font-black md:col-span-2">Optional categories <span className="text-xs font-normal text-slate-500">Comma separated</span><input value={categories} onChange={(e)=>setCategories(e.target.value)} placeholder={kind === "businesses" ? "Restaurants, health, legal, finance, real estate" : "Cultural, youth, religious, sports, education"} className="rounded-xl border p-3 font-normal"/></label>
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-black">Safety controls</p><p className="mt-1">Generated entries remain pending. Websites may be blank when the model is not confident. Review the name, website, description and image before approval.</p></div>
        <button onClick={generate} disabled={running || !location.trim()} className="mt-6 rounded-xl bg-pink-600 px-6 py-3 font-black text-white disabled:opacity-50">{running ? `Generating ${kind}...` : `Generate Next ${count} ${kind === "businesses" ? "Businesses" : "Organizations"}`}</button>
      </section>
      {result && <section className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Generation complete</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">Generated</p><p className="text-3xl font-black">{result.generated || 0}</p></div><div className="rounded-2xl bg-green-50 p-4"><p className="text-sm font-bold text-slate-500">Inserted</p><p className="text-3xl font-black">{result.inserted || 0}</p></div><div className="rounded-2xl bg-yellow-50 p-4"><p className="text-sm font-bold text-slate-500">Duplicates skipped</p><p className="text-3xl font-black">{result.skippedDuplicates || 0}</p></div></div><div className="mt-5 flex flex-wrap gap-3"><a href={kind === "businesses" ? "/studio/businesses?source=AI-assisted%20directory%20research" : "/studio/community-orgs"} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Review generated {kind}</a><button onClick={()=>setResult(null)} className="rounded-xl border px-5 py-3 font-black">Generate another batch</button></div></section>}
    </div>}
  </section></main>;
}

"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const labels: Record<string, string> = {
  businesses: "Businesses", organizations: "Organizations", events: "Events", volunteer: "Volunteering",
  sponsorship: "Sponsorship", about: "About SDTV", contact: "Contact", other: "Other",
  sensitive: "Sensitive requests", write_request: "Modification requests", answered: "Answered",
  contact_sdtv: "Referred to SDTV", refused_sensitive: "Sensitive request refused", refused_write: "Modification refused", no_match: "No matching result",
};

function displayLabel(value: string) { return labels[value] || value.replace(/_/g, " "); }
function dateTime(value: string) { return new Date(value).toLocaleString(); }

export default function AssistantAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextDays = days) {
    setLoading(true); setError("");
    try {
      const auth = await supabase.auth.getSession();
      const token = auth.data.session?.access_token;
      if (!token) throw new Error("Please log in with a Studio administrator account.");
      const response = await fetch(`/api/studio/assistant-analytics?days=${nextDays}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Could not load assistant analytics.");
      setData(result);
    } catch (nextError: any) { setError(nextError?.message || "Could not load assistant analytics."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(days); }, [days]);

  return <main className="min-h-screen bg-slate-950 text-white">
    <StudioHeader />
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="font-black uppercase tracking-wide text-pink-300">Website assistant</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Question Insights</h1><p className="mt-2 max-w-3xl text-slate-300">Learn what visitors need using anonymous, privacy-redacted questions from the public assistant.</p></div>
        <div className="flex gap-2"><label className="sr-only" htmlFor="assistant-range">Time range</label><select id="assistant-range" value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-xl bg-white px-4 py-3 font-black text-slate-950"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select><button onClick={() => void load()} className="rounded-xl border border-white/20 px-4 py-3 font-black">Refresh</button></div>
      </div>
      {loading && <div className="mt-8 rounded-2xl bg-white/10 p-6">Loading question insights…</div>}
      {error && <div className="mt-8 rounded-2xl bg-red-100 p-6 font-bold text-red-900">{error}</div>}
      {!loading && !error && data && <div className="mt-8 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl bg-white p-6 text-slate-950"><p className="text-4xl font-black">{data.total}</p><p className="mt-1 font-bold text-slate-600">Questions asked</p></article>
          <article className="rounded-3xl bg-white p-6 text-slate-950"><p className="text-4xl font-black">{data.contactReferrals}</p><p className="mt-1 font-bold text-slate-600">Referred to SDTV</p></article>
          <article className="rounded-3xl bg-white p-6 text-slate-950"><p className="text-4xl font-black">{data.sensitiveRefusals}</p><p className="mt-1 font-bold text-slate-600">Privacy refusals</p></article>
          <article className="rounded-3xl bg-white p-6 text-slate-950"><p className="text-4xl font-black">{data.writeRefusals}</p><p className="mt-1 font-bold text-slate-600">Modification refusals</p></article>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Topics visitors ask about</h2><div className="mt-5 space-y-3">{data.categories.map((item: any) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="font-bold capitalize">{displayLabel(item.label)}</span><span className="rounded-full bg-pink-100 px-3 py-1 font-black text-pink-700">{item.count}</span></div>)}{!data.categories.length && <p className="text-slate-500">No questions recorded in this period.</p>}</div></section>
          <section className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Response outcomes</h2><div className="mt-5 space-y-3">{data.outcomes.map((item: any) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="font-bold capitalize">{displayLabel(item.label)}</span><span className="rounded-full bg-slate-900 px-3 py-1 font-black text-white">{item.count}</span></div>)}</div></section>
        </div>
        <section className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Popular questions</h2><p className="mt-1 text-sm text-slate-600">Repeated questions reveal information visitors may need more prominently on the website.</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="px-3 py-3">Question</th><th className="px-3 py-3">Times asked</th><th className="px-3 py-3">Last asked</th></tr></thead><tbody>{data.popular.map((item: any) => <tr key={`${item.question}-${item.lastAskedAt}`} className="border-b border-slate-100"><td className="px-3 py-4 font-bold">{item.question}</td><td className="px-3 py-4">{item.count}</td><td className="px-3 py-4 text-sm text-slate-600">{dateTime(item.lastAskedAt)}</td></tr>)}</tbody></table>{!data.popular.length && <p className="py-6 text-slate-500">No questions recorded yet.</p>}</div></section>
        <section className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Recent questions</h2><div className="mt-5 grid gap-3">{data.recent.map((item: any) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase"><span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">{displayLabel(item.category)}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{displayLabel(item.outcome)}</span></div><p className="mt-3 font-bold">{item.question_redacted}</p><p className="mt-2 text-xs text-slate-500">{dateTime(item.created_at)} · {item.page_path}</p></article>)}{!data.recent.length && <p className="text-slate-500">No questions recorded yet.</p>}</div></section>
      </div>}
    </section>
  </main>;
}

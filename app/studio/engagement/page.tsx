"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";
import { useCurrentSite } from "../../lib/sites/SiteContext";

const supabase = getSupabaseBrowserClient();
const ranges = [7, 30, 90];
const emptyMetrics = { total: 0, views: 0, clicks: 0, counts: {} as Record<string, number>, trend: [] as [string, number][], top: [] as any[] };

function title(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function csvValue(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function EngagementAnalyticsPage() {
  const site = useCurrentSite();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading engagement analytics...");
  const [allowed, setAllowed] = useState(false);
  const [days, setDays] = useState(30);
  const [metrics, setMetrics] = useState(emptyMetrics);

  async function load(selectedDays = days) {
    setLoading(true);
    const since = new Date(Date.now() - selectedDays * 86400000).toISOString();
    const { data, error } = await supabase.rpc("get_engagement_analytics", { p_site_id: site.id || "", p_since: since });
    if (error) {
      setMetrics(emptyMetrics);
      setMessage(`Could not load engagement analytics: ${error.message}`);
    } else {
      const result: any = data || {};
      setMetrics({ total: Number(result.total || 0), views: Number(result.views || 0), clicks: Number(result.clicks || 0), counts: result.counts || {}, trend: result.trend || [], top: result.top || [] });
      setMessage("");
    }
    setLoading(false);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) { setMessage("Please log in as a Studio admin."); setLoading(false); return; }
    const role = await resolveUserRole(supabase, user);
    if (!isAdminRole(role)) { setMessage("Studio admin access is required."); setLoading(false); return; }
    setAllowed(true);
    await load(days);
  }

  useEffect(() => { void init(); }, []);

  function changeRange(value: number) {
    setDays(value);
    void load(value);
  }

  async function exportCsv() {
    setMessage("Preparing the complete CSV export...");
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const rows: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("engagement_events").select("entity_type,entity_id,entity_name,action_type,page_path,target_url,created_at").eq("site_id", site.id || "").gte("created_at", since).order("created_at", { ascending: false }).range(from, from + 999);
      if (error) { setMessage(`Could not export engagement data: ${error.message}`); return; }
      const page = data || []; rows.push(...page);
      if (page.length < 1000) break;
    }
    const header = ["Date", "Entity Type", "Entity ID", "Entity Name", "Action", "Page", "Target"];
    const lines = rows.map((row) => [row.created_at, row.entity_type, row.entity_id, row.entity_name, row.action_type, row.page_path, row.target_url].map(csvValue).join(","));
    const blob = new Blob([[header.map(csvValue).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${site.code}-engagement-${days}-days.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${rows.length.toLocaleString()} interactions.`);
  }

  const maxTrend = Math.max(1, ...metrics.trend.map(([, count]) => count));

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">{site.name} Analytics</p><h1 className="mt-2 text-4xl font-black">Engagement Statistics</h1><p className="mt-2 max-w-3xl text-slate-300">Views and meaningful clicks for businesses, organizations and events in {site.city}. Tracking is asynchronous and does not block navigation.</p></div><div className="flex flex-wrap gap-2">{ranges.map((range) => <button key={range} onClick={() => changeRange(range)} className={`rounded-xl px-4 py-3 font-black ${days === range ? "bg-pink-600" : "bg-white/10"}`}>{range} days</button>)}<button onClick={() => void exportCsv()} disabled={!metrics.total} className="rounded-xl bg-white px-4 py-3 font-black text-slate-950 disabled:opacity-40">Export CSV</button></div></div>
    {message && <div className="mt-6 rounded-2xl bg-white/10 p-4 font-bold">{message}</div>}
    {loading && <div className="mt-6 rounded-2xl bg-white/10 p-8">Loading...</div>}
    {!loading && !allowed && <div className="mt-6 rounded-2xl bg-white p-8 text-slate-950">Admin access required.</div>}
    {!loading && allowed && <div className="mt-7 space-y-7">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
        ["Total Interactions", metrics.total], ["Profile Views", metrics.views], ["Meaningful Clicks", metrics.clicks], ["Ticket / Registration", metrics.counts.ticket_click || 0],
        ["Website Clicks", metrics.counts.website_click || 0], ["WhatsApp Clicks", metrics.counts.whatsapp_click || 0], ["Phone + Email", (metrics.counts.phone_click || 0) + (metrics.counts.email_click || 0)], ["Directions", metrics.counts.directions_click || 0]
      ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-white p-5 text-slate-950 shadow-xl"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-4xl font-black text-pink-600">{value}</p></div>)}</section>

      <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl"><h2 className="text-2xl font-black">Daily Activity</h2><div className="mt-5 flex min-h-52 items-end gap-2 overflow-x-auto border-b border-slate-200 pb-2">{metrics.trend.map(([date, count]) => <div key={date} className="flex min-w-12 flex-1 flex-col items-center justify-end"><span className="mb-2 text-xs font-black">{count}</span><div className="w-full rounded-t-lg bg-pink-500" style={{ height: `${Math.max(8, (count / maxTrend) * 150)}px` }} /><span className="mt-2 text-[10px] font-bold text-slate-500">{date.slice(5)}</span></div>)}{metrics.trend.length === 0 && <p className="m-auto text-slate-500">No engagement has been recorded yet.</p>}</div></section>

      <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Top Content</p><h2 className="mt-1 text-2xl font-black">Most Engaged Listings</h2></div><button onClick={() => load(days)} className="rounded-xl bg-slate-100 px-4 py-3 font-black">Refresh</button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-3">Listing</th><th className="p-3">Type</th><th className="p-3 text-right">Views</th><th className="p-3 text-right">Clicks</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">CTR</th></tr></thead><tbody>{metrics.top.map((item) => <tr key={item.key} className="border-b last:border-0"><td className="p-3 font-black">{item.name}</td><td className="p-3"><span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-700">{title(item.type)}</span></td><td className="p-3 text-right font-bold">{item.views}</td><td className="p-3 text-right font-bold">{item.clicks}</td><td className="p-3 text-right font-black">{item.total}</td><td className="p-3 text-right font-bold">{item.views ? `${Math.round((item.clicks / item.views) * 100)}%` : "—"}</td></tr>)}{metrics.top.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No engagement data yet.</td></tr>}</tbody></table></div></section>

      <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl"><h2 className="text-2xl font-black">Actions</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(metrics.counts).sort(([, a], [, b]) => b - a).map(([action, count]) => <div key={action} className="rounded-2xl border bg-slate-50 p-4"><p className="text-sm font-black">{title(action)}</p><p className="mt-1 text-2xl font-black text-pink-600">{count}</p></div>)}</div></section>
    </div>}
  </section></main>;
}

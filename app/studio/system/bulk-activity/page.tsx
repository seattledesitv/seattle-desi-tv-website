"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";
import { useCurrentSite } from "../../../lib/sites/SiteContext";
import { forSite } from "../../../lib/sites/query";

const supabase = getSupabaseBrowserClient();

type Period = "24h" | "7d" | "30d";
type Activity = {
  visitorKey: string;
  firstSeen: string;
  lastSeen: string;
  activityCount: number;
  pageViews: number;
  mediaViews: number;
  distinctEvents: number;
  userAgent?: string | null;
  referrer?: string | null;
  severity: "low" | "medium" | "high";
  reason: string;
};
type EventRollup = {
  eventId: string;
  activityCount: number;
  pageViews: number;
  mediaViews: number;
  visitors: number;
};

const emptyReport = {
  flaggedCount: 0,
  highCount: 0,
  mediumCount: 0,
  sessions: [] as Activity[],
  topEvents: [] as EventRollup[],
};

function sinceFor(period: Period) {
  const hours = period === "24h" ? 24 : period === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}
function dateTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
function shortAgent(value?: string | null) {
  const agent = String(value || "").toLowerCase();
  if (!agent) return "Not reported";
  if (/bot|crawler|spider|curl|wget|python|scrapy|headless/.test(agent)) return "Possible automation";
  if (agent.includes("chrome")) return "Chrome";
  if (agent.includes("safari")) return "Safari";
  if (agent.includes("firefox")) return "Firefox";
  if (agent.includes("edge")) return "Edge";
  return "Other browser";
}
function host(value?: string | null) {
  if (!value) return "Direct / not reported";
  try { return new URL(value).hostname || "Direct / not reported"; }
  catch { return "Direct / not reported"; }
}

export default function EventBulkActivityPage() {
  const site = useCurrentSite();
  const [period, setPeriod] = useState<Period>("7d");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [report, setReport] = useState(emptyReport);
  const [eventNames, setEventNames] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setMessage("Loading event activity...");
    const session = await supabase.auth.getSession();
    const user = session.data.session?.user || null;
    if (!user) {
      setMessage("Please log in to view this Studio report.");
      setLoading(false);
      return;
    }
    const role = await resolveUserRole(supabase, user);
    if (!isAdminRole(role)) {
      setMessage("Studio administrator access is required.");
      setLoading(false);
      return;
    }
    if (!site.id) {
      setMessage("The active site could not be resolved.");
      setLoading(false);
      return;
    }

    const result = await supabase.rpc("get_event_bulk_activity", {
      p_site_id: site.id,
      p_since: sinceFor(period),
    });
    if (result.error) {
      setMessage(`Could not load activity: ${result.error.message}`);
      setLoading(false);
      return;
    }
    const next = { ...emptyReport, ...(result.data || {}) };
    setReport(next);
    const ids = Array.from(new Set((next.topEvents || []).map((item: EventRollup) => item.eventId).filter(Boolean)));
    if (ids.length) {
      const events = await forSite(supabase.from("events").select("id,title").in("id", ids), site.id);
      setEventNames(Object.fromEntries((events.data || []).map((event: any) => [event.id, event.title])));
    } else setEventNames({});
    setMessage("");
    setLoading(false);
  }

  useEffect(() => { load(); }, [site.id, period]);

  const totalSignals = useMemo(
    () => report.sessions.reduce((sum, item) => sum + Number(item.activityCount || 0), 0),
    [report.sessions],
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-pink-300">Studio · System</p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">Event Bulk Activity</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Awareness-only monitoring for unusual event page and flyer activity. This report never blocks, challenges, or slows a visitor.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["24h", "7d", "30d"] as Period[]).map((value) => (
              <button key={value} onClick={() => setPeriod(value)} className={`rounded-xl px-4 py-3 text-sm font-black ${period === value ? "bg-pink-600 text-white" : "bg-white/10 text-white"}`}>
                {value === "24h" ? "24 Hours" : value === "7d" ? "7 Days" : "30 Days"}
              </button>
            ))}
            <button onClick={load} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950">Refresh</button>
          </div>
        </div>

        {message && <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-5 font-bold">{message}</div>}

        {!loading && !message && <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl bg-white p-6 text-slate-950"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Flagged sessions</p><p className="mt-2 text-4xl font-black">{report.flaggedCount}</p></div>
            <div className="rounded-3xl bg-red-50 p-6 text-red-950"><p className="text-xs font-black uppercase tracking-wide text-red-600">High signal</p><p className="mt-2 text-4xl font-black">{report.highCount}</p></div>
            <div className="rounded-3xl bg-amber-50 p-6 text-amber-950"><p className="text-xs font-black uppercase tracking-wide text-amber-700">Medium signal</p><p className="mt-2 text-4xl font-black">{report.mediumCount}</p></div>
            <div className="rounded-3xl bg-pink-50 p-6 text-slate-950"><p className="text-xs font-black uppercase tracking-wide text-pink-600">Flagged interactions</p><p className="mt-2 text-4xl font-black">{totalSignals}</p></div>
          </div>

          <section className="mt-6 rounded-3xl bg-white p-6 text-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-2xl font-black">Possible bulk sessions</h2><p className="mt-1 text-sm text-slate-600">Signals are indicators only and do not prove that content was copied.</p></div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Monitor only · no blocking</span>
            </div>
            <div className="mt-5 overflow-x-auto">
              {report.sessions.length ? <table className="w-full min-w-[900px] text-left text-sm">
                <thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="p-3">Signal</th><th className="p-3">Activity</th><th className="p-3">Events</th><th className="p-3">Media</th><th className="p-3">Browser</th><th className="p-3">Referrer</th><th className="p-3">Last seen</th></tr></thead>
                <tbody>{report.sessions.map((item) => <tr key={`${item.visitorKey}-${item.lastSeen}`} className="border-b align-top last:border-0">
                  <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-black uppercase ${item.severity === "high" ? "bg-red-100 text-red-800" : item.severity === "medium" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>{item.severity}</span><p className="mt-2 max-w-48 font-bold">{item.reason}</p><p className="mt-1 font-mono text-xs text-slate-400">ID {item.visitorKey}</p></td>
                  <td className="p-3 font-black">{item.activityCount}<span className="block text-xs font-normal text-slate-500">{item.pageViews} page views</span></td>
                  <td className="p-3 font-black">{item.distinctEvents}</td>
                  <td className="p-3 font-black">{item.mediaViews}</td>
                  <td className="p-3">{shortAgent(item.userAgent)}</td>
                  <td className="p-3">{host(item.referrer)}</td>
                  <td className="p-3">{dateTime(item.lastSeen)}<span className="block text-xs text-slate-500">Started {dateTime(item.firstSeen)}</span></td>
                </tr>)}</tbody>
              </table> : <div className="rounded-2xl bg-emerald-50 p-6 text-emerald-900"><p className="font-black">No unusual event activity detected.</p><p className="mt-1 text-sm">Normal event visits continue to be counted in Engagement Statistics.</p></div>}
            </div>
          </section>

          <section className="mt-6 rounded-3xl bg-white p-6 text-slate-950">
            <h2 className="text-2xl font-black">Most active events</h2>
            <p className="mt-1 text-sm text-slate-600">This is context for investigation, not a list of violations.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {report.topEvents.map((item) => <a key={item.eventId} href={`/events/${item.eventId}`} className="rounded-2xl border p-4 transition hover:border-pink-300">
                <p className="font-black">{eventNames[item.eventId] || "Event"}</p>
                <p className="mt-1 text-sm text-slate-600">{item.activityCount} interactions · {item.pageViews} page views · {item.mediaViews} media actions · {item.visitors} visitors</p>
              </a>)}
              {!report.topEvents.length && <p className="text-sm font-bold text-slate-500">No event activity has been recorded in this period.</p>}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-300">
            <p className="font-black text-white">How detection works</p>
            <p className="mt-2">A session is highlighted when it rapidly views at least 8 different events, performs at least 10 event-media actions, or generates at least 25 event interactions. The visitor identifier is one-way hashed and rotates daily; raw IP addresses are not stored. Search crawlers that do not execute the website tracker may appear only in Vercel traffic logs.</p>
          </section>
        </>}
      </section>
    </main>
  );
}

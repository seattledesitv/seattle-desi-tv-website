"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import StudioHeader from "../../../../components/StudioHeader";
import DiscoveryResultPanel from "../../../../components/publishing/DiscoveryResultPanel";
import { getSupabaseBrowserClient } from "../../../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../../../lib/roles";
import { getPublication } from "../../../../lib/publishing/repository";
import { discoverPublicationContent } from "../../../../lib/publishing/services/discoveryService";
import { listPublicationSections, saveDiscoverySnapshot } from "../../../../lib/publishing/repositories/contentRepository";
import type { DiscoveryResult, DiscoverySummary, PublishingContentItem } from "../../../../lib/publishing/core/content";
import type { PublicationRecord } from "../../../../lib/publishing/types";
import { useCurrentSite } from "../../../../lib/sites/SiteContext";

const supabase = getSupabaseBrowserClient();
const keyFor = (item: PublishingContentItem) => `${item.sourceType}:${item.sourceId}`;

export default function PublicationContentPage() {
  const site = useCurrentSite();
  const params = useParams<{ publicationId: string }>();
  const publicationId = String(params.publicationId || "");
  const [publication, setPublication] = useState<PublicationRecord | null>(null);
  const [summary, setSummary] = useState<DiscoverySummary | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function init() {
      setLoading(true); setMessage("");
      try {
        const session = await supabase.auth.getSession();
        const user = session.data.session?.user;
        if (!user) throw new Error("Please log in to access the Publishing Platform.");
        const role = await resolveUserRole(supabase, user);
        if (!isAdminRole(role)) throw new Error("This account does not have Studio admin access.");
        if (!site.id) throw new Error("The current site is not configured.");
        setPublication(await getPublication(supabase, publicationId, site.id));
      } catch (error: any) { setMessage(error.message || "Could not load publication."); }
      finally { setLoading(false); }
    }
    if (publicationId) init();
  }, [publicationId, site.id]);

  async function discover() {
    if (!publication) return;
    setDiscovering(true); setMessage("");
    try {
      const next = await discoverPublicationContent(supabase, { startDate: publication.start_date, endDate: publication.end_date }, publication.site_id, site.name);
      setSummary(next);
      setSelected(new Set(next.results.flatMap((result) => result.items.map(keyFor))));
      if (next.errors.length) setMessage(`Discovery completed with warnings: ${next.errors.join(" | ")}`);
    } catch (error: any) { setMessage(error.message || "Content discovery failed."); }
    finally { setDiscovering(false); }
  }

  async function saveSnapshot() {
    if (!publication || !summary) return;
    setSaving(true); setMessage("");
    try {
      const sections = await listPublicationSections(supabase, publication.id);
      const selectedResults: DiscoveryResult[] = summary.results.map((result) => ({ ...result, items: result.items.filter((item) => selected.has(keyFor(item))) }));
      const count = await saveDiscoverySnapshot(supabase, sections, selectedResults);
      setMessage(`${count} selected items saved to the publication snapshot.`);
    } catch (error: any) { setMessage(error.message || "Could not save selected content."); }
    finally { setSaving(false); }
  }

  const filtered = useMemo(() => {
    if (!summary) return [];
    const query = search.trim().toLowerCase();
    if (!query) return summary.results;
    return summary.results.map((result) => ({ ...result, items: result.items.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(query)) }));
  }, [summary, search]);

  function toggle(item: PublishingContentItem) {
    setSelected((current) => { const next = new Set(current); const key = keyFor(item); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  function selectAll(result: DiscoveryResult) { setSelected((current) => new Set([...current, ...result.items.map(keyFor)])); }
  function clear(result: DiscoveryResult) { const keys = new Set(result.items.map(keyFor)); setSelected((current) => new Set([...current].filter((key) => !keys.has(key)))); }

  return <main className="min-h-screen bg-slate-100 text-slate-950"><StudioHeader /><div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
    <a href="/studio/publishing" className="text-sm font-black text-pink-600">← Publications</a>
    {loading ? <div className="mt-6 rounded-3xl bg-white p-8 font-bold">Loading publication...</div> : !publication ? <div className="mt-6 rounded-3xl bg-white p-8 text-red-700">{message || "Publication not found."}</div> : <>
      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.2em] text-pink-600">Content workspace</p><h1 className="mt-2 text-4xl font-black">{publication.name}</h1><p className="mt-2 text-slate-600">Discover approved source content, choose what belongs in this edition, then save an independent snapshot.</p><p className="mt-2 text-sm font-bold text-slate-400">{publication.start_date || "No start date"} → {publication.end_date || "No end date"}</p></div><div className="flex flex-wrap gap-3"><button disabled={discovering} onClick={discover} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50">{discovering ? "Discovering..." : summary ? "Refresh Discovery" : "Discover Content"}</button><button disabled={!summary || saving} onClick={saveSnapshot} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-50">{saving ? "Saving..." : `Save ${selected.size} Selected`}</button></div></div>
      {message && <div className="mt-6 rounded-2xl bg-yellow-50 p-4 font-bold text-yellow-900">{message}</div>}
      {summary && <div className="mt-6"><div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{summary.total} items discovered · {selected.size} selected</p><p className="text-sm text-slate-500">Refresh does not overwrite manual publication-item edits.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search discovered content" className="rounded-xl border border-slate-200 px-4 py-3 sm:w-80" /></div><div className="grid gap-6">{filtered.map((result) => <DiscoveryResultPanel key={result.sourceType} result={result} selected={selected} onToggle={toggle} onSelectAll={selectAll} onClear={clear} />)}</div></div>}
      {!summary && <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-2xl font-black">No discovery run yet</h2><p className="mt-2 text-slate-600">Start with Events, Businesses, Organizations and Community Groups. Each source is isolated behind its own adapter.</p></div>}
    </>}
  </div></main>;
}

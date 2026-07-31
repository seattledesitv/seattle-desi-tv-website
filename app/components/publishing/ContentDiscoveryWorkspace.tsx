"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { usePublicationDiscovery } from "../../hooks/usePublicationDiscovery";
import type { PublicationRecord } from "../../lib/publishing/types";
import DiscoveryResultPanel from "./DiscoveryResultPanel";

export default function ContentDiscoveryWorkspace({ supabase, publication }: { supabase: SupabaseClient; publication: PublicationRecord }) {
  const discovery = usePublicationDiscovery(supabase, publication);
  return <div className="grid gap-5">
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div><h2 className="text-2xl font-black">Discover content</h2><p className="mt-1 text-sm text-slate-600">Find approved SDTV content for this edition, choose what belongs, and add it to the publication.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={discovery.discovering} onClick={() => void discovery.discover()} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50">{discovery.discovering ? "Discovering…" : discovery.summary ? "Refresh discovery" : "Discover content"}</button><button type="button" disabled={!discovery.summary || discovery.saving} onClick={() => void discovery.save()} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-50">{discovery.saving ? "Adding…" : `Add ${discovery.selected.size} selected`}</button></div>
    </div>
    {discovery.message && <div className="rounded-2xl bg-yellow-50 p-4 font-bold text-yellow-900">{discovery.message}</div>}
    {discovery.summary ? <><div className="flex flex-col gap-3 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><p className="font-black">{discovery.summary.total} found · {discovery.selected.size} selected</p><input value={discovery.search} onChange={(event) => discovery.setSearch(event.target.value)} placeholder="Search discovered content" className="rounded-xl border border-slate-200 px-4 py-3 sm:w-80" /></div><div className="grid gap-5">{discovery.filtered.map((result) => <DiscoveryResultPanel key={result.sourceType} result={result} selected={discovery.selected} onToggle={discovery.toggle} onSelectAll={discovery.selectAll} onClear={discovery.clear} />)}</div></> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Run discovery to collect the homepage hero, highlights, events, directories, recognition, videos, live statistics, and Get Involved actions.</div>}
  </div>;
}

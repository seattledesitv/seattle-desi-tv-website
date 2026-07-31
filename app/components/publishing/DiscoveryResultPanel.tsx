"use client";

import type { DiscoveryResult, PublishingContentItem } from "../../lib/publishing/core/content";

type Props = {
  result: DiscoveryResult;
  selected: Set<string>;
  onToggle: (item: PublishingContentItem) => void;
  onSelectAll: (result: DiscoveryResult) => void;
  onClear: (result: DiscoveryResult) => void;
};

function keyFor(item: PublishingContentItem) { return `${item.sourceType}:${item.sourceId}`; }

export default function DiscoveryResultPanel({ result, selected, onToggle, onSelectAll, onClear }: Props) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-2xl font-black">{result.label}</h2><p className="text-sm text-slate-500">{result.items.length} discovered</p></div>
      <div className="flex gap-2"><button onClick={() => onSelectAll(result)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-black">Select All</button><button onClick={() => onClear(result)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-black">Clear</button></div>
    </div>
    {result.error && <p className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm font-bold text-yellow-800">{result.error}</p>}
    {!result.items.length ? <p className="py-8 text-center text-slate-500">No matching content found.</p> : <div className="mt-4 grid gap-3">
      {result.items.map((item) => { const checked = selected.has(keyFor(item)); return <label key={keyFor(item)} className={`flex cursor-pointer gap-4 rounded-2xl border p-4 ${checked ? "border-pink-300 bg-pink-50" : "border-slate-200"}`}>
        <input type="checkbox" checked={checked} onChange={() => onToggle(item)} className="mt-1 h-5 w-5" />
        {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-400">NO IMAGE</div>}
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{item.title}</h3>{item.featured && <span className="rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-black text-yellow-800">FEATURED</span>}</div><p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.description || "No description available."}</p>{item.sourceDate && <p className="mt-2 text-xs font-bold text-slate-400">{new Date(item.sourceDate).toLocaleDateString()}</p>}</div>
      </label>; })}
    </div>}
  </section>;
}

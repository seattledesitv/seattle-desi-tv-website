"use client";

import type { PublicationItemRecord } from "../../../lib/publishing/repositories/publicationItemRepository";

type Props = {
  item: PublicationItemRecord;
  first: boolean;
  last: boolean;
  onIncludedChange: (included: boolean) => void;
  onFeaturedChange: (featured: boolean) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
};

export default function ItemToolbar({ item, first, last, onIncludedChange, onFeaturedChange, onDelete, onMove }: Props) {
  const included = item.inclusion_status === "included";
  return <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-5">
    <button type="button" onClick={() => onIncludedChange(!included)} className={`rounded-xl px-4 py-2 text-sm font-black ${included ? "bg-slate-100 text-slate-700" : "bg-emerald-600 text-white"}`}>{included ? "Exclude" : "Include"}</button>
    <button type="button" onClick={() => onFeaturedChange(!item.featured)} className={`rounded-xl px-4 py-2 text-sm font-black ${item.featured ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{item.featured ? "Unfeature" : "Feature"}</button>
    <button type="button" disabled={first} onClick={() => onMove(-1)} aria-label="Move item up" className="rounded-xl border border-slate-200 px-3 py-2 font-black disabled:opacity-30">↑</button>
    <button type="button" disabled={last} onClick={() => onMove(1)} aria-label="Move item down" className="rounded-xl border border-slate-200 px-3 py-2 font-black disabled:opacity-30">↓</button>
    <button type="button" onClick={onDelete} className="ml-auto rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700">Delete</button>
  </div>;
}

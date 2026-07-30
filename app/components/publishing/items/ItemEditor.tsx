"use client";

import type { PublicationItemRecord } from "../../../lib/publishing/repositories/publicationItemRepository";
import type { PublicationItemEditorialChanges } from "../../../lib/publishing/services/publicationItemService";

type Props = { item: PublicationItemRecord; onChange: (changes: PublicationItemEditorialChanges) => void };

export default function ItemEditor({ item, onChange }: Props) {
  return <div className="grid gap-5">
    <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Title</span><input value={item.title || ""} onChange={(event) => onChange({ title: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-bold" /></label>
    <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Description</span><textarea value={item.description || ""} onChange={(event) => onChange({ description: event.target.value })} rows={6} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
    <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Image URL</span><input type="url" value={item.image_url || ""} onChange={(event) => onChange({ image_url: event.target.value })} placeholder="https://…" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
    <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Destination URL</span><input type="url" value={item.destination_url || ""} onChange={(event) => onChange({ destination_url: event.target.value })} placeholder="https://…" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
    <p className="text-xs font-semibold text-slate-400">Changes save automatically after two seconds.</p>
  </div>;
}

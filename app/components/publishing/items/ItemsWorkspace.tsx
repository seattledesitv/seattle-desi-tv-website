"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { usePublicationItems } from "../../../hooks/usePublicationItems";
import type { PublicationItemRecord } from "../../../lib/publishing/repositories/publicationItemRepository";
import ItemCard from "./ItemCard";
import ItemEditor from "./ItemEditor";
import ItemPreview from "./ItemPreview";
import ItemToolbar from "./ItemToolbar";
import AiAssistantPanel from "../AiAssistantPanel";

type Props = { supabase: SupabaseClient; publicationSectionId: string; publicationId?: string };

export default function ItemsWorkspace({ supabase, publicationSectionId, publicationId }: Props) {
  const workspace = usePublicationItems(supabase, publicationSectionId);
  const [selectedId, setSelectedId] = useState("");
  const [draggedId, setDraggedId] = useState("");

  const activeSelectedId = workspace.items.some((item) => item.id === selectedId)
    ? selectedId
    : workspace.items[0]?.id || "";
  const selected = useMemo(() => workspace.items.find((item) => item.id === activeSelectedId) || null, [activeSelectedId, workspace.items]);
  const selectedIndex = selected ? workspace.items.findIndex((item) => item.id === selected.id) : -1;

  function move(item: PublicationItemRecord, direction: -1 | 1) {
    const from = workspace.items.findIndex((candidate) => candidate.id === item.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= workspace.items.length) return;
    const next = [...workspace.items];
    [next[from], next[to]] = [next[to], next[from]];
    void workspace.reorder(next);
  }

  function dropOn(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const from = workspace.items.findIndex((item) => item.id === draggedId);
    const to = workspace.items.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...workspace.items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraggedId("");
    void workspace.reorder(next);
  }

  if (workspace.loading) return <div className="rounded-3xl bg-white p-8 font-bold">Loading items…</div>;

  return <div>
    {workspace.error && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-50 p-4 font-bold text-red-700"><span>{workspace.error}</span>{workspace.saveState === "error" && <button type="button" onClick={workspace.retry} className="rounded-lg bg-red-700 px-3 py-2 text-xs text-white">Retry</button>}</div>}
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_minmax(300px,0.8fr)]">
      <section aria-label="Publication items" className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between px-2 py-3"><div><h2 className="font-black">Items</h2><p className="text-xs text-slate-500">Drag to reorder</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black">{workspace.items.length}</span></div>
        <div className="grid max-h-[70vh] gap-2 overflow-y-auto pr-1">{workspace.items.map((item) => <ItemCard key={item.id} item={item} selected={item.id === activeSelectedId} onSelect={() => setSelectedId(item.id)} onDragStart={() => setDraggedId(item.id)} onDrop={() => dropOn(item.id)} />)}</div>
        {!workspace.items.length && <p className="p-6 text-center text-sm text-slate-500">This section has no publication items.</p>}
      </section>
      <section aria-label="Item editor" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {selected ? <><ItemToolbar item={selected} first={selectedIndex === 0} last={selectedIndex === workspace.items.length - 1} onIncludedChange={(included) => void workspace.setIncluded(selected.id, included)} onFeaturedChange={(featured) => void workspace.setFeatured(selected.id, featured)} onDelete={() => { if (window.confirm("Delete this publication item? This cannot be undone.")) void workspace.remove(selected.id); }} onMove={(direction) => move(selected, direction)} /><div className="mt-5"><ItemEditor item={selected} onChange={(changes) => workspace.update(selected.id, changes)} /></div>{publicationId && <div className="mt-5"><AiAssistantPanel supabase={supabase} publicationId={publicationId} sectionId={publicationSectionId} itemId={selected.id} targetType="item" context={{ title: selected.title, description: selected.description, generatedContent: selected.generated_content, manualContent: selected.manual_content }} sourceAttribution={{ sourceType: selected.source_type, sourceId: selected.source_id }} onApply={(content) => workspace.update(selected.id, { title: content.title, description: content.description, image_url: content.image_url, destination_url: content.destination_url })} /></div>}</> : <p className="py-10 text-center text-slate-500">Select an item to edit.</p>}
      </section>
      <section aria-label="Live preview"><div className="mb-3 flex items-center justify-between"><h2 className="font-black">Preview</h2><span aria-live="polite" className={`text-xs font-black ${workspace.saveState === "error" ? "text-red-600" : workspace.saveState === "saved" ? "text-emerald-600" : "text-slate-400"}`}>{workspace.saveState === "saving" ? "Saving…" : workspace.saveState === "saved" ? "Saved" : workspace.saveState === "error" ? "Save failed" : "All changes saved"}</span></div>{selected ? <ItemPreview item={selected} /> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">Preview appears here.</div>}</section>
    </div>
  </div>;
}

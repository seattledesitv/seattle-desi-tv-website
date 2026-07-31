"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import StudioHeader from "../../../../components/StudioHeader";
import SectionEditor from "../../../../components/publishing/sections/SectionEditor";
import SectionPreview from "../../../../components/publishing/sections/SectionPreview";
import { usePublicationSections } from "../../../../hooks/usePublicationSections";
import { getSupabaseBrowserClient } from "../../../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../../../lib/roles";
import { getPublication } from "../../../../lib/publishing/repository";
import type { PublicationSectionRecord } from "../../../../lib/publishing/repositories/sectionRepository";
import type { PublicationRecord } from "../../../../lib/publishing/types";

const supabase = getSupabaseBrowserClient();

export default function PublicationSectionsPage() {
  const params = useParams<{ publicationId: string }>();
  const publicationId = String(params.publicationId || "");
  const [publication, setPublication] = useState<PublicationRecord | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [pageError, setPageError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draggedId, setDraggedId] = useState("");
  const { sections, loading, saveState, error, update, reorder } = usePublicationSections(supabase, authorized ? publicationId : "");

  useEffect(() => {
    async function init() {
      try {
        const session = await supabase.auth.getSession();
        const user = session.data.session?.user;
        if (!user) throw new Error("Please log in to access the Publishing Platform.");
        const role = await resolveUserRole(supabase, user);
        if (!isAdminRole(role)) throw new Error("This account does not have Studio admin access.");
        setPublication(await getPublication(supabase, publicationId));
        setAuthorized(true);
      } catch (nextError: any) {
        setPageError(nextError.message || "Could not open the section editor.");
      }
    }
    if (publicationId) void init();
  }, [publicationId]);

  useEffect(() => {
    if (!selectedId && sections.length) setSelectedId(sections[0].id);
    if (selectedId && sections.length && !sections.some((section) => section.id === selectedId)) setSelectedId(sections[0].id);
  }, [sections, selectedId]);

  const selected = useMemo(() => sections.find((section) => section.id === selectedId) || null, [sections, selectedId]);

  function move(section: PublicationSectionRecord, direction: -1 | 1) {
    const index = sections.findIndex((item) => item.id === section.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    void reorder(next);
  }

  function dropOn(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const from = sections.findIndex((section) => section.id === draggedId);
    const to = sections.findIndex((section) => section.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraggedId("");
    void reorder(next);
  }

  const statusText = saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "All changes saved";

  return <main className="min-h-screen bg-slate-100 text-slate-950"><StudioHeader /><div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><a href="/studio/publishing" className="text-sm font-black text-pink-600">← Publications</a><div className={`rounded-full px-3 py-1 text-xs font-black ${saveState === "error" ? "bg-red-100 text-red-700" : saveState === "saved" ? "bg-green-100 text-green-700" : "bg-white text-slate-500"}`}>{statusText}</div></div>
    {pageError ? <div className="mt-6 rounded-3xl bg-white p-8 font-bold text-red-700">{pageError}</div> : !publication ? <div className="mt-6 rounded-3xl bg-white p-8 font-bold">Loading publication…</div> : <>
      <div className="mt-5"><p className="text-sm font-black uppercase tracking-[0.2em] text-pink-600">Section editor</p><h1 className="mt-2 text-4xl font-black">{publication.name}</h1><p className="mt-2 text-slate-600">Edit, include, preview and reorder publication sections. Changes save automatically.</p></div>
      {(error || pageError) && <div className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error || pageError}</div>}
      {loading ? <div className="mt-6 rounded-3xl bg-white p-8 font-bold">Loading sections…</div> : <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-4 lg:self-start">
          <div className="px-3 py-2"><p className="font-black">Sections</p><p className="text-xs text-slate-500">Drag to reorder</p></div>
          <div className="mt-2 grid gap-2">{sections.map((section, index) => <div key={section.id} draggable onDragStart={() => setDraggedId(section.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn(section.id)} className={`rounded-2xl border p-3 ${selectedId === section.id ? "border-pink-300 bg-pink-50" : "border-slate-200 bg-white"}`}>
            <button onClick={() => setSelectedId(section.id)} className="w-full text-left"><div className="flex items-center gap-3"><span className="cursor-grab text-slate-400">☰</span><div className="min-w-0 flex-1"><p className="truncate font-black">{section.title}</p><p className="text-xs font-bold uppercase text-slate-400">{section.included ? "Included" : "Excluded"}</p></div></div></button>
            <div className="mt-3 flex justify-end gap-2"><button disabled={index === 0} onClick={() => move(section, -1)} className="rounded-lg border px-2 py-1 text-xs font-black disabled:opacity-30">↑</button><button disabled={index === sections.length - 1} onClick={() => move(section, 1)} className="rounded-lg border px-2 py-1 text-xs font-black disabled:opacity-30">↓</button></div>
          </div>)}</div>
        </aside>
        <section className="grid gap-6">{selected ? <><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><SectionEditor section={selected} onChange={(changes, debounce) => update(selected.id, changes, debounce)} /></div><SectionPreview section={selected} /></> : <div className="rounded-3xl bg-white p-8 text-center text-slate-500">Select a section to begin editing.</div>}</section>
      </div>}
    </>}
  </div></main>;
}

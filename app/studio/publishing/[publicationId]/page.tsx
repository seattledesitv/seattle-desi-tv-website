"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import StudioHeader from "../../../components/StudioHeader";
import ContentDiscoveryWorkspace from "../../../components/publishing/ContentDiscoveryWorkspace";
import AiAssistantPanel from "../../../components/publishing/AiAssistantPanel";
import PromptManager from "../../../components/publishing/PromptManager";
import PublishingPipelineWorkspace from "../../../components/publishing/pipeline/PublishingPipelineWorkspace";
import ItemsWorkspace from "../../../components/publishing/items/ItemsWorkspace";
import SectionEditor from "../../../components/publishing/sections/SectionEditor";
import PublicationPreviewWorkspace from "../../../components/publishing/previews/PublicationPreviewWorkspace";
import { usePublicationSections } from "../../../hooks/usePublicationSections";
import type { PublicationSectionRecord } from "../../../lib/publishing/repositories/sectionRepository";
import { openPublicationEditorialWorkspace, savePublicationEditorialChanges } from "../../../lib/publishing/services/publicationWorkspaceService";
import type { PublicationRecord } from "../../../lib/publishing/types";
import { getSupabaseBrowserClient } from "../../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
type EditorMode = "section" | "items" | "content" | "ai" | "preview" | "publish";

const modes: Array<{ key: EditorMode; label: string }> = [
  { key: "section", label: "Edit section" },
  { key: "items", label: "Edit items" },
  { key: "content", label: "Discover content" },
  { key: "ai", label: "AI assistant" },
  { key: "preview", label: "Preview" },
  { key: "publish", label: "Publish" },
];

export default function UnifiedPublicationEditorPage() {
  const params = useParams<{ publicationId: string }>();
  const publicationId = String(params.publicationId || "");
  const [publication, setPublication] = useState<PublicationRecord | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [pageError, setPageError] = useState("");
  const [mode, setMode] = useState<EditorMode>("section");
  const [selectedId, setSelectedId] = useState("");
  const [draggedId, setDraggedId] = useState("");
  const sectionState = usePublicationSections(supabase, authorized ? publicationId : "");

  useEffect(() => {
    const loadTimer = setTimeout(async () => {
      try {
        setPublication(await openPublicationEditorialWorkspace(supabase, publicationId));
        setAuthorized(true);
      } catch (error) {
        setPageError(error instanceof Error ? error.message : "Could not open the publication editor.");
      }
    }, 0);
    return () => clearTimeout(loadTimer);
  }, [publicationId]);

  const activeId = sectionState.sections.some((section) => section.id === selectedId)
    ? selectedId
    : sectionState.sections[0]?.id || "";
  const selected = useMemo(() => sectionState.sections.find((section) => section.id === activeId) || null, [activeId, sectionState.sections]);

  function move(section: PublicationSectionRecord, direction: -1 | 1) {
    const from = sectionState.sections.findIndex((candidate) => candidate.id === section.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= sectionState.sections.length) return;
    const next = [...sectionState.sections];
    [next[from], next[to]] = [next[to], next[from]];
    void sectionState.reorder(next);
  }

  function dropOn(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const from = sectionState.sections.findIndex((section) => section.id === draggedId);
    const to = sectionState.sections.findIndex((section) => section.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...sectionState.sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraggedId("");
    void sectionState.reorder(next);
  }

  async function addTextSection() {
    const created = await sectionState.addTextSection();
    if (created) {
      setSelectedId(created.id);
      setMode("section");
    }
  }

  async function deleteSelected() {
    if (!selected || !window.confirm(`Delete the custom section “${selected.title}” and its items?`)) return;
    await sectionState.remove(selected);
  }

  const saveLabel = sectionState.saveState === "saving" ? "Saving…" : sectionState.saveState === "saved" ? "Saved" : sectionState.saveState === "error" ? "Save failed" : "All changes saved";

  return <main className="min-h-screen bg-slate-100 text-slate-950"><StudioHeader /><div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/studio/publishing" className="text-sm font-black text-pink-600">← Publications</Link><span aria-live="polite" className={`rounded-full bg-white px-3 py-1 text-xs font-black ${sectionState.saveState === "error" ? "text-red-600" : sectionState.saveState === "saved" ? "text-emerald-600" : "text-slate-500"}`}>{saveLabel}</span></div>
    {pageError ? <div className="mt-6 rounded-3xl bg-white p-8 font-bold text-red-700">{pageError}</div> : !publication ? <div className="mt-6 rounded-3xl bg-white p-8 font-bold">Opening editor…</div> : <>
      <header className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">Unified publication editor</p><h1 className="mt-1 text-3xl font-black md:text-4xl">{publication.name}</h1><p className="mt-1 text-sm text-slate-500">{publication.edition_label || "Edition not set"} · {publication.status}</p></div><div className="flex flex-wrap gap-2">{modes.map((item) => <button key={item.key} type="button" onClick={() => setMode(item.key)} className={`rounded-xl px-4 py-2 text-sm font-black ${mode === item.key ? "bg-slate-950 text-white" : "bg-white text-slate-700"}`}>{item.label}</button>)}</div></header>
      {(pageError || sectionState.error) && <div className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{pageError || sectionState.error}</div>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-2"><div><h2 className="font-black">Sections</h2><p className="text-xs text-slate-500">Drag to reorder</p></div><button type="button" onClick={() => void addTextSection()} className="rounded-xl bg-pink-600 px-3 py-2 text-xs font-black text-white">+ Text</button></div>
          {sectionState.loading ? <p className="p-4 text-sm font-bold text-slate-400">Loading sections…</p> : <div className="mt-2 grid gap-2">{sectionState.sections.map((section, index) => <div key={section.id} draggable onDragStart={() => setDraggedId(section.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn(section.id)} className={`rounded-2xl border p-3 ${activeId === section.id ? "border-pink-300 bg-pink-50" : "border-slate-200"}`}>
            <button type="button" onClick={() => setSelectedId(section.id)} className="w-full text-left"><div className="flex gap-2"><span className="cursor-grab text-slate-300">⋮⋮</span><div className="min-w-0"><p className="truncate font-black">{section.title}</p><p className={`text-[10px] font-black uppercase ${section.included ? "text-emerald-600" : "text-slate-400"}`}>{section.included ? "Included" : "Excluded"}{section.section_key.startsWith("custom_") ? " · Custom" : ""}</p></div></div></button>
            <div className="mt-2 flex justify-end gap-1"><button type="button" disabled={index === 0} onClick={() => move(section, -1)} className="rounded-lg border px-2 py-1 text-xs font-black disabled:opacity-30">↑</button><button type="button" disabled={index === sectionState.sections.length - 1} onClick={() => move(section, 1)} className="rounded-lg border px-2 py-1 text-xs font-black disabled:opacity-30">↓</button></div>
          </div>)}</div>}
        </aside>
        <section className="min-w-0">
          {mode === "ai" && <div className="mb-5"><PromptManager supabase={supabase} /></div>}
          {mode === "content" && <ContentDiscoveryWorkspace supabase={supabase} publication={publication} />}
          {mode === "publish" && <PublishingPipelineWorkspace supabase={supabase} publicationId={publication.id} />}
          {mode !== "content" && !selected && <div className="rounded-3xl bg-white p-10 text-center text-slate-500">Select or add a section to begin.</div>}
          {selected && mode === "section" && <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase text-pink-600">Section editor</p><h2 className="text-2xl font-black">{selected.title}</h2></div>{selected.section_key.startsWith("custom_") && <button type="button" onClick={() => void deleteSelected()} className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700">Delete section</button>}</div><SectionEditor section={selected} onChange={(changes, debounce) => sectionState.update(selected.id, changes, debounce)} /></div>}
          {selected && mode === "items" && <ItemsWorkspace key={selected.id} supabase={supabase} publicationId={publication.id} publicationSectionId={selected.id} />}
          {selected && mode === "ai" && <div className="grid gap-5"><AiAssistantPanel supabase={supabase} publicationId={publication.id} sectionId={selected.id} targetType="section" context={{ title: selected.title, introduction: selected.introduction, generatedContent: selected.generated_content, manualContent: selected.manual_content }} sourceAttribution={{ sectionKey: selected.section_key }} onApply={(content) => sectionState.update(selected.id, { title: content.title ?? selected.title, introduction: content.introduction ?? content.description ?? selected.introduction ?? "" })} /><AiAssistantPanel supabase={supabase} publicationId={publication.id} targetType="publication" context={{ name: publication.name, editionLabel: publication.edition_label, description: publication.description, startDate: publication.start_date, endDate: publication.end_date, sections: sectionState.sections.map((section) => ({ title: section.title, introduction: section.introduction, included: section.included })) }} onApply={(content) => void savePublicationEditorialChanges(supabase, publication, { description: content.description ?? content.summary ?? publication.description ?? "" }).then(setPublication).catch((error) => setPageError(error instanceof Error ? error.message : "Could not apply publication suggestion."))} /></div>}
          {selected && mode === "preview" && <PublicationPreviewWorkspace supabase={supabase} publicationId={publication.id} />}
        </section>
      </div>
    </>}
  </div></main>;
}

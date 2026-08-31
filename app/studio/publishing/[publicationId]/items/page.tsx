"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import StudioHeader from "../../../../components/StudioHeader";
import ItemsWorkspace from "../../../../components/publishing/items/ItemsWorkspace";
import { usePublicationSections } from "../../../../hooks/usePublicationSections";
import { openPublicationEditorialWorkspace } from "../../../../lib/publishing/services/publicationWorkspaceService";
import type { PublicationRecord } from "../../../../lib/publishing/types";
import { getSupabaseBrowserClient } from "../../../../lib/supabaseBrowser";
import { useCurrentSite } from "../../../../lib/sites/SiteContext";

const supabase = getSupabaseBrowserClient();

export default function PublicationItemsPage() {
  const site = useCurrentSite();
  const params = useParams<{ publicationId: string }>();
  const publicationId = String(params.publicationId || "");
  const [publication, setPublication] = useState<PublicationRecord | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [pageError, setPageError] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const { sections, loading: sectionsLoading, error: sectionsError } = usePublicationSections(
    supabase,
    authorized ? publicationId : "",
  );

  useEffect(() => {
    async function initialize() {
      setPageError("");
      try {
        if (!site.id) throw new Error("The current site is not configured.");
        setPublication(await openPublicationEditorialWorkspace(supabase, publicationId, site.id));
        setAuthorized(true);
      } catch (error) {
        setPageError(error instanceof Error && error.message ? error.message : "Could not open the item editor.");
      }
    }
    if (publicationId) void initialize();
  }, [publicationId, site.id]);

  const activeSectionId = sections.some((section) => section.id === selectedSectionId)
    ? selectedSectionId
    : sections[0]?.id || "";
  const selectedSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) || null,
    [activeSectionId, sections],
  );

  return <main className="min-h-screen bg-slate-100 text-slate-950">
    <StudioHeader />
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href="/studio/publishing" className="text-sm font-black text-pink-600">← Publications</a>
        <a href={`/studio/publishing/${publicationId}/sections`} className="rounded-xl bg-white px-4 py-2 text-sm font-black shadow-sm">Edit sections</a>
      </div>

      {pageError ? <div className="mt-6 rounded-3xl bg-white p-8 font-bold text-red-700">{pageError}</div> : !publication ? <div className="mt-6 rounded-3xl bg-white p-8 font-bold">Loading publication…</div> : <>
        <header className="mt-5">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-pink-600">Editorial workspace</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{publication.name}</h1>
          <p className="mt-2 max-w-3xl text-slate-600">Choose a section, curate its items, and edit the content while watching the live preview. All changes save automatically.</p>
        </header>

        {(sectionsError || pageError) && <div className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{sectionsError || pageError}</div>}

        <section aria-label="Sections" className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="shrink-0"><h2 className="font-black">Sections</h2><p className="text-xs text-slate-500">Select items to edit</p></div>
            {sectionsLoading ? <p className="text-sm font-bold text-slate-400">Loading sections…</p> : <div className="flex gap-2 overflow-x-auto pb-1 md:ml-4">
              {sections.map((section) => <button key={section.id} type="button" onClick={() => setSelectedSectionId(section.id)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-black ${activeSectionId === section.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>
                {section.title}<span className={`ml-2 text-[10px] uppercase ${section.included ? "text-emerald-500" : "text-slate-400"}`}>{section.included ? "Included" : "Excluded"}</span>
              </button>)}
            </div>}
          </div>
        </section>

        <section className="mt-6">
          {selectedSection ? <><div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Editing section</p><h2 className="mt-1 text-2xl font-black">{selectedSection.title}</h2></div><ItemsWorkspace key={selectedSection.id} supabase={supabase} publicationSectionId={selectedSection.id} /></> : !sectionsLoading && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No publication sections are available.</div>}
        </section>
      </>}
    </div>
  </main>;
}

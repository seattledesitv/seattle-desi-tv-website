"use client";

import type { PublicationSectionRecord } from "../../../lib/publishing/repositories/sectionRepository";

type Props = { section: PublicationSectionRecord };

export default function SectionPreview({ section }: Props) {
  const config = section.source_config || {};
  const layout = String(config.layout || (section.section_type === "cover" ? "hero" : "grid"));
  const style = String(config.style || "standard");
  const maxItems = Number(config.maxItems || 12);

  return <div className={`rounded-3xl border bg-white p-6 shadow-sm ${section.included ? "border-slate-200" : "border-dashed border-slate-300 opacity-60"}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">Live preview</p><h2 className="mt-2 text-3xl font-black">{section.title || "Untitled section"}</h2></div>
      <div className="flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase">{layout}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase">{style}</span></div>
    </div>
    {section.introduction && <p className="mt-4 max-w-3xl text-slate-600">{section.introduction}</p>}
    {!section.included && <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-600">This section is excluded from publication outputs.</div>}
    {section.included && section.section_type === "dynamic" && <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {Array.from({ length: Math.min(4, maxItems) }).map((_, index) => <div key={index} className="rounded-2xl border border-slate-200 p-4"><div className="h-24 rounded-xl bg-slate-100" /><div className="mt-3 h-4 w-2/3 rounded bg-slate-200" /><div className="mt-2 h-3 w-full rounded bg-slate-100" /></div>)}
    </div>}
    {section.included && section.section_type !== "dynamic" && <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-400">Preview renderer for {section.section_type.replaceAll("_", " ")}</div>}
  </div>;
}

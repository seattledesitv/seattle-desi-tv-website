"use client";

import type { PublicationSectionRecord } from "../../../lib/publishing/repositories/sectionRepository";
import { getSectionDefinition } from "../../../lib/publishing/sections/registry";

export type SectionEditorChanges = {
  title?: string;
  introduction?: string;
  included?: boolean;
  source_config?: Record<string, unknown>;
};

type Props = {
  section: PublicationSectionRecord;
  onChange: (changes: SectionEditorChanges, debounce?: boolean) => void;
};

const layouts = ["grid", "list", "hero", "carousel", "timeline", "gallery", "statistics", "quote", "call_to_action"];
const styles = ["standard", "featured", "compact", "editorial", "minimal"];

export default function SectionEditor({ section, onChange }: Props) {
  const definition = getSectionDefinition(section.section_key);
  const config = section.source_config || {};
  const maxItems = Number(config.maxItems ?? definition?.defaultMaxItems ?? 12);
  const layout = String(config.layout ?? (section.section_type === "cover" ? "hero" : "grid"));
  const style = String(config.style ?? "standard");

  function updateConfig(key: string, value: unknown) {
    onChange({ source_config: { ...config, [key]: value } });
  }

  return <div className="grid gap-5">
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{definition?.label || section.section_type}</p><p className="mt-1 text-sm text-slate-600">{definition?.description || "Custom publication section"}</p></div>
      <label className="flex shrink-0 items-center gap-2 text-sm font-black"><input type="checkbox" checked={section.included} onChange={(event) => onChange({ included: event.target.checked }, false)} className="h-5 w-5" /> Included</label>
    </div>

    <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Section title</span><input value={section.title} onChange={(event) => onChange({ title: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-bold" /></label>
    <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Introduction</span><textarea value={section.introduction || ""} onChange={(event) => onChange({ introduction: event.target.value })} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>

    <div className="grid gap-4 md:grid-cols-3">
      {definition?.supportsItems && <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Maximum items</span><input type="number" min={1} max={100} value={maxItems} onChange={(event) => updateConfig("maxItems", Math.max(1, Number(event.target.value) || 1))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>}
      <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Layout</span><select value={layout} onChange={(event) => updateConfig("layout", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3">{layouts.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
      <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Style</span><select value={style} onChange={(event) => updateConfig("style", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3">{styles.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    </div>
  </div>;
}

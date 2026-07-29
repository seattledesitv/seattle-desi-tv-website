"use client";

import { useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";

type PublicationType = "monthly" | "quarterly" | "six_month" | "annual" | "custom";
type SectionKey = "cover" | "highlights" | "events" | "businesses" | "organizations" | "groups" | "recognition" | "videos" | "statistics" | "get_involved";

type PublicationSection = {
  key: SectionKey;
  title: string;
  description: string;
  included: boolean;
  itemCount: number;
  socialReady: boolean;
};

const initialSections: PublicationSection[] = [
  { key: "cover", title: "Cover", description: "Edition title, hero image and release message.", included: true, itemCount: 1, socialReady: true },
  { key: "highlights", title: "Community Highlights", description: "Top stories and milestones from the selected period.", included: true, itemCount: 6, socialReady: true },
  { key: "events", title: "Upcoming Events", description: "Events selected for the publication and social campaign.", included: true, itemCount: 12, socialReady: true },
  { key: "businesses", title: "New & Featured Businesses", description: "New listings, premium businesses and editor-selected spotlights.", included: true, itemCount: 8, socialReady: true },
  { key: "organizations", title: "Community Organizations", description: "New and featured organizations.", included: true, itemCount: 5, socialReady: true },
  { key: "groups", title: "Community Groups", description: "Useful WhatsApp, Facebook and local community groups.", included: true, itemCount: 5, socialReady: true },
  { key: "recognition", title: "Recognition", description: "Volunteer, team and community recognition.", included: true, itemCount: 4, socialReady: true },
  { key: "videos", title: "Watch on SDTV", description: "Recently published interviews, event coverage and programmes.", included: true, itemCount: 6, socialReady: true },
  { key: "statistics", title: "Impact & Statistics", description: "Activity during the period, growth and end-of-period totals.", included: true, itemCount: 8, socialReady: true },
  { key: "get_involved", title: "Get Involved", description: "Join SDTV, submit content, request coverage and become a contributor.", included: true, itemCount: 8, socialReady: true },
];

const typeLabels: Record<PublicationType, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  six_month: "Six Months",
  annual: "Annual",
  custom: "Custom",
};

export default function PublishingPlatformPage() {
  const [name, setName] = useState("SDTV Community Magazine");
  const [edition, setEdition] = useState("");
  const [publicationType, setPublicationType] = useState<PublicationType>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sections, setSections] = useState(initialSections);
  const [activeSection, setActiveSection] = useState<SectionKey>("events");

  const selectedCount = useMemo(() => sections.filter((section) => section.included).length, [sections]);
  const active = sections.find((section) => section.key === activeSection) || sections[0];

  function toggleSection(key: SectionKey) {
    setSections((current) => current.map((section) => section.key === key ? { ...section, included: !section.included } : section));
  }

  function updateActive(field: "title" | "description", value: string) {
    setSections((current) => current.map((section) => section.key === activeSection ? { ...section, [field]: value } : section));
  }

  function moveSection(direction: -1 | 1) {
    setSections((current) => {
      const index = current.findIndex((section) => section.key === activeSection);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  return <main className="min-h-screen bg-slate-100 text-slate-950">
    <StudioHeader />
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-pink-600">Publishing Platform v2</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Publication Studio</h1>
          <p className="mt-2 max-w-3xl text-slate-600">Build one curated publication, then reuse every section as website, email, PDF and social campaign content.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black">Save Draft</button>
          <button className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Preview Data</button>
        </div>
      </div>

      <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="xl:col-span-2"><span className="text-xs font-black uppercase tracking-wide text-slate-500">Publication name</span><input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-bold" /></label>
          <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Edition label</span><input value={edition} onChange={(event) => setEdition(event.target.value)} placeholder="July 2026" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
          <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Publication type</span><select value={publicationType} onChange={(event) => setPublicationType(event.target.value as PublicationType)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="six_month">Six Months</option><option value="annual">Annual</option><option value="custom">Custom</option></select></label>
          <div className="rounded-2xl bg-slate-950 p-4 text-white"><p className="text-xs font-black uppercase tracking-wide text-pink-300">Current setup</p><p className="mt-1 text-xl font-black">{typeLabels[publicationType]}</p><p className="text-sm text-slate-300">{selectedCount} sections included</p></div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Start date</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
          <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">End date</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className="rounded-3xl bg-slate-950 p-4 text-white shadow-xl">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-300">Publication outline</p><p className="text-sm text-slate-300">Select, order and include sections</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">{selectedCount}/{sections.length}</span></div>
          <div className="space-y-2">{sections.map((section, index) => <button key={section.key} type="button" onClick={() => setActiveSection(section.key)} className={`w-full rounded-2xl border p-3 text-left transition ${activeSection === section.key ? "border-pink-400 bg-pink-600" : "border-white/10 bg-white/5 hover:bg-white/10"}`}><div className="flex items-center gap-3"><span className="text-xs font-black text-white/60">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="truncate font-black">{section.title}</p><p className="text-xs text-white/70">{section.itemCount} items</p></div><span className={`h-3 w-3 rounded-full ${section.included ? "bg-green-400" : "bg-slate-500"}`} /></div></button>)}</div>
        </aside>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
            <div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Section editor</p><h2 className="mt-1 text-3xl font-black">{active.title}</h2><p className="mt-2 text-slate-600">{active.description}</p></div>
            <button onClick={() => toggleSection(active.key)} className={`rounded-xl px-4 py-3 font-black ${active.included ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"}`}>{active.included ? "Included" : "Excluded"}</button>
          </div>

          <div className="mt-6 grid gap-5">
            <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Section title</span><input value={active.title} onChange={(event) => updateActive("title", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-xl font-black" /></label>
            <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Section introduction</span><textarea value={active.description} onChange={(event) => updateActive("description", event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-black">Item-level controls</p><p className="text-sm text-slate-600">The next implementation step will load source records and support include, exclude, feature, edit, image selection and ordering per item.</p></div><span className="rounded-xl bg-white px-4 py-2 text-sm font-black shadow-sm">{active.itemCount} discovered</span></div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => moveSection(-1)} className="rounded-xl border border-slate-300 px-4 py-3 font-black">Move Up</button><button onClick={() => moveSection(1)} className="rounded-xl border border-slate-300 px-4 py-3 font-black">Move Down</button><button className="rounded-xl border border-slate-300 px-4 py-3 font-black">Regenerate Section</button><button className="rounded-xl border border-red-200 px-4 py-3 font-black text-red-600">Remove Section</button></div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-pink-600">Generate from this section</p><h3 className="mt-1 text-2xl font-black">Social Pack</h3><p className="mt-2 text-sm text-slate-600">Reuse the selected section or individual items as campaign assets.</p><div className="mt-4 grid grid-cols-2 gap-2">{["Instagram", "Story", "Facebook", "LinkedIn", "WhatsApp", "Poster", "Reel Script", "Email Block"].map((channel) => <button key={channel} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black hover:border-pink-300 hover:bg-pink-50">{channel}</button>)}</div><button className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 font-black text-white">Generate Complete Social Pack</button></section>
          <section className="rounded-3xl bg-gradient-to-br from-pink-600 to-purple-700 p-5 text-white shadow-xl"><p className="text-xs font-black uppercase tracking-wide text-pink-100">Outputs</p><h3 className="mt-1 text-2xl font-black">Publish Anywhere</h3><div className="mt-4 space-y-2 text-sm font-bold"><p>✓ Website edition</p><p>✓ Email newsletter</p><p>✓ PDF magazine</p><p>✓ Social campaigns</p><p>✓ Publications archive</p></div></section>
        </aside>
      </div>
    </div>
  </main>;
}

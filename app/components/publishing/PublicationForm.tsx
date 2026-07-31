"use client";

import type { PublicationDraftInput, PublicationType } from "../../lib/publishing/types";

const publicationTypes: { value: PublicationType; label: string }[] = [
  { value: "weekly_instagram", label: "Weekly Instagram Events Update" },
  { value: "monthly", label: "Monthly Magazine" },
  { value: "quarterly", label: "Quarterly Report" },
  { value: "six_month", label: "Six-Month Report" },
  { value: "annual", label: "Annual Report" },
  { value: "custom", label: "Custom Publication" },
];

type Props = {
  value: PublicationDraftInput;
  busy?: boolean;
  submitLabel?: string;
  onChange: (value: PublicationDraftInput) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export default function PublicationForm({ value, busy, submitLabel = "Create Publication", onChange, onSubmit, onCancel }: Props) {
  function set<K extends keyof PublicationDraftInput>(key: K, next: PublicationDraftInput[K]) {
    onChange({ ...value, [key]: next });
  }

  const valid = value.name.trim().length > 0 && (!value.start_date || !value.end_date || value.start_date <= value.end_date);
  const weeklyInstagram = value.publication_type === "weekly_instagram";

  return <div className="grid gap-4">
    <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Publication name</span><input value={value.name} onChange={(event) => set("name", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-bold" placeholder="SDTV Community Magazine" /></label>
    <div className="grid gap-4 md:grid-cols-2">
      <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Publication type</span><select value={value.publication_type} onChange={(event) => { const publication_type = event.target.value as PublicationType; onChange({ ...value, publication_type, name: publication_type === "weekly_instagram" && !value.name.trim() ? "Weekly Instagram Events Update" : value.name, description: publication_type === "weekly_instagram" && !value.description.trim() ? "Weekly community events flyer carousel for Instagram." : value.description }); }} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3">{publicationTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Edition</span><input value={value.edition_label} onChange={(event) => set("edition_label", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="July 2026" /></label>
    </div>
    {weeklyInstagram && <div className="rounded-2xl border border-pink-200 bg-pink-50 p-4 text-sm text-pink-950"><p className="font-black">Weekly Instagram workflow</p><p className="mt-1">After creation, this opens directly in the event-flyer carousel editor. You can still use every other publication tool.</p></div>}
    <div className="grid gap-4 md:grid-cols-2">
      <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Start date</span><input type="date" value={value.start_date} onChange={(event) => set("start_date", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
      <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">End date</span><input type="date" value={value.end_date} onChange={(event) => set("end_date", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
    </div>
    <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Description</span><textarea value={value.description} onChange={(event) => set("description", event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Purpose and audience for this publication" /></label>
    {value.start_date && value.end_date && value.start_date > value.end_date && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">End date must be on or after the start date.</p>}
    <div className="flex flex-wrap justify-end gap-3">{onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-5 py-3 font-black">Cancel</button>}<button type="button" disabled={!valid || busy} onClick={onSubmit} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Working..." : submitLabel}</button></div>
  </div>;
}

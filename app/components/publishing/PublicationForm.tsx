"use client";

import type { PublicationDraftInput, PublicationType } from "../../lib/publishing/types";

const publicationTypes: { value: PublicationType; label: string }[] = [
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

  return <div className="grid gap-4">
    <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Publication name</span><input value={value.name} onChange={(event) => set("name", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-bold" placeholder="SDTV Community Magazine" /></label>
    <div className="grid gap-4 md:grid-cols-2">
      <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Publication type</span><select value={value.publication_type} onChange={(event) => set("publication_type", event.target.value as PublicationType)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3">{publicationTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Edition</span><input value={value.edition_label} onChange={(event) => set("edition_label", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="July 2026" /></label>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Start date</span><input type="date" value={value.start_date} onChange={(event) => set("start_date", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
      <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">End date</span><input type="date" value={value.end_date} onChange={(event) => set("end_date", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
    </div>
    <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Description</span><textarea value={value.description} onChange={(event) => set("description", event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Purpose and audience for this publication" /></label>
    {value.start_date && value.end_date && value.start_date > value.end_date && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">End date must be on or after the start date.</p>}
    <div className="flex flex-wrap justify-end gap-3">{onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-5 py-3 font-black">Cancel</button>}<button type="button" disabled={!valid || busy} onClick={onSubmit} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Working..." : submitLabel}</button></div>
  </div>;
}

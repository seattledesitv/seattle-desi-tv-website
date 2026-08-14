"use client";

import { useState } from "react";
import type { PressReleaseDocument } from "../../lib/pressReleases/types";

function isPdf(document: PressReleaseDocument) {
  return document.mime_type === "application/pdf" || document.name.toLowerCase().endsWith(".pdf");
}

function viewerUrl(document: PressReleaseDocument) {
  if (isPdf(document)) return document.url;
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(document.url)}`;
}

export default function PressReleaseDocuments({ documents }: { documents: PressReleaseDocument[] }) {
  const [selected, setSelected] = useState<PressReleaseDocument | null>(null);
  if (!documents.length) return null;

  return <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-black">Documents</h2>
      {selected && <button type="button" onClick={() => setSelected(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-black">Close document</button>}
    </div>
    {selected && <div className="mt-4">
      <iframe title={selected.name} src={viewerUrl(selected)} className="h-[65vh] w-full rounded-xl border" />
      <a href={selected.url} target="_blank" rel="noreferrer" download className="mt-3 inline-flex rounded-lg border px-4 py-2 text-sm font-black text-pink-600">Open or download original</a>
    </div>}
    <div className="mt-4 grid gap-2">
      {documents.map((document) => <button type="button" key={document.url} onClick={() => setSelected(document)} className={`rounded-xl border p-3 text-left ${selected?.url === document.url ? "border-pink-600 bg-pink-50" : "border-slate-200"}`}>
        <span className="block truncate font-black">{document.name}</span>
        <span className="text-xs font-bold uppercase text-slate-500">{isPdf(document) ? "PDF" : "Word"} &middot; {(document.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
      </button>)}
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-500">PDFs display directly. Word previews use Microsoft Office for the public document URL; the original file is always available to open or download.</p>
  </section>;
}

"use client";

import { useState } from "react";
import type { PressReleaseDocument } from "../../lib/pressReleases/types";
import { pressReleaseAttachmentKind, pressReleaseAttachmentLabel } from "../../lib/pressReleases/attachmentType";
import SafeImage from "../SafeImage";

function viewerUrl(document: PressReleaseDocument) {
  if (pressReleaseAttachmentKind(document) === "pdf") return document.url;
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(document.url)}`;
}

export default function PressReleaseDocuments({ documents }: { documents: PressReleaseDocument[] }) {
  const [selected, setSelected] = useState<PressReleaseDocument | null>(null);
  if (!documents.length) return null;

  return <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-black">Attachments</h2>
      {selected && <button type="button" onClick={() => setSelected(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-black">Close attachment</button>}
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {documents.map((document) => {
        const kind = pressReleaseAttachmentKind(document);
        return <button type="button" key={document.url} onClick={() => setSelected(document)} className={`group overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 hover:shadow-md ${selected?.url === document.url ? "border-pink-600 bg-pink-50 ring-2 ring-pink-100" : "border-slate-200 bg-white"}`}>
          <span className="relative block h-40 overflow-hidden bg-slate-100">
            {kind === "image" ? (
              <SafeImage src={document.url} alt={document.name || "Press release attachment"} className="h-full w-full object-cover transition group-hover:scale-105" fallbackClassName="grid h-full w-full place-items-center bg-pink-50 font-black text-pink-700" fallbackLabel="Image" widthHint={520} enableFullPreview={false} />
            ) : kind === "pdf" || kind === "word" ? (
              <iframe title={`${document.name} thumbnail`} src={viewerUrl(document)} tabIndex={-1} aria-hidden="true" className="pointer-events-none h-[320px] w-[200%] origin-top-left scale-50 border-0 bg-white" />
            ) : (
              <span className="grid h-full place-items-center text-4xl font-black text-slate-400">FILE</span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-slate-950/80 px-3 py-2 text-center text-xs font-black text-white">View full attachment</span>
          </span>
          <span className="block p-3">
            <span className="block truncate font-black">{document.name}</span>
            <span className="text-xs font-bold uppercase text-slate-500">{pressReleaseAttachmentLabel(document)} &middot; {(document.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
          </span>
        </button>;
      })}
    </div>
    {selected && <div className="mt-5 border-t pt-5">
      <h3 className="mb-3 truncate text-lg font-black">{selected.name}</h3>
      {pressReleaseAttachmentKind(selected) === "image" ? (
        <SafeImage src={selected.url} alt={selected.name || "Press release attachment"} className="max-h-[75vh] w-full rounded-xl border bg-slate-50 object-contain" fallbackClassName="grid min-h-64 place-items-center rounded-xl border bg-slate-50 font-black text-slate-500" fallbackLabel="Image unavailable" widthHint={1400} enableFullPreview />
      ) : pressReleaseAttachmentKind(selected) === "pdf" || pressReleaseAttachmentKind(selected) === "word" ? (
        <iframe title={selected.name} src={viewerUrl(selected)} className="h-[65vh] w-full rounded-xl border" />
      ) : (
        <div className="rounded-xl border bg-slate-50 p-6 text-sm text-slate-600">This file type does not have an inline preview. Open or download the original below.</div>
      )}
      <a href={selected.url} target="_blank" rel="noreferrer" download className="mt-3 inline-flex rounded-lg border px-4 py-2 text-sm font-black text-pink-600">Open or download original</a>
    </div>}
    <p className="mt-3 text-xs leading-5 text-slate-500">Images and PDFs display directly. Word previews use Microsoft Office for the public file URL; every original attachment remains available to open or download.</p>
  </section>;
}

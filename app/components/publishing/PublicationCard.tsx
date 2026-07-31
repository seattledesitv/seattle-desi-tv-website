"use client";

import type { PublicationRecord } from "../../lib/publishing/types";

type Props = {
  publication: PublicationRecord;
  busy?: boolean;
  onOpen: (publication: PublicationRecord) => void;
  onDuplicate: (publication: PublicationRecord) => void;
  onArchive: (publication: PublicationRecord) => void;
  onDelete: (publication: PublicationRecord) => void;
};

const statusTone: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800", review: "bg-blue-100 text-blue-800", approved: "bg-purple-100 text-purple-800",
  scheduled: "bg-indigo-100 text-indigo-800", published: "bg-green-100 text-green-800", archived: "bg-slate-200 text-slate-700",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function PublicationCard({ publication, busy, onOpen, onDuplicate, onArchive, onDelete }: Props) {
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusTone[publication.status] || statusTone.archived}`}>{publication.status}</span><span className="text-xs font-bold uppercase tracking-wide text-slate-400">{publication.publication_type === "weekly_instagram" ? "Weekly Instagram" : publication.publication_type.replace("_", " ")}</span></div>
        <h3 className="mt-3 truncate text-2xl font-black">{publication.name}</h3>
        <p className="mt-1 text-sm font-bold text-pink-600">{publication.edition_label || "Edition not set"}</p>
        <p className="mt-3 line-clamp-2 text-sm text-slate-600">{publication.description || "No description added yet."}</p>
        <p className="mt-4 text-xs font-bold text-slate-400">Updated {formatDate(publication.updated_at)}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 md:max-w-80 md:justify-end">
        <a href={`/studio/publishing/${publication.id}`} className="rounded-xl bg-pink-600 px-5 py-2 text-sm font-black text-white">Open Editor</a>
        <button disabled={busy} onClick={() => onOpen(publication)} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Overview</button>
        <button disabled={busy} onClick={() => onDuplicate(publication)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black disabled:opacity-50">Duplicate</button>
        {publication.status !== "archived" && <button disabled={busy} onClick={() => onArchive(publication)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black disabled:opacity-50">Archive</button>}
        {publication.status === "draft" && <button disabled={busy} onClick={() => onDelete(publication)} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-black text-red-600 disabled:opacity-50">Delete</button>}
      </div>
    </div>
  </article>;
}

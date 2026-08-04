"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { usePublicationWorkflow } from "../../../hooks/usePublicationWorkflow";
import type { PublicationRecord, PublicationStatus } from "../../../lib/publishing/types";

const labels: Record<PublicationStatus, string> = { draft: "Draft", review: "In review", approved: "Approved", scheduled: "Scheduled", published: "Published", archived: "Archived" };
const actionLabels: Partial<Record<PublicationStatus, string>> = { draft: "Return to draft", review: "Submit for review", approved: "Approve publication", published: "Mark published", archived: "Archive", scheduled: "Mark scheduled" };
const tones: Record<PublicationStatus, string> = { draft: "bg-amber-100 text-amber-900", review: "bg-blue-100 text-blue-900", approved: "bg-emerald-100 text-emerald-900", scheduled: "bg-purple-100 text-purple-900", published: "bg-pink-100 text-pink-900", archived: "bg-slate-200 text-slate-700" };

export default function PublicationReviewWorkspace({ supabase, publication, onPublicationChange }: { supabase: SupabaseClient; publication: PublicationRecord; onPublicationChange: (publication: PublicationRecord) => void }) {
  const workflow = usePublicationWorkflow(supabase, publication, onPublicationChange);
  const [note, setNote] = useState("");
  async function move(status: PublicationStatus) {
    const destructive = status === "draft" || status === "archived";
    if (destructive && !window.confirm(`Move this publication to ${labels[status]}? Delivery will be blocked until it is approved again.`)) return;
    if (await workflow.transition(status, note)) setNote("");
  }
  const checklist = [
    { label: "Publication has a name", complete: Boolean(workflow.publication.name.trim()) },
    { label: "Edition label is set", complete: Boolean(workflow.publication.edition_label?.trim()) },
    { label: "Description is present", complete: Boolean(workflow.publication.description?.trim()) },
    { label: "Editorial preview reviewed", complete: workflow.publication.status !== "draft" },
  ];
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-pink-600">Editorial governance</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">Review & approval</h2><span className={`rounded-full px-4 py-2 text-sm font-black ${tones[workflow.publication.status]}`}>{labels[workflow.publication.status]}</span></div><p className="mt-3 text-sm leading-6 text-slate-600">Public website, subscriber email, and connected social delivery require an approved publication. Generating previews and draft packages remains safe at any status.</p>
      <div className="mt-6 grid gap-2">{checklist.map((item) => <div key={item.label} className={`flex items-center gap-3 rounded-xl p-3 text-sm font-bold ${item.complete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}><span>{item.complete ? "✓" : "○"}</span><span>{item.label}</span></div>)}</div>
      <label className="mt-6 grid gap-2 text-sm font-black">Review or approval note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={1000} placeholder="Summarize what was reviewed, requested changes, or the approval decision." className="rounded-xl border border-slate-200 p-3 font-normal" /></label>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{workflow.transitions.map((status) => <button key={status} type="button" disabled={workflow.busy || (status === "approved" && note.trim().length < 3)} onClick={() => void move(status)} className={`rounded-xl px-4 py-3 font-black disabled:opacity-40 ${status === "approved" ? "bg-emerald-700 text-white" : status === "review" ? "bg-blue-700 text-white" : status === "archived" ? "bg-red-50 text-red-700" : "border border-slate-300 bg-white"}`}>{actionLabels[status] || `Move to ${labels[status]}`}</button>)}</div>
      {workflow.error && <div className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-700">{workflow.error}</div>}
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Audit trail</p><h2 className="mt-1 text-2xl font-black">Status history</h2></div><button type="button" onClick={() => void workflow.refresh()} className="text-sm font-black text-pink-600">Refresh</button></div>{workflow.loading ? <p className="mt-5 font-bold text-slate-500">Loading history…</p> : workflow.history.length ? <div className="mt-5 divide-y divide-slate-200">{workflow.history.map((entry) => <article key={entry.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{labels[entry.from_status]} → {labels[entry.to_status]}</p><time className="text-xs font-bold text-slate-400">{new Date(entry.created_at).toLocaleString()}</time></div>{entry.note && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{entry.note}</p>}</article>)}</div> : <div className="mt-5 rounded-2xl bg-slate-100 p-6 text-center text-slate-500">No status transitions recorded yet. Submit this draft for review to begin the audit trail.</div>}</section>
  </div>;
}

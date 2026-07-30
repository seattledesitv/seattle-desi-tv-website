"use client";
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { usePublicationPreview } from "../../../hooks/usePublicationPreview";
import type { PublicationPreviewChannel } from "../../../lib/publishing/preview/types";
import { previewFileName } from "../../../lib/publishing/services/previewService";
import PublicationChannelPreview from "./PublicationChannelPreview";
const channels: PublicationPreviewChannel[] = ["website", "newsletter", "instagram", "facebook", "linkedin", "mobile", "print"];
function download(content: string, type: string, name: string) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
function escapeHtml(value: string | null) { return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character); }
export default function PublicationPreviewWorkspace({ supabase, publicationId }: { supabase: SupabaseClient; publicationId: string }) {
  const state = usePublicationPreview(supabase, publicationId); const [channel, setChannel] = useState<PublicationPreviewChannel>("website");
  if (state.loading) return <div className="rounded-3xl bg-white p-8 font-bold">Building complete publication preview…</div>;
  if (state.error || !state.preview) return <div className="rounded-3xl bg-red-50 p-6 font-bold text-red-700">{state.error || "Preview unavailable."}</div>;
  const model = state.preview;
  function exportHtml() { const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(model.publication.name)}</title></head><body><h1>${escapeHtml(model.publication.name)}</h1>${model.sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.introduction)}</p>${section.items.map((item) => `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`).join("")}</section>`).join("")}</body></html>`; download(html, "text/html", previewFileName(model.publication.name, "html")); }
  return <div><div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{channels.map((item) => <button key={item} type="button" onClick={() => setChannel(item)} className={`rounded-lg px-3 py-2 text-xs font-black uppercase ${channel === item ? "bg-slate-950 text-white" : "bg-slate-100"}`}>{item}</button>)}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void state.refresh()} className="rounded-lg border px-3 py-2 text-xs font-black">Refresh</button><button type="button" onClick={() => download(JSON.stringify(model, null, 2), "application/json", previewFileName(model.publication.name, "json"))} className="rounded-lg border px-3 py-2 text-xs font-black">JSON</button><button type="button" onClick={exportHtml} className="rounded-lg border px-3 py-2 text-xs font-black">HTML</button><button type="button" onClick={() => window.print()} className="rounded-lg bg-pink-600 px-3 py-2 text-xs font-black text-white">Print / Save PDF</button></div></div><PublicationChannelPreview model={model} channel={channel} /></div>;
}

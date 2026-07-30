"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { editableAiFields, generatePublicationContent, type AiGenerationTarget } from "../../lib/publishing/services/publicationAiService";

type Props = {
  supabase: SupabaseClient;
  publicationId: string;
  sectionId?: string | null;
  itemId?: string | null;
  targetType: AiGenerationTarget;
  context: Record<string, unknown>;
  sourceAttribution?: Record<string, unknown>;
  onApply: (content: Record<string, string>) => void;
};

export default function AiAssistantPanel(props: Props) {
  const [instruction, setInstruction] = useState("Improve clarity, warmth, and editorial quality while preserving all facts.");
  const [generated, setGenerated] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true); setStatus("");
    try {
      const result = await generatePublicationContent(props.supabase, { publicationId: props.publicationId, sectionId: props.sectionId, itemId: props.itemId, targetType: props.targetType, instruction, context: props.context, sourceAttribution: props.sourceAttribution });
      setGenerated(result.content);
      setStatus(`Generated with ${result.provider} · ${result.model}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "AI generation failed.");
    } finally { setBusy(false); }
  }

  function apply() {
    if (!generated) return;
    props.onApply(editableAiFields(generated) as Record<string, string>);
    setStatus("AI suggestion applied. Autosave will preserve the editorial update.");
  }

  return <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-wide text-purple-700">AI editorial assistant</p><p className="text-sm text-purple-900">Generate a suggestion, review it, then apply it explicitly.</p></div><button type="button" disabled={busy} onClick={() => void generate()} className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy ? "Generating…" : `Regenerate ${props.targetType}`}</button></div><textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={2} className="mt-3 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm" />{status && <p className="mt-2 text-xs font-bold text-purple-800">{status}</p>}{generated && <div className="mt-3 rounded-xl bg-white p-3"><pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-slate-600">{JSON.stringify(generated, null, 2)}</pre><button type="button" onClick={apply} className="mt-3 rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white">Apply suggestion</button></div>}</div>;
}

"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { usePublicationAi } from "../../hooks/usePublicationAi";
import { editableAiFields, type AiGenerationTarget } from "../../lib/publishing/services/publicationAiService";

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
  const ai = usePublicationAi(props.supabase);

  async function generate() {
    await ai.generate({ publicationId: props.publicationId, sectionId: props.sectionId, itemId: props.itemId, targetType: props.targetType, instruction, context: props.context, sourceAttribution: props.sourceAttribution });
  }

  function apply() {
    if (!ai.generated) return;
    props.onApply(editableAiFields(ai.generated) as Record<string, string>);
    ai.setStatus("AI suggestion applied. Autosave will preserve the editorial update.");
  }

  return <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-wide text-purple-700">AI editorial assistant</p><p className="text-sm text-purple-900">Generate a suggestion, review it, then apply it explicitly.</p></div><button type="button" disabled={ai.busy} onClick={() => void generate()} className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{ai.busy ? "Generating…" : `Regenerate ${props.targetType}`}</button></div><textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={2} className="mt-3 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm" />{ai.status && <p className="mt-2 text-xs font-bold text-purple-800">{ai.status}</p>}{ai.generated && <div className="mt-3 rounded-xl bg-white p-3"><pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-slate-600">{JSON.stringify(ai.generated, null, 2)}</pre><button type="button" onClick={apply} className="mt-3 rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white">Apply suggestion</button></div>}</div>;
}

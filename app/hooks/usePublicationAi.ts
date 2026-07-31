"use client";
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generatePublicationContent, type AiGenerationRequest } from "../lib/publishing/services/publicationAiService";
export function usePublicationAi(supabase: SupabaseClient) {
  const [generated, setGenerated] = useState<Record<string, unknown> | null>(null); const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false);
  async function generate(request: AiGenerationRequest) { setBusy(true); setStatus(""); try { const result = await generatePublicationContent(supabase, request); setGenerated(result.content); setStatus(`Generated with ${result.provider} · ${result.model}`); return result.content; } catch (error) { setStatus(error instanceof Error ? error.message : "AI generation failed."); return null; } finally { setBusy(false); } }
  return { generated, status, setStatus, busy, generate };
}

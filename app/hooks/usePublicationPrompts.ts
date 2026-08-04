"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicationAiPrompt } from "../lib/publishing/repositories/publicationAiRepository";
import { getPublicationAiPrompts, savePublicationAiPrompt } from "../lib/publishing/services/promptService";
export function usePublicationPrompts(supabase: SupabaseClient) {
  const [prompts, setPrompts] = useState<PublicationAiPrompt[]>([]); const [status, setStatus] = useState("Loading prompts…");
  useEffect(() => { const timer = setTimeout(() => void getPublicationAiPrompts(supabase).then((rows) => { setPrompts(rows); setStatus(""); }).catch((error) => setStatus(error instanceof Error ? error.message : "Could not load prompts.")), 0); return () => clearTimeout(timer); }, [supabase]);
  function change(id: string, changes: Partial<PublicationAiPrompt>) { setPrompts((current) => current.map((prompt) => prompt.id === id ? { ...prompt, ...changes } : prompt)); }
  async function save(prompt: PublicationAiPrompt) { setStatus("Saving prompt…"); try { const saved = await savePublicationAiPrompt(supabase, prompt); change(saved.id, saved); setStatus(`Saved ${saved.name} · version ${saved.version}`); } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save prompt."); } }
  return { prompts, status, change, save };
}

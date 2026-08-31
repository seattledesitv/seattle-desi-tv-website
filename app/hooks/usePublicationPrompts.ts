"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicationAiPrompt } from "../lib/publishing/repositories/publicationAiRepository";
import { getPublicationAiPrompts, savePublicationAiPrompt } from "../lib/publishing/services/promptService";
import { useCurrentSite } from "../lib/sites/SiteContext";
export function usePublicationPrompts(supabase: SupabaseClient) {
  const site = useCurrentSite();
  const [prompts, setPrompts] = useState<PublicationAiPrompt[]>([]); const [status, setStatus] = useState("Loading prompts…");
  useEffect(() => { const timer = setTimeout(() => { if (!site.id) { setStatus("The current site is not configured."); return; } void getPublicationAiPrompts(supabase, site.id).then((rows) => { setPrompts(rows); setStatus(""); }).catch((error) => setStatus(error instanceof Error ? error.message : "Could not load prompts.")); }, 0); return () => clearTimeout(timer); }, [site.id, supabase]);
  function change(id: string, changes: Partial<PublicationAiPrompt>) { setPrompts((current) => current.map((prompt) => prompt.id === id ? { ...prompt, ...changes } : prompt)); }
  async function save(prompt: PublicationAiPrompt) { setStatus("Saving prompt…"); try { if (!site.id) throw new Error("The current site is not configured."); const saved = await savePublicationAiPrompt(supabase, prompt, site.id); change(saved.id, saved); setStatus(`Saved ${saved.name} · version ${saved.version}`); } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save prompt."); } }
  return { prompts, status, change, save };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicationSectionChanges, PublicationSectionRecord } from "../lib/publishing/repositories/sectionRepository";
import { ensurePublicationSections, saveSectionChanges, saveSectionOrder } from "../lib/publishing/services/sectionService";

export type SectionSaveState = "idle" | "saving" | "saved" | "error";

export function usePublicationSections(supabase: SupabaseClient, publicationId: string) {
  const [sections, setSections] = useState<PublicationSectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SectionSaveState>("idle");
  const [error, setError] = useState("");
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const load = useCallback(async () => {
    if (!publicationId) return;
    setLoading(true);
    setError("");
    try {
      setSections(await ensurePublicationSections(supabase, publicationId));
    } catch (nextError: any) {
      setError(nextError.message || "Could not load publication sections.");
    } finally {
      setLoading(false);
    }
  }, [publicationId, supabase]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => timers.current.forEach((timer) => clearTimeout(timer)), []);

  const updateLocal = useCallback((sectionId: string, changes: PublicationSectionChanges) => {
    setSections((current) => current.map((section) => section.id === sectionId ? { ...section, ...changes } : section));
  }, []);

  const saveNow = useCallback(async (sectionId: string, changes: PublicationSectionChanges) => {
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return;
    setSaveState("saving");
    setError("");
    try {
      const saved = await saveSectionChanges(supabase, section, changes);
      setSections((current) => current.map((item) => item.id === saved.id ? saved : item));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
    } catch (nextError: any) {
      setSaveState("error");
      setError(nextError.message || "Could not save section changes.");
    }
  }, [sections, supabase]);

  const update = useCallback((sectionId: string, changes: PublicationSectionChanges, debounce = true) => {
    updateLocal(sectionId, changes);
    const existing = timers.current.get(sectionId);
    if (existing) clearTimeout(existing);
    if (!debounce) {
      void saveNow(sectionId, changes);
      return;
    }
    setSaveState("saving");
    timers.current.set(sectionId, setTimeout(() => void saveNow(sectionId, changes), 800));
  }, [saveNow, updateLocal]);

  const reorder = useCallback(async (nextSections: PublicationSectionRecord[]) => {
    setSections(nextSections);
    setSaveState("saving");
    setError("");
    try {
      setSections(await saveSectionOrder(supabase, nextSections));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
    } catch (nextError: any) {
      setSaveState("error");
      setError(nextError.message || "Could not save section order.");
      void load();
    }
  }, [load, supabase]);

  return { sections, loading, saveState, error, update, reorder, reload: load };
}

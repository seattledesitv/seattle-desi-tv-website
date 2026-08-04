"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicationItemRecord } from "../lib/publishing/repositories/publicationItemRepository";
import {
  excludePublicationItem,
  featurePublicationItem,
  getPublicationItems,
  includePublicationItem,
  removePublicationItem,
  savePublicationItemEdits,
  savePublicationItemOrder,
  unfeaturePublicationItem,
  type PublicationItemEditorialChanges,
} from "../lib/publishing/services/publicationItemService";

export type PublicationItemSaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 2_000;
const SAVED_INDICATOR_MS = 1_500;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function usePublicationItems(
  supabase: SupabaseClient,
  publicationSectionId: string,
) {
  const [items, setItems] = useState<PublicationItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<PublicationItemSaveState>("idle");
  const [error, setError] = useState("");
  const itemsRef = useRef<PublicationItemRecord[]>([]);
  const pending = useRef(new Map<string, PublicationItemEditorialChanges>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const replaceItems = useCallback((next: PublicationItemRecord[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const refresh = useCallback(async (showLoading = false) => {
    if (!publicationSectionId) {
      replaceItems([]);
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const loaded = await getPublicationItems(supabase, publicationSectionId);
      const withPendingChanges = loaded.map((item) => ({
        ...item,
        ...(pending.current.get(item.id) || {}),
      }));
      replaceItems(withPendingChanges);
      setError("");
    } catch (nextError) {
      setError(errorMessage(nextError, "Could not load publication items."));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [publicationSectionId, replaceItems, supabase]);

  useEffect(() => {
    pending.current.clear();
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    const loadTimer = setTimeout(() => void refresh(true), 0);
    return () => clearTimeout(loadTimer);
  }, [refresh]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const markSaved = useCallback(() => {
    setSaveState("saved");
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaveState("idle"), SAVED_INDICATOR_MS);
  }, []);

  const saveEdits = useCallback(async (
    itemId: string,
    changes: PublicationItemEditorialChanges,
  ) => {
    setSaveState("saving");
    setError("");
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await savePublicationItemEdits(supabase, itemId, changes);
        const queued = pending.current.get(itemId);
        if (queued === changes) pending.current.delete(itemId);
        await refresh();
        if (pending.current.size) setSaveState("saving");
        else markSaved();
        return;
      } catch (nextError) {
        const queued = pending.current.get(itemId);
        if (queued !== changes) return;
        if (attempt === 0) {
          setError("Save failed. Retrying automatically…");
          await new Promise<void>((resolve) => {
            timers.current.set(itemId, setTimeout(resolve, AUTOSAVE_DELAY_MS));
          });
          continue;
        }
        setSaveState("error");
        setError(errorMessage(nextError, "Could not save publication item."));
      }
    }
  }, [markSaved, refresh, supabase]);

  const update = useCallback((
    itemId: string,
    changes: PublicationItemEditorialChanges,
  ) => {
    replaceItems(itemsRef.current.map((item) => item.id === itemId
      ? { ...item, ...changes, is_manually_edited: true }
      : item));
    const combined = { ...(pending.current.get(itemId) || {}), ...changes };
    pending.current.set(itemId, combined);
    const existing = timers.current.get(itemId);
    if (existing) clearTimeout(existing);
    setSaveState("saving");
    setError("");
    timers.current.set(itemId, setTimeout(
      () => void saveEdits(itemId, combined),
      AUTOSAVE_DELAY_MS,
    ));
  }, [replaceItems, saveEdits]);

  const runOptimistic = useCallback(async (
    optimisticItems: PublicationItemRecord[],
    action: () => Promise<unknown>,
    fallback: string,
  ) => {
    const previous = itemsRef.current;
    replaceItems(optimisticItems);
    setSaveState("saving");
    setError("");
    try {
      await action();
      await refresh();
      if (pending.current.size) setSaveState("saving");
      else markSaved();
    } catch (nextError) {
      replaceItems(previous);
      setSaveState("error");
      setError(errorMessage(nextError, fallback));
    }
  }, [markSaved, refresh, replaceItems]);

  const setIncluded = useCallback((itemId: string, included: boolean) => {
    const next = itemsRef.current.map((item) => item.id === itemId
      ? { ...item, inclusion_status: included ? "included" as const : "excluded_by_editor" as const }
      : item);
    return runOptimistic(next, () => included
      ? includePublicationItem(supabase, itemId)
      : excludePublicationItem(supabase, itemId), "Could not update inclusion status.");
  }, [runOptimistic, supabase]);

  const setFeatured = useCallback((itemId: string, featured: boolean) => {
    const next = itemsRef.current.map((item) => item.id === itemId ? { ...item, featured } : item);
    return runOptimistic(next, () => featured
      ? featurePublicationItem(supabase, itemId)
      : unfeaturePublicationItem(supabase, itemId), "Could not update featured status.");
  }, [runOptimistic, supabase]);

  const remove = useCallback((itemId: string) => {
    const queuedTimer = timers.current.get(itemId);
    if (queuedTimer) clearTimeout(queuedTimer);
    timers.current.delete(itemId);
    pending.current.delete(itemId);
    const next = itemsRef.current.filter((item) => item.id !== itemId);
    return runOptimistic(next, () => removePublicationItem(supabase, itemId), "Could not delete item.");
  }, [runOptimistic, supabase]);

  const reorder = useCallback((nextItems: PublicationItemRecord[]) => {
    const normalized = nextItems.map((item, index) => ({ ...item, sort_order: index * 10 }));
    return runOptimistic(normalized, () => savePublicationItemOrder(
      supabase,
      normalized.map((item) => item.id),
    ), "Could not save item order.");
  }, [runOptimistic, supabase]);

  const retry = useCallback(() => {
    pending.current.forEach((changes, itemId) => void saveEdits(itemId, changes));
  }, [saveEdits]);

  return {
    items,
    loading,
    saving: saveState === "saving",
    saveState,
    error,
    refresh: () => refresh(true),
    retry,
    reorder,
    remove,
    setIncluded,
    setFeatured,
    update,
    updateTitle: (itemId: string, title: string) => update(itemId, { title }),
    updateDescription: (itemId: string, description: string) => update(itemId, { description }),
    updateImage: (itemId: string, image_url: string) => update(itemId, { image_url }),
    updateDestinationUrl: (itemId: string, destination_url: string) => update(itemId, { destination_url }),
  };
}

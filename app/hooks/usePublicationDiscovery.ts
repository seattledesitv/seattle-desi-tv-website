"use client";

import { useCallback, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscoveryResult, DiscoverySummary, PublishingContentItem } from "../lib/publishing/core/content";
import { discoverPublicationContent, savePublicationDiscovery } from "../lib/publishing/services/discoveryService";
import type { PublicationRecord } from "../lib/publishing/types";

const itemKey = (item: PublishingContentItem) => `${item.sourceType}:${item.sourceId}`;

export function usePublicationDiscovery(supabase: SupabaseClient, publication: PublicationRecord) {
  const [summary, setSummary] = useState<DiscoverySummary | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const discover = useCallback(async () => {
    setDiscovering(true);
    setMessage("");
    try {
      const next = await discoverPublicationContent(supabase, {
        startDate: publication.start_date,
        endDate: publication.end_date,
      });
      setSummary(next);
      setSelected(new Set(next.results.flatMap((result) => result.items.map(itemKey))));
      if (next.errors.length) setMessage(`Discovery completed with warnings: ${next.errors.join(" | ")}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Content discovery failed.");
    } finally {
      setDiscovering(false);
    }
  }, [publication.end_date, publication.start_date, supabase]);

  const save = useCallback(async () => {
    if (!summary) return;
    setSaving(true);
    setMessage("");
    try {
      const selectedResults: DiscoveryResult[] = summary.results.map((result) => ({
        ...result,
        items: result.items.filter((item) => selected.has(itemKey(item))),
      }));
      const count = await savePublicationDiscovery(supabase, publication.id, selectedResults);
      setMessage(`${count} selected items saved to the publication.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save selected content.");
    } finally {
      setSaving(false);
    }
  }, [publication.id, selected, summary, supabase]);

  const filtered = useMemo(() => {
    if (!summary) return [];
    const query = search.trim().toLowerCase();
    if (!query) return summary.results;
    return summary.results.map((result) => ({
      ...result,
      items: result.items.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(query)),
    }));
  }, [search, summary]);

  const toggle = useCallback((item: PublishingContentItem) => {
    setSelected((current) => {
      const next = new Set(current);
      const key = itemKey(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback((result: DiscoveryResult) => {
    setSelected((current) => new Set([...current, ...result.items.map(itemKey)]));
  }, []);

  const clear = useCallback((result: DiscoveryResult) => {
    const keys = new Set(result.items.map(itemKey));
    setSelected((current) => new Set([...current].filter((key) => !keys.has(key))));
  }, []);

  return { summary, selected, search, setSearch, discovering, saving, message, filtered, discover, save, toggle, selectAll, clear };
}

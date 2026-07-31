"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadFileToCloudinary } from "../lib/cloudinaryUpload";
import { usePublicationPreview } from "./usePublicationPreview";
import {
  buildWeeklyEventsCaption,
  defaultWeeklyEventsCopy,
  renderWeeklyEventsInstagramCarousel,
  type WeeklyEventsInstagramCopy,
} from "../lib/publishing/services/weeklyEventsInstagramService";

export function useWeeklyEventsInstagram(supabase: SupabaseClient, publicationId: string, editionLabel?: string | null) {
  const previewState = usePublicationPreview(supabase, publicationId);
  const events = useMemo(() => previewState.preview?.sections.find((section) => section.section_key === "events")?.items || [], [previewState.preview]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copy, setCopy] = useState<WeeklyEventsInstagramCopy>(() => defaultWeeklyEventsCopy(editionLabel));
  const [files, setFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const initializedSelection = useRef(false);

  useEffect(() => {
    if (!events.length || initializedSelection.current) return;
    initializedSelection.current = true;
    const timer = setTimeout(() => setSelectedIds(events.map((event) => event.id)), 0);
    return () => clearTimeout(timer);
  }, [events]);

  useEffect(() => () => imageUrls.forEach((url) => { if (url.startsWith("blob:")) URL.revokeObjectURL(url); }), [imageUrls]);

  const selectedEvents = useMemo(() => selectedIds.map((id) => events.find((event) => event.id === id)).filter(Boolean) as typeof events, [events, selectedIds]);
  const caption = useMemo(() => buildWeeklyEventsCaption(copy, selectedEvents), [copy, selectedEvents]);

  function updateCopy(changes: Partial<WeeklyEventsInstagramCopy>) { setCopy((current) => ({ ...current, ...changes })); setFiles([]); setImageUrls([]); setMessage(""); }
  function toggle(itemId: string) { setSelectedIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]); setFiles([]); setImageUrls([]); }
  function move(itemId: string, direction: -1 | 1) {
    setSelectedIds((current) => { const from = current.indexOf(itemId); const to = from + direction; if (from < 0 || to < 0 || to >= current.length) return current; const next = [...current]; [next[from], next[to]] = [next[to], next[from]]; return next; });
    setFiles([]); setImageUrls([]);
  }
  async function generate() {
    setBusy(true); setError(""); setMessage("");
    try {
      imageUrls.forEach((url) => { if (url.startsWith("blob:")) URL.revokeObjectURL(url); });
      const nextFiles = await renderWeeklyEventsInstagramCarousel(selectedEvents, copy);
      setFiles(nextFiles); setImageUrls(nextFiles.map((file) => URL.createObjectURL(file)));
      setMessage(`Created ${nextFiles.length} Instagram carousel images. Review them before uploading.`);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Could not generate event images."); }
    finally { setBusy(false); }
  }
  async function upload() {
    if (!files.length) return setError("Generate and review the images first.");
    setBusy(true); setError(""); setMessage("Uploading images…");
    try { const urls: string[] = []; for (const file of files) urls.push(await uploadFileToCloudinary(file)); setImageUrls(urls); setMessage("Images uploaded. Confirm the post only after reviewing every slide and the caption."); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Could not upload event images."); }
    finally { setBusy(false); }
  }
  return { ...previewState, events, selectedEvents, selectedIds, copy, caption, files, imageUrls, busy, error: error || previewState.error, message, updateCopy, toggle, move, generate, upload };
}

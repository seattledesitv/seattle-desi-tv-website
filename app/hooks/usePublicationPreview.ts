"use client";
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPublicationPreview } from "../lib/publishing/services/previewService";
import type { PublicationPreviewModel } from "../lib/publishing/preview/types";
export function usePublicationPreview(supabase: SupabaseClient, publicationId: string) {
  const [preview, setPreview] = useState<PublicationPreviewModel | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const refresh = useCallback(async () => { setLoading(true); setError(""); try { setPreview(await buildPublicationPreview(supabase, publicationId)); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Could not build publication preview."); } finally { setLoading(false); } }, [publicationId, supabase]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 0); return () => clearTimeout(timer); }, [refresh]);
  return { preview, loading, error, refresh };
}

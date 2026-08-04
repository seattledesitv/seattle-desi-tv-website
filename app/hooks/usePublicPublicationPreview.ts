"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPublicPublicationPreview } from "../lib/publishing/services/previewService";
import type { PublicationPreviewModel } from "../lib/publishing/preview/types";

export function usePublicPublicationPreview(supabase: SupabaseClient, publicationId: string) {
  const [preview, setPreview] = useState<PublicationPreviewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => { setLoading(true); setError(""); try { setPreview(await buildPublicPublicationPreview(supabase, publicationId)); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Could not load publication."); } finally { setLoading(false); } }, [publicationId, supabase]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 0); return () => clearTimeout(timer); }, [refresh]);
  return { preview, loading, error, refresh };
}

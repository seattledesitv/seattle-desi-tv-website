"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { availablePublicationTransitions, loadPublicationWorkflow, transitionPublicationStatus } from "../lib/publishing/services/publicationWorkflowService";
import type { PublicationStatusHistoryRecord } from "../lib/publishing/repositories/publicationWorkflowRepository";
import type { PublicationRecord, PublicationStatus } from "../lib/publishing/types";

export function usePublicationWorkflow(supabase: SupabaseClient, initialPublication: PublicationRecord, onPublicationChange: (publication: PublicationRecord) => void) {
  const [publication, setPublication] = useState(initialPublication);
  const [history, setHistory] = useState<PublicationStatusHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => { setLoading(true); setError(""); try { const result = await loadPublicationWorkflow(supabase, initialPublication.id); setPublication(result.publication); setHistory(result.history); onPublicationChange(result.publication); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Could not load review workflow."); } finally { setLoading(false); } }, [initialPublication.id, onPublicationChange, supabase]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 0); return () => clearTimeout(timer); }, [refresh]);
  async function transition(status: PublicationStatus, note: string) { setBusy(true); setError(""); try { const updated = await transitionPublicationStatus(supabase, publication, status, note); setPublication(updated); onPublicationChange(updated); const result = await loadPublicationWorkflow(supabase, publication.id); setHistory(result.history); return true; } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Could not update review status."); return false; } finally { setBusy(false); } }
  return { publication, history, loading, busy, error, transitions: availablePublicationTransitions(publication.status), refresh, transition };
}

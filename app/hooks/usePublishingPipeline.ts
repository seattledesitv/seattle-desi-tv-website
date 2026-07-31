"use client";
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelScheduledOutput, getPublishingPipeline, preparePublishingOutputs, publishOutput } from "../lib/publishing/services/publishingPipelineService";
import type { PublicationOutputRecord, PublishAttemptRecord, PublishingChannel } from "../lib/publishing/repositories/publishingPipelineRepository";
function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}
export function usePublishingPipeline(supabase: SupabaseClient, publicationId: string) {
  const [outputs, setOutputs] = useState<PublicationOutputRecord[]>([]); const [attempts, setAttempts] = useState<PublishAttemptRecord[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const refresh = useCallback(async () => { setLoading(true); try { const state = await getPublishingPipeline(supabase, publicationId); setOutputs(state.outputs); setAttempts(state.attempts); setError(""); } catch (nextError) { setError(errorMessage(nextError, "Could not load publishing history.")); } finally { setLoading(false); } }, [publicationId, supabase]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 0); return () => clearTimeout(timer); }, [refresh]);
  async function prepare(channels: PublishingChannel[], scheduledAt?: string | null) { setBusy(true); setError(""); try { await preparePublishingOutputs(supabase, publicationId, channels, scheduledAt); await refresh(); } catch (nextError) { setError(errorMessage(nextError, "Could not prepare outputs.")); } finally { setBusy(false); } }
  async function publish(output: PublicationOutputRecord) { setBusy(true); setError(""); try { await publishOutput(supabase, output, true); await refresh(); } catch (nextError) { setError(errorMessage(nextError, "Publishing action failed.")); } finally { setBusy(false); } }
  async function cancel(output: PublicationOutputRecord) { setBusy(true); try { await cancelScheduledOutput(supabase, output); await refresh(); } catch (nextError) { setError(errorMessage(nextError, "Could not cancel output.")); } finally { setBusy(false); } }
  return { outputs, attempts, loading, busy, error, refresh, prepare, publish, cancel };
}

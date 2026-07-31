"use client";
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelScheduledOutput, getPublishingPipeline, preparePublishingOutputs, publishOutput } from "../lib/publishing/services/publishingPipelineService";
import type { PublicationOutputRecord, PublishAttemptRecord, PublishingChannel } from "../lib/publishing/repositories/publishingPipelineRepository";
export function usePublishingPipeline(supabase: SupabaseClient, publicationId: string) {
  const [outputs, setOutputs] = useState<PublicationOutputRecord[]>([]); const [attempts, setAttempts] = useState<PublishAttemptRecord[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const refresh = useCallback(async () => { setLoading(true); try { const state = await getPublishingPipeline(supabase, publicationId); setOutputs(state.outputs); setAttempts(state.attempts); setError(""); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Could not load publishing history."); } finally { setLoading(false); } }, [publicationId, supabase]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 0); return () => clearTimeout(timer); }, [refresh]);
  async function prepare(channels: PublishingChannel[], scheduledAt?: string | null) { setBusy(true); setError(""); try { await preparePublishingOutputs(supabase, publicationId, channels, scheduledAt); await refresh(); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Could not prepare outputs."); } finally { setBusy(false); } }
  async function publish(output: PublicationOutputRecord) { setBusy(true); setError(""); try { await publishOutput(supabase, output, true); await refresh(); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Publishing action failed."); } finally { setBusy(false); } }
  async function cancel(output: PublicationOutputRecord) { setBusy(true); try { await cancelScheduledOutput(supabase, output); await refresh(); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Could not cancel output."); } finally { setBusy(false); } }
  return { outputs, attempts, loading, busy, error, refresh, prepare, publish, cancel };
}

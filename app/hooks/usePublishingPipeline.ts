"use client";
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelScheduledOutput, getPublishingPipeline, preparePublishingOutputs, publishOutput } from "../lib/publishing/services/publishingPipelineService";
import type { PublicationOutputRecord, PublishAttemptRecord, PublishingChannel } from "../lib/publishing/repositories/publishingPipelineRepository";
import { channelOutputExtension, readChannelOutput, serializeChannelOutput } from "../lib/publishing/services/channelOutputService";
import { sendPublicationTestEmail, sendPublicationToSubscribers } from "../lib/publishing/services/publicationEmailService";
function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}
export function usePublishingPipeline(supabase: SupabaseClient, publicationId: string) {
  const [outputs, setOutputs] = useState<PublicationOutputRecord[]>([]); const [attempts, setAttempts] = useState<PublishAttemptRecord[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [emailBusyId, setEmailBusyId] = useState(""); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => { setLoading(true); try { const state = await getPublishingPipeline(supabase, publicationId); setOutputs(state.outputs); setAttempts(state.attempts); setError(""); } catch (nextError) { setError(errorMessage(nextError, "Could not load publishing history.")); } finally { setLoading(false); } }, [publicationId, supabase]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 0); return () => clearTimeout(timer); }, [refresh]);
  async function prepare(channels: PublishingChannel[], scheduledAt?: string | null) { setBusy(true); setError(""); try { await preparePublishingOutputs(supabase, publicationId, channels, scheduledAt); await refresh(); } catch (nextError) { setError(errorMessage(nextError, "Could not prepare outputs.")); } finally { setBusy(false); } }
  async function publish(output: PublicationOutputRecord) { setBusy(true); setError(""); try { await publishOutput(supabase, output, true); await refresh(); } catch (nextError) { setError(errorMessage(nextError, "Publishing action failed.")); } finally { setBusy(false); } }
  async function cancel(output: PublicationOutputRecord) { setBusy(true); try { await cancelScheduledOutput(supabase, output); await refresh(); } catch (nextError) { setError(errorMessage(nextError, "Could not cancel output.")); } finally { setBusy(false); } }
  function download(output: PublicationOutputRecord) {
    const payload = readChannelOutput(output.content);
    if (!payload) { setError("This older output does not contain a downloadable channel package. Generate a new output."); return; }
    const serialized = serializeChannelOutput(payload);
    const url = URL.createObjectURL(new Blob([serialized.content], { type: serialized.type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "publication"}-${output.channel}.${channelOutputExtension(payload)}`;
    link.click(); URL.revokeObjectURL(url); setNotice(`${output.channel} handoff downloaded.`);
  }
  async function copy(output: PublicationOutputRecord) {
    const payload = readChannelOutput(output.content);
    if (!payload) { setError("This older output does not contain copy-ready channel content. Generate a new output."); return; }
    const value = payload.caption ? [payload.caption, payload.hashtags.map((tag) => `#${tag}`).join(" ")].filter(Boolean).join("\n\n") : payload.text;
    try { await navigator.clipboard.writeText(value); setNotice(`${output.channel} content copied.`); } catch { setError("Could not copy automatically. Download the handoff file instead."); }
  }
  async function sendTest(output: PublicationOutputRecord, testEmail: string) {
    setEmailBusyId(output.id); setError(""); setNotice("");
    try { const result = await sendPublicationTestEmail(supabase, output.id, testEmail); setNotice(result.message); await refresh(); } catch (nextError) { setError(errorMessage(nextError, "Could not send test email.")); } finally { setEmailBusyId(""); }
  }
  async function sendAll(output: PublicationOutputRecord) {
    setEmailBusyId(output.id); setError(""); setNotice("");
    try { const result = await sendPublicationToSubscribers(supabase, output.id); setNotice(result.message); await refresh(); } catch (nextError) { setError(errorMessage(nextError, "Could not send subscriber email.")); } finally { setEmailBusyId(""); }
  }
  return { outputs, attempts, loading, busy, emailBusyId, error, notice, refresh, prepare, publish, cancel, download, copy, sendTest, sendAll };
}

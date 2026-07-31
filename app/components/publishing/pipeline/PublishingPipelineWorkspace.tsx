"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { usePublishingPipeline } from "../../../hooks/usePublishingPipeline";
import { AVAILABLE_PUBLISHING_CHANNELS } from "../../../lib/publishing/services/publishingPipelineService";
import { readChannelOutput } from "../../../lib/publishing/services/channelOutputService";
import type { PublishingChannel } from "../../../lib/publishing/repositories/publishingPipelineRepository";

export default function PublishingPipelineWorkspace({ supabase, publicationId }: { supabase: SupabaseClient; publicationId: string }) {
  const pipeline = usePublishingPipeline(supabase, publicationId);
  const [channels, setChannels] = useState<Set<PublishingChannel>>(new Set(["website", "newsletter", "pdf"]));
  const [scheduledAt, setScheduledAt] = useState("");
  const [testEmails, setTestEmails] = useState<Record<string, string>>({});

  function toggle(channel: PublishingChannel) {
    setChannels((current) => { const next = new Set(current); if (next.has(channel)) next.delete(channel); else next.add(channel); return next; });
  }

  function publish(outputId: string) {
    const output = pipeline.outputs.find((item) => item.id === outputId);
    if (!output || !window.confirm(`Confirm ${output.status === "failed" ? "retry" : "publishing handoff"} for ${output.channel}?`)) return;
    void pipeline.publish(output);
  }

  function sendAllEmail(outputId: string) {
    const output = pipeline.outputs.find((item) => item.id === outputId);
    if (!output || !window.confirm("Send this tested publication email to every active subscriber? Already delivered subscribers will be skipped.")) return;
    void pipeline.sendAll(output);
  }

  return <div className="grid gap-5">
    <section className="rounded-3xl border bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">Publishing pipeline</h2>
      <p className="mt-1 text-sm text-slate-600">Generate channel-specific handoff packages now or schedule them. Nothing posts externally until an adapter is configured and explicitly confirmed.</p>
      <div className="mt-4 flex flex-wrap gap-2">{AVAILABLE_PUBLISHING_CHANNELS.map((channel) => <label key={channel} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-black ${channels.has(channel) ? "border-pink-400 bg-pink-50 text-pink-700" : "border-slate-200"}`}><input type="checkbox" checked={channels.has(channel)} onChange={() => toggle(channel)} className="mr-2" />{channel}</label>)}</div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row"><label className="flex-1 text-xs font-black uppercase text-slate-500">Optional schedule<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal normal-case" /></label><button type="button" disabled={pipeline.busy || !channels.size} onClick={() => void pipeline.prepare([...channels], scheduledAt ? new Date(scheduledAt).toISOString() : null)} className="self-end rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-50">{pipeline.busy ? "Working…" : scheduledAt ? "Schedule outputs" : "Generate outputs"}</button></div>
      {pipeline.error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{pipeline.error}</p>}
      {pipeline.notice && <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">{pipeline.notice}</p>}
    </section>

    <section className="rounded-3xl border bg-white p-5">
      <div className="flex items-center justify-between"><h3 className="text-xl font-black">Channel status</h3><button type="button" onClick={() => void pipeline.refresh()} className="text-sm font-black text-pink-600">Refresh</button></div>
      {pipeline.loading ? <p className="mt-4 text-slate-500">Loading pipeline…</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{pipeline.outputs.map((output) => {
        const payload = readChannelOutput(output.content);
        return <article key={output.id} className="rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-3"><p className="font-black capitalize">{output.channel}</p><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase">{output.status}</span></div>
          {payload ? <><p className="mt-2 line-clamp-2 text-sm text-slate-600">{payload.summary}</p><p className="mt-2 text-xs font-bold text-slate-400">{payload.media.length} media asset{payload.media.length === 1 ? "" : "s"} · package v{payload.schemaVersion}</p></> : <p className="mt-2 text-xs font-bold text-amber-700">Legacy snapshot — generate a new package to download or copy.</p>}
          {output.scheduled_at && <p className="mt-2 text-xs text-slate-500">Scheduled {new Date(output.scheduled_at).toLocaleString()}</p>}
          {output.last_error && <p className="mt-2 text-sm text-red-600">{output.last_error}</p>}
          {output.channel === "email" && payload && <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-500">Email delivery</p><div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]"><input type="email" value={testEmails[output.id] || ""} onChange={(event) => setTestEmails((current) => ({ ...current, [output.id]: event.target.value }))} placeholder="Test email address" className="rounded-lg border bg-white px-3 py-2 text-sm" /><button type="button" disabled={pipeline.emailBusyId === output.id} onClick={() => void pipeline.sendTest(output, testEmails[output.id] || "")} className="rounded-lg bg-pink-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Send test</button></div><button type="button" disabled={pipeline.emailBusyId === output.id || output.status === "published"} onClick={() => sendAllEmail(output.id)} className="mt-2 w-full rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{output.status === "published" ? "Sent to subscribers" : "Send to active subscribers"}</button><p className="mt-2 text-xs text-slate-500">A successful test from the last 24 hours is required before subscriber delivery.</p></div>}
          <div className="mt-3 flex flex-wrap gap-2">{payload && <><button type="button" onClick={() => pipeline.download(output)} className="rounded-lg border px-3 py-2 text-xs font-black">Download</button><button type="button" onClick={() => void pipeline.copy(output)} className="rounded-lg border px-3 py-2 text-xs font-black">Copy text</button></>}{output.channel !== "email" && ["ready", "failed"].includes(output.status) && <button type="button" disabled={pipeline.busy} onClick={() => publish(output.id)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">{output.status === "failed" ? "Retry" : "Confirm handoff"}</button>}{output.status === "scheduled" && <button type="button" disabled={pipeline.busy} onClick={() => void pipeline.cancel(output)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700">Cancel</button>}</div>
        </article>;
      })}{!pipeline.outputs.length && <p className="text-sm text-slate-500">No outputs generated yet.</p>}</div>}
    </section>

    <section className="rounded-3xl border bg-white p-5">
      <h3 className="text-xl font-black">Publishing history</h3>
      <div className="mt-4 divide-y">{pipeline.attempts.map((attempt) => <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><span className="font-black capitalize">{attempt.channel}</span> · {attempt.action}</div><div className="text-right"><span className="font-bold uppercase text-slate-500">{attempt.status}</span><p className="text-xs text-slate-400">{new Date(attempt.attempted_at).toLocaleString()}</p></div></div>)}{!pipeline.attempts.length && <p className="text-sm text-slate-500">No publishing attempts recorded.</p>}</div>
    </section>
  </div>;
}

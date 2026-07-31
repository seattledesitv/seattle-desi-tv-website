"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSocialLaunch } from "../../../hooks/useSocialLaunch";
import { publicPublicationUrl, socialLaunchFormats, type SocialLaunchChannel } from "../../../lib/publishing/services/socialLaunchService";
import type { PublicationRecord } from "../../../lib/publishing/types";
import SafeImage from "../../SafeImage";

const channels: SocialLaunchChannel[] = ["instagram", "facebook", "linkedin"];

export default function SocialLaunchWorkspace({ supabase, publication }: { supabase: SupabaseClient; publication: PublicationRecord }) {
  const state = useSocialLaunch(supabase, publication.id); const publicUrl = publicPublicationUrl(publication.id); const websiteIsLive = publication.status === "published";
  if (state.loading) return <div className="rounded-3xl bg-white p-8 font-bold">Preparing social launch studio…</div>;
  return <div className="grid gap-5">
    <header className="rounded-3xl bg-slate-950 p-6 text-white"><p className="text-xs font-black uppercase tracking-[.2em] text-pink-300">Social launch</p><h2 className="mt-2 text-3xl font-black">Announce this publication</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Create correctly sized launch artwork, customize each caption, and publish only after approving the final post.</p><a href={publicUrl} target="_blank" rel="noreferrer" className="mt-4 block break-all text-sm font-bold text-pink-300 underline">{publicUrl}</a></header>
    {!websiteIsLive && <div className="rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">Preparation is available now. Direct publishing unlocks after the website publication is live, so the link never sends readers to a missing page.</div>}
    {state.error && <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{state.error}</div>}{state.message && <div className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">{state.message}</div>}
    <div className="grid gap-5 xl:grid-cols-3">{channels.map((channel) => { const format = socialLaunchFormats[channel]; const url = state.urls[channel]; const uploaded = Boolean(url?.startsWith("https://")); const approved = state.approvals[channel] === state.signatures[channel]; const caption = state.captions?.[channel] || ""; return <article key={channel} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">{format.label}</h3><p className="text-xs font-bold text-slate-500">{format.width} × {format.height}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{approved ? "Approved" : "Needs approval"}</span></div>
      {url ? <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950"><SafeImage src={url} alt={`${format.label} publication launch`} className="max-h-[420px] w-full object-contain" widthHint={600} enableFullPreview={false} /></div> : <div className="mt-4 grid aspect-[4/3] place-items-center rounded-2xl bg-slate-100 p-6 text-center text-sm font-bold text-slate-400">Generate artwork to preview this post.</div>}
      <button type="button" disabled={Boolean(state.busy)} onClick={() => void state.generate(channel)} className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-black disabled:opacity-50">{url ? "Regenerate image" : "Generate image"}</button>
      <button type="button" disabled={!state.files[channel] || Boolean(state.busy)} onClick={() => void state.upload(channel)} className="mt-2 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-40">{uploaded ? "Image uploaded" : "Upload approved-size image"}</button>
      <label className="mt-4 block text-xs font-black uppercase text-slate-500">Editable caption<textarea value={caption} onChange={(event) => state.updateCaption(channel, event.target.value)} className="mt-2 min-h-44 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal normal-case leading-6 text-slate-800" /></label><p className="mt-1 text-right text-xs text-slate-400">{caption.length} characters</p>
      <label className="mt-3 flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold"><input type="checkbox" checked={approved} disabled={!uploaded || !caption.trim()} onChange={(event) => state.approve(channel, event.target.checked)} className="mt-1 h-5 w-5 accent-emerald-600" /><span>I reviewed this exact image, caption, and public link.</span></label>
      <button type="button" disabled={!websiteIsLive || !approved || Boolean(state.busy)} onClick={() => { if (window.confirm(`Publish this approved post to ${format.label}?`)) void state.publish(channel); }} className="mt-3 w-full rounded-xl bg-pink-600 px-4 py-3 font-black text-white disabled:opacity-40">{websiteIsLive ? `Publish to ${format.label}` : "Publish website first"}</button>
    </article>; })}</div>
  </div>;
}

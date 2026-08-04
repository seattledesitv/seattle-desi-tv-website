"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import PublicationChannelPreview from "../../components/publishing/previews/PublicationChannelPreview";
import { usePublicPublicationPreview } from "../../hooks/usePublicPublicationPreview";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function PublicPublicationPage() {
  const params = useParams<{ publicationId: string }>();
  const state = usePublicPublicationPreview(supabase, String(params.publicationId || ""));
  return <main className="min-h-screen bg-slate-100 text-slate-950"><SiteHeader /><section className="mx-auto max-w-6xl px-4 py-8 md:px-6"><Link href="/publications" className="font-black text-pink-600">← All publications</Link>{state.loading ? <div className="mt-6 rounded-3xl bg-white p-8 font-bold">Loading publication…</div> : state.error || !state.preview ? <div className="mt-6 rounded-3xl bg-red-50 p-8"><h1 className="text-2xl font-black text-red-800">Publication unavailable</h1><p className="mt-2 text-red-700">This edition may not be published yet, or the link is invalid.</p></div> : <div className="mt-6"><PublicationChannelPreview model={state.preview} channel="website" /></div>}</section><SiteFooter /></main>;
}

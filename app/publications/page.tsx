"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import SafeImage from "../components/SafeImage";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import type { PublicationRecord } from "../lib/publishing/types";

const supabase = getSupabaseBrowserClient();

export default function PublicPublicationsPage() {
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { const timer = setTimeout(async () => { const result = await supabase.from("publications").select("*").eq("status", "published").order("updated_at", { ascending: false }); if (result.error) setError(result.error.message); else setPublications((result.data || []) as PublicationRecord[]); setLoading(false); }, 0); return () => clearTimeout(timer); }, []);
  return <main className="min-h-screen bg-slate-100 text-slate-950"><SiteHeader /><section className="mx-auto max-w-7xl px-4 py-10 md:px-6"><p className="text-sm font-black uppercase tracking-[0.2em] text-pink-600">Seattle Desi TV</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Publications</h1><p className="mt-3 max-w-3xl text-slate-600">Read SDTV magazines, community updates, event guides, and special editions.</p>{loading ? <div className="mt-8 rounded-3xl bg-white p-8 font-bold">Loading publications…</div> : error ? <div className="mt-8 rounded-3xl bg-red-50 p-8 font-bold text-red-700">Could not load publications: {error}</div> : publications.length ? <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{publications.map((publication) => <Link key={publication.id} href={`/publications/${publication.id}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">{publication.cover_image_url ? <SafeImage src={publication.cover_image_url} alt="" className="aspect-[16/9] w-full object-cover" widthHint={800} enableFullPreview={false} /> : <div className="aspect-[16/9] bg-gradient-to-br from-slate-950 via-pink-950 to-pink-600" />}<div className="p-6"><p className="text-xs font-black uppercase tracking-wide text-pink-600">{publication.edition_label || "SDTV Edition"}</p><h2 className="mt-2 text-2xl font-black group-hover:text-pink-700">{publication.name}</h2>{publication.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{publication.description}</p>}<p className="mt-5 font-black text-pink-600">Read publication →</p></div></Link>)}</div> : <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No public editions are available yet.</div>}</section><SiteFooter /></main>;
}

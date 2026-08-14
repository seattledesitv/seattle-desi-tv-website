"use client";
/* eslint-disable @next/next/no-img-element -- press release galleries contain user-uploaded media */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import PressReleaseDocuments from "../../components/pressReleases/PressReleaseDocuments";
import { usePressReleaseDetail } from "../../hooks/usePressReleaseDetail";

function date(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export default function PressReleaseDetailPage() {
  const id = String(useParams<{ id: string }>().id || "");
  const { release, loading, error } = usePressReleaseDetail(id);
  const [selected, setSelected] = useState<string | null>(null);
  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader/>
    {loading && <section className="mx-auto max-w-7xl px-6 py-16">Loading press release...</section>}
    {error && <section className="mx-auto max-w-7xl px-6 py-16"><p className="rounded-2xl bg-red-50 p-6 font-bold text-red-900">{error}</p></section>}
    {release && <>
      <header className="bg-slate-950 px-6 py-12 text-white"><div className="mx-auto max-w-7xl"><Link href="/press-releases" className="font-black text-pink-300">← All Press Releases</Link><p className="mt-8 text-sm font-black uppercase tracking-widest text-pink-300">For immediate release · {date(release.release_date)}</p><h1 className="mt-3 max-w-5xl text-4xl font-black leading-tight md:text-6xl">{release.title}</h1><p className="mt-5 max-w-4xl text-xl leading-8 text-slate-300">{release.summary}</p><div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">{release.organization_name && <span className="rounded-full bg-white/10 px-4 py-2">{release.organization_name}</span>}{release.location && <span className="rounded-full bg-white/10 px-4 py-2">{release.location}</span>}</div></div></header>
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article className="rounded-3xl bg-white p-7 shadow-sm md:p-10"><p className="whitespace-pre-wrap text-lg leading-9 text-slate-700">{release.body}</p>{(release.contact_name || release.contact_email) && <div className="mt-10 border-t pt-6"><h2 className="text-xl font-black">Media Contact</h2>{release.contact_name && <p className="mt-2">{release.contact_name}</p>}{release.contact_email && <a href={`mailto:${release.contact_email}`} className="font-bold text-pink-600">{release.contact_email}</a>}</div>}{release.source_url && <a href={release.source_url} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-xl border px-5 py-3 font-black text-pink-600">Original source ↗</a>}</article>
        <aside className="lg:sticky lg:top-28 lg:self-start"><div className="rounded-3xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Release Images</h2>{selected && <button type="button" onClick={() => setSelected(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-black">Close image</button>}</div>{selected ? <button type="button" onClick={() => setSelected(null)} className="mt-4 block w-full" aria-label="Close enlarged image"><img src={selected} alt="Press release" className="max-h-[65vh] w-full rounded-2xl object-contain"/></button> : <p className="mt-3 text-sm leading-6 text-slate-500">Select an image to view it here. Close the image to return to the release information.</p>}<div className="mt-4 grid grid-cols-2 gap-3">{release.image_urls.map((url, index) => <button type="button" key={url} onClick={() => setSelected(url)} className={`overflow-hidden rounded-xl border-2 ${selected === url ? "border-pink-600" : "border-transparent"}`}><img src={url} alt={`Press release image ${index + 1}`} className="aspect-square w-full object-cover"/></button>)}</div>{!release.image_urls.length && <div className="mt-4 rounded-2xl bg-slate-950 p-8 text-center font-black text-white">Seattle Desi TV<br/>Press Release</div>}</div><PressReleaseDocuments documents={release.documents || []}/></aside>
      </section>
    </>}
    <SiteFooter/></main>;
}

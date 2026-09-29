/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { resolveCurrentSite } from "../lib/sites/siteResolver";
import { listPublishedCommunityStories } from "../lib/communityStories/server";
import { staticMetadata } from "../lib/seo/service";

export const metadata = staticMetadata("Seattle Community Newsroom", "Local stories and official community press releases reviewed and published by Seattle Desi TV.", "/news");

export default async function NewsPage() {
  const site = await resolveCurrentSite();
  const stories = await listPublishedCommunityStories(site.id);
  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader />
    <section className="bg-slate-950 px-6 py-16 text-white"><div className="mx-auto max-w-7xl"><p className="font-black uppercase tracking-widest text-pink-300">{site.name} newsroom</p><h1 className="mt-2 text-5xl font-black md:text-6xl">Local News &amp; Stories</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">Community stories, interviews and updates reviewed by the {site.shortName} editorial team.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/submit-content" className="rounded-xl bg-pink-600 px-5 py-3 font-black">Submit a Story</Link><Link href="/press-releases" className="rounded-xl border border-white/20 px-5 py-3 font-black">Official Press Releases</Link></div></div></section>
    <section className="mx-auto max-w-7xl px-6 py-12"><div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{stories.map((story: any) => <article key={story.id} className="overflow-hidden rounded-3xl border bg-white shadow-sm">{story.image_urls?.[0] && <Link href={`/news/stories/${story.slug}`} className="block aspect-video overflow-hidden bg-slate-100"><img src={story.image_urls[0]} alt="" className="h-full w-full object-cover" /></Link>}<div className="p-6"><p className="text-xs font-black uppercase tracking-widest text-pink-600">{story.category || "Community Story"}{story.location ? ` · ${story.location}` : ""}</p><h2 className="mt-2 text-2xl font-black"><Link href={`/news/stories/${story.slug}`}>{story.title}</Link></h2><p className="mt-3 line-clamp-3 leading-7 text-slate-600">{story.summary}</p><Link href={`/news/stories/${story.slug}`} className="mt-5 inline-flex font-black text-pink-600">Read story →</Link></div></article>)}</div>{stories.length === 0 && <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-slate-500">No local stories have been published yet. Approved stories will appear here.</div>}</section>
    <section className="border-t bg-white px-6 py-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row md:items-center"><div><h2 className="text-3xl font-black">Official announcements</h2><p className="mt-2 text-slate-600">Press releases remain clearly identified and separate from SDTV editorial stories.</p></div><Link href="/press-releases" className="rounded-xl bg-slate-950 px-5 py-3 text-center font-black text-white">Browse Press Releases</Link></div></section><SiteFooter /></main>;
}

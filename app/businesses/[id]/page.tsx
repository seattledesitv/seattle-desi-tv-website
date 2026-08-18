import { notFound } from "next/navigation";
import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import SafeImage from "../../components/SafeImage";
import { getEntity } from "../../lib/seo/service";

export default async function BusinessProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getEntity("business", id);
  if (!business) notFound();

  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader />
    <header className="bg-slate-950 px-6 py-14 text-white"><div className="mx-auto max-w-6xl"><Link href="/businesses" className="font-black text-pink-300">← Local Business Directory</Link><p className="mt-8 text-sm font-black uppercase tracking-widest text-pink-300">Seattle Desi Marketplace</p><h1 className="mt-3 text-4xl font-black md:text-6xl">{business.title}</h1>{business.category && <p className="mt-4 text-lg font-bold text-slate-300">{business.category}</p>}</div></header>
    <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_340px]"><article className="overflow-hidden rounded-3xl border bg-white shadow-sm">{business.image ? <SafeImage src={business.image} alt={business.title} className="max-h-[520px] w-full object-cover" widthHint={1100} /> : <div className="grid h-64 place-items-center bg-pink-50 text-3xl font-black text-pink-600">Seattle Desi TV</div>}<div className="p-7"><h2 className="text-2xl font-black">About this business</h2><p className="mt-4 leading-7 text-slate-600">{business.description}</p>{business.offer && <div className="mt-6 rounded-2xl bg-emerald-50 p-5"><p className="text-xs font-black uppercase tracking-wide text-emerald-700">Current offer</p><p className="mt-2 font-bold text-emerald-950">{business.offer}</p></div>}</div></article>
      <aside className="space-y-5"><div className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Business details</h2>{business.location && <div className="mt-5"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Location</p><p className="mt-1 font-bold">{business.location}</p></div>}{business.website && <a href={business.website} target="_blank" rel="noreferrer" className="mt-5 block rounded-xl bg-pink-600 px-4 py-3 text-center font-black text-white">Visit Website</a>}{business.location && <a href={`https://www.google.com/maps?q=${encodeURIComponent(business.location)}`} target="_blank" rel="noreferrer" className="mt-3 block rounded-xl border px-4 py-3 text-center font-black">Open Map</a>}</div><div className="rounded-3xl border border-pink-100 bg-pink-50 p-6"><h2 className="text-xl font-black">Manage this listing</h2><p className="mt-2 text-sm leading-6 text-slate-600">Business owners can claim this profile, suggest corrections, or request removal.</p><a href={`/manage-listing?type=business&id=${business.id}&name=${encodeURIComponent(business.title)}`} className="mt-4 block rounded-xl bg-slate-950 px-4 py-3 text-center font-black text-white">Manage Business</a></div></aside>
    </section><SiteFooter /></main>;
}

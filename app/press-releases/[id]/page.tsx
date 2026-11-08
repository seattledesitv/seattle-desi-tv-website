"use client";
/* eslint-disable @next/next/no-img-element -- press release galleries contain user-uploaded media */
import Link from "next/link";
import { useParams } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import PressReleaseDocuments from "../../components/pressReleases/PressReleaseDocuments";
import PressReleaseBody from "../../components/pressReleases/PressReleaseBody";
import PressReleaseGallery from "../../components/pressReleases/PressReleaseGallery";
import { usePressReleaseDetail } from "../../hooks/usePressReleaseDetail";
import { entityIdFromParam } from "../../lib/seo/urls";
import { useCurrentSite } from "../../lib/sites/SiteContext";

function date(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default function PressReleaseDetailPage() {
  const site = useCurrentSite();
  const id = entityIdFromParam(useParams<{ id: string }>().id);
  const { release, loading, error } = usePressReleaseDetail(id);
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      {loading && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          Loading press release...
        </section>
      )}
      {error && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <p className="rounded-2xl bg-red-50 p-6 font-bold text-red-900">
            {error}
          </p>
        </section>
      )}
      {release && (
        <>
          <header className="bg-slate-950 px-6 py-12 text-white">
            <div className="mx-auto max-w-7xl">
              <Link href="/press-releases" className="font-black text-pink-300">
                ← All Press Releases
              </Link>
              <p className="mt-8 text-sm font-black uppercase tracking-widest text-pink-300">
                For immediate release · {date(release.release_date)}
              </p>
              <h1 className="mt-3 max-w-5xl text-4xl font-black leading-tight md:text-6xl">
                {release.title}
              </h1>
              <p className="mt-5 max-w-4xl text-xl leading-8 text-slate-300">
                {release.summary}
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
                {release.organization_name && (
                  <span className="rounded-full bg-white/10 px-4 py-2">
                    {release.organization_name}
                  </span>
                )}
                {release.location && (
                  <span className="rounded-full bg-white/10 px-4 py-2">
                    {release.location}
                  </span>
                )}
              </div>
            </div>
          </header>
          <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_380px]">
            <article className="rounded-3xl bg-white p-7 shadow-sm md:p-10">
              <div className="text-lg leading-9 text-slate-700">
                <PressReleaseBody body={release.body} />
              </div>
              {(release.contact_name || release.contact_email) && (
                <div className="mt-10 border-t pt-6">
                  <h2 className="text-xl font-black">Media Contact</h2>
                  {release.contact_name && (
                    <p className="mt-2">{release.contact_name}</p>
                  )}
                  {release.contact_email && (
                    <a
                      href={`mailto:${release.contact_email}`}
                      className="font-bold text-pink-600"
                    >
                      {release.contact_email}
                    </a>
                  )}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                {release.source_url && (
                  <a
                    href={release.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-xl border px-5 py-3 font-black text-pink-600"
                  >
                    Original source ↗
                  </a>
                )}
                {release.instagram_permalink && (
                  <a
                    href={release.instagram_permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-xl bg-gradient-to-r from-fuchsia-700 to-pink-600 px-5 py-3 font-black text-white"
                  >
                    See it on Instagram ↗
                  </a>
                )}
              </div>
            </article>
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <PressReleaseGallery images={release.image_urls} title={release.title} siteName={site.name} />
              <PressReleaseDocuments documents={release.documents || []} />
            </aside>
          </section>
        </>
      )}
      <SiteFooter />
    </main>
  );
}

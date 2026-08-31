"use client";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import PressReleaseCard from "../components/pressReleases/PressReleaseCard";
import { usePressReleases } from "../hooks/usePressReleases";
import { useCurrentSite } from "../lib/sites/SiteContext";

export default function PressReleasesPage() {
  const site = useCurrentSite();
  const { releases, loading, error } = usePressReleases("public");
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      <section className="bg-slate-950 px-6 py-14 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-black uppercase tracking-widest text-pink-300">
              Community newsroom
            </p>
            <h1 className="mt-2 text-5xl font-black md:text-6xl">
              Press Releases
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
              Official announcements, community milestones, organizational news,
              and stories submitted to {site.name}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/press-releases/submit"
              className="rounded-xl bg-pink-600 px-5 py-3 font-black"
            >
              Submit a Press Release
            </Link>
            <Link
              href="/my-press-releases"
              className="rounded-xl border border-white/20 px-5 py-3 font-black"
            >
              My Submissions
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-12">
        {loading && (
          <p className="rounded-2xl bg-white p-6">Loading press releases...</p>
        )}
        {error && (
          <p className="rounded-2xl bg-red-50 p-6 font-bold text-red-900">
            {error}
          </p>
        )}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {releases.map((release) => (
            <PressReleaseCard key={release.id} release={release} />
          ))}
        </div>
        {!loading && !error && !releases.length && (
          <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-slate-500">
            No approved press releases have been published yet.
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

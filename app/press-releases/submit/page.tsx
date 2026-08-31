"use client";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import PressReleaseForm from "../../components/pressReleases/PressReleaseForm";
import { usePressReleases } from "../../hooks/usePressReleases";
import { useCurrentSite } from "../../lib/sites/SiteContext";

export default function SubmitPressReleasePage() {
  const site = useCurrentSite();
  const data = usePressReleases("owner");
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-6 py-12">
        <p className="font-black uppercase tracking-wide text-pink-600">
          Community newsroom
        </p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">
          Submit a Press Release
        </h1>
        <p className="mb-8 mt-3 max-w-3xl text-slate-600">
          Submit an official announcement for {site.shortName} review. You may
          attach multiple images; approved releases appear in the public
          newsroom.
        </p>
        {!data.loading && !data.userId ? (
          <a
            href="/login?next=/press-releases/submit"
            className="inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white"
          >
            Log in to submit
          </a>
        ) : (
          <PressReleaseForm
            saving={data.saving}
            error={data.error}
            onCreate={data.create}
            onUpload={data.upload}
          />
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

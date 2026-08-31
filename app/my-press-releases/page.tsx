"use client";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import PressReleaseForm from "../components/pressReleases/PressReleaseForm";
import { usePressReleases } from "../hooks/usePressReleases";
import type { PressRelease } from "../lib/pressReleases/types";
import { useState } from "react";

export default function MyPressReleasesPage() {
  const data = usePressReleases("owner");
  const [editing, setEditing] = useState<PressRelease | null>(null);
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-black uppercase tracking-wide text-pink-300">
              My Hub
            </p>
            <h1 className="mt-2 text-4xl font-black">My Press Releases</h1>
            <p className="mt-2 text-slate-300">
              Track review status and update your text, documents, images, and
              primary card image.
            </p>
          </div>
          <Link
            href="/press-releases/submit"
            className="rounded-xl bg-pink-600 px-5 py-3 font-black"
          >
            New Press Release
          </Link>
        </div>
        {data.error && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 font-bold text-red-900">
            {data.error}
          </p>
        )}
        {editing && (
          <div className="mt-8 text-slate-950">
            <PressReleaseForm
              key={editing.id}
              initialRelease={editing}
              saving={data.saving}
              error={data.error}
              onCreate={data.create}
              onUpdate={async (id, input) => {
                await data.update(id, input);
                setEditing(null);
              }}
              onUpload={data.upload}
              onCancel={() => setEditing(null)}
            />
          </div>
        )}
        <div className="mt-8 grid gap-4">
          {data.releases.map((release) => (
            <article
              key={release.id}
              className="rounded-3xl bg-white p-6 text-slate-950"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-pink-600">
                    {release.organization_name || "Community press release"}
                  </p>
                  <h2 className="mt-1 text-2xl font-black">{release.title}</h2>
                  <p className="mt-2 text-slate-600">{release.summary}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase">
                  {release.status.replaceAll("_", " ")}
                </span>
              </div>
              {release.admin_notes && (
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                  <b>SDTV note:</b> {release.admin_notes}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                {release.status !== "archived" && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(release);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="rounded-xl bg-slate-950 px-4 py-2 font-black text-white"
                  >
                    Edit Press Release
                  </button>
                )}
                {release.status === "approved" && (
                  <Link
                    href={`/press-releases/${release.id}`}
                    className="rounded-xl border px-4 py-2 font-black text-pink-600"
                  >
                    View published release →
                  </Link>
                )}
              </div>
              {release.status === "approved" && (
                <p className="mt-3 text-xs font-bold text-amber-700">
                  Editing a published release returns it to SDTV review and
                  temporarily removes it from the public newsroom.
                </p>
              )}
            </article>
          ))}
          {!data.loading && !data.releases.length && (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-300">
              You have not submitted a press release yet.
            </p>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

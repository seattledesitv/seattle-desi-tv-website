"use client";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import MatrimonyProfileForm from "../components/matrimony/MatrimonyProfileForm";
import MatrimonyProfileCard from "../components/matrimony/MatrimonyProfileCard";
import MatrimonyAccessPanel from "../components/matrimony/MatrimonyAccessPanel";
import { useMatrimony } from "../hooks/useMatrimony";
import type {
  MatrimonyContact,
  MatrimonyProfile,
} from "../lib/matrimony/types";
import { useCurrentSite } from "../lib/sites/SiteContext";
export default function MatrimonyPage() {
  const site = useCurrentSite();
  const data = useMatrimony("member");
  const active =
    data.access?.status === "active" &&
    !!data.access.access_expires_at &&
    new Date(data.access.access_expires_at) > new Date();
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      <section className="bg-slate-950 px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="font-black uppercase tracking-wide text-pink-300">
            {site.shortName} Community
          </p>
          <h1 className="mt-2 text-4xl font-black md:text-6xl">Matrimony</h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">
            A moderated, privacy-conscious community introduction service.{" "}
            {site.shortName}
            reviews profiles and access requests before any information is
            shared.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-8 px-5 py-10">
        {data.loading && (
          <div className="rounded-2xl bg-white p-8">
            Loading your matrimony workspace...
          </div>
        )}
        {data.error && (
          <div className="rounded-2xl bg-red-50 p-5 font-bold text-red-900">
            {data.error}
            {data.error.includes("log in") && (
              <a href="/login" className="ml-2 underline">
                Log in
              </a>
            )}
          </div>
        )}
        {!data.loading && data.user && (
          <>
            <div className="grid gap-8 lg:grid-cols-2">
              <MatrimonyProfileForm
                profile={
                  data.profile as
                    | (MatrimonyProfile & { contact?: MatrimonyContact | null })
                    | null
                }
                email={data.user.email}
                saving={data.saving}
                onSave={data.saveProfile}
                onUpload={data.upload}
              />
              <MatrimonyAccessPanel
                access={data.access}
                pricing={data.pricing}
                saving={data.saving}
                onRequest={data.requestAccess}
              />
            </div>
            {active && (
              <section>
                <p className="font-black uppercase tracking-wide text-pink-600">
                  Approved Profiles
                </p>
                <h2 className="mt-2 text-3xl font-black">Community Matches</h2>
                <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {data.profiles.map((profile) => (
                    <MatrimonyProfileCard key={profile.id} profile={profile} />
                  ))}
                  {!data.profiles.length && (
                    <p className="rounded-2xl bg-white p-6 text-slate-600">
                      No approved profiles are available yet.
                    </p>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}

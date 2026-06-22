import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

function StepCard({ title, steps }: { title: string; steps: string[] }) {
  return (
    <article className="rounded-3xl border bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <ol className="mt-5 grid gap-3 text-slate-700">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pink-600 text-sm font-black text-white">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

export default function MobileAppPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      <section className="bg-[#050b18] px-6 py-14 text-white md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black uppercase tracking-wide text-pink-300">Seattle Desi TV App</p>
          <h1 className="mt-3 text-4xl font-black md:text-6xl">Use SDTV like a mobile app</h1>
          <p className="mt-5 max-w-3xl text-lg text-slate-300">Install Seattle Desi TV on your phone home screen for faster access to events, radio, My Hub, assignments, and community updates.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-10 md:grid-cols-2 md:px-10">
        <StepCard
          title="Android / Chrome"
          steps={[
            "Open seattledesitv.com in Chrome on your Android phone.",
            "If the install banner appears, tap Install SDTV App.",
            "If no banner appears, tap the Chrome menu ⋮ in the top-right corner.",
            "Choose Add to Home screen or Install app.",
            "Tap Install. SDTV will appear on your phone like an app.",
          ]}
        />
        <StepCard
          title="iPhone / Safari"
          steps={[
            "Open seattledesitv.com in Safari on your iPhone.",
            "Tap the Share button at the bottom of Safari.",
            "Scroll down and tap Add to Home Screen.",
            "Confirm the name Seattle Desi TV or SDTV.",
            "Tap Add. SDTV will appear on your iPhone home screen.",
          ]}
        />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12 md:px-10">
        <div className="rounded-3xl bg-white p-6 shadow-sm border">
          <h2 className="text-2xl font-black">What you can do from the mobile app</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-pink-50 p-4"><p className="font-black text-pink-700">Events</p><p className="mt-1 text-sm text-slate-600">Browse and open event details quickly.</p></div>
            <div className="rounded-2xl bg-pink-50 p-4"><p className="font-black text-pink-700">Radio</p><p className="mt-1 text-sm text-slate-600">Listen to Seattle Desi Radio.</p></div>
            <div className="rounded-2xl bg-pink-50 p-4"><p className="font-black text-pink-700">My Hub</p><p className="mt-1 text-sm text-slate-600">Check assignments, availability, and role status.</p></div>
            <div className="rounded-2xl bg-pink-50 p-4"><p className="font-black text-pink-700">Updates</p><p className="mt-1 text-sm text-slate-600">Access SDTV pages from your phone home screen.</p></div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

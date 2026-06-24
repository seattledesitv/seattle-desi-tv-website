import StudioHeader from "../../components/StudioHeader";

const cards = [
  { title: "Influencer Applications", description: "Review new influencer profiles, approvals, public listing, and visibility.", href: "/studio/influencer-ops", cta: "Open Applications" },
  { title: "Influencer Directory", description: "Manage approved creator profiles shown on the public influencer page.", href: "/studio/influencers", cta: "Manage Directory" },
  { title: "Business Coverage Requests", description: "Review businesses requesting influencer coverage through Contact Requests.", href: "/studio/contact-requests", cta: "Open Requests" },
  { title: "Event Collaborations", description: "Review event-level influencer collab requests and coverage activity.", href: "/studio/event-ops-v2", cta: "Open Event Ops" },
];

export default function InfluencerManagementPage() {
  return <main className="min-h-screen bg-slate-950 text-white">
    <StudioHeader />
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <p className="font-black uppercase tracking-wide text-pink-300">Creator Network</p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">Influencer Management</h1>
        <p className="mt-3 max-w-3xl text-slate-300">Manage the SDTV influencer program from one place: applications, directory profiles, business coverage requests, and event collaborations.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <a key={card.href} href={card.href} className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
          <h2 className="text-2xl font-black">{card.title}</h2>
          <p className="mt-3 min-h-24 text-sm leading-6 text-slate-600">{card.description}</p>
          <span className="mt-5 inline-flex rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white">{card.cta}</span>
        </a>)}
      </div>
    </section>
  </main>;
}

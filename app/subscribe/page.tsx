import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import NewsletterSubscribeForm from "../components/NewsletterSubscribeForm";
import { staticMetadata } from "../lib/seo/service";

export const metadata = staticMetadata(
  "Subscribe to Seattle Desi TV",
  "Subscribe for Seattle Desi TV community events, local stories, interviews, radio, business highlights, publications, and announcements.",
  "/subscribe",
);

const benefits = [
  ["Community events", "Upcoming cultural programs, festivals, and local gatherings."],
  ["Stories and interviews", "New Seattle Desi TV videos, conversations, and community highlights."],
  ["Publications and radio", "Fresh SDTV editions, radio programming, and important announcements."],
  ["Local opportunities", "Selected business offers, volunteer opportunities, and ways to participate."],
];

export default function SubscribePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      <section className="relative overflow-hidden bg-[#050b18] px-5 py-16 text-white md:px-10 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(219,39,119,0.3),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.14),transparent_34%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-pink-300">
              Stay connected
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[0.98] md:text-7xl">
              Seattle&apos;s Desi community, delivered to you.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Receive curated Seattle Desi TV updates about community events,
              culture, interviews, radio, publications, and opportunities to get
              involved.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-300">
              Free community updates
            </p>
            <h2 className="mt-2 text-3xl font-black">Join the SDTV email list</h2>
            <p className="mb-6 mt-2 text-sm leading-6 text-slate-300">
              Enter your email below. No account is required.
            </p>
            <NewsletterSubscribeForm source="subscribe-page" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-10 md:py-20">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map(([title, description]) => (
            <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 h-2 w-14 rounded-full bg-pink-600" />
              <h2 className="text-xl font-black">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-pink-50 p-6 text-sm leading-6 text-slate-700 md:p-8">
          <h2 className="text-xl font-black text-slate-950">You remain in control</h2>
          <p className="mt-2">
            Seattle Desi TV uses your information to deliver the updates you
            requested. You can unsubscribe or resubscribe at any time. Review our{" "}
            <a href="/privacy" className="font-black text-pink-700 underline">Privacy Policy</a>{" "}
            or{" "}
            <a href="/unsubscribe" className="font-black text-pink-700 underline">manage your subscription</a>.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

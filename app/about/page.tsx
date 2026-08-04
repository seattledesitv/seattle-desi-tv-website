import Link from "next/link";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const programs = [
  { title: "Events to Excitement", description: "We capture the spirit of community celebrations, live and recorded." },
  { title: "Inspiring Interviews", description: "Meet the changemakers, trendsetters, and visionaries shaping our world." },
  { title: "Talk Shows with a Twist", description: "Engaging, entertaining conversations that keep community voices at the center." },
  { title: "Giving Back", description: "We shine a light on social-service initiatives that uplift our community." },
  { title: "Live Shows & Promotions", description: "We bring audiences closer to the action and invite everyone to participate." },
  { title: "Desi Movie Reviews", description: "A community-minded guide to the latest in Desi cinema." },
  { title: "Short Films, Big Impact", description: "Stories that matter, told straight from the heart." },
];

export default function AboutPage() {
  return <main className="min-h-screen bg-[#fffaf3] text-slate-950">
    <SiteHeader />
    <section className="relative overflow-hidden bg-slate-950 px-5 py-16 text-white md:px-10 md:py-24">
      <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-pink-600/25 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <span className="inline-flex rounded-full border border-pink-300/30 bg-pink-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-pink-200">501(c)(3) nonprofit organization</span>
        <div className="mt-7 grid items-end gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <div><p className="font-black uppercase tracking-[0.22em] text-amber-300">About Seattle Desi TV</p><h1 className="mt-3 max-w-4xl text-5xl font-black leading-[.95] md:text-7xl">Stories, culture and community—shared with the world.</h1></div>
          <p className="text-lg leading-8 text-slate-300">Seattle Desi TV is a community media platform dedicated to celebrating the vibrant culture, talent, and voices of the Desi community in Seattle and beyond.</p>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-5 py-12 md:px-10 md:py-16">
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[2rem] border border-amber-200 bg-amber-50 p-7 md:p-10"><p className="text-xs font-black uppercase tracking-[.2em] text-amber-700">Our vision</p><h2 className="mt-3 text-3xl font-black md:text-4xl">A community that thrives together</h2><p className="mt-5 text-lg leading-8 text-slate-700">To be the leading platform that celebrates and fosters cultural integration, empowering the Desi community in Seattle to thrive while sharing its diverse heritage with the world.</p></article>
        <article className="rounded-[2rem] bg-pink-700 p-7 text-white shadow-xl md:p-10"><p className="text-xs font-black uppercase tracking-[.2em] text-pink-200">Our mission</p><h2 className="mt-3 text-3xl font-black md:text-4xl">Elevating culture, talent and voices</h2><p className="mt-5 text-lg leading-8 text-pink-50">Through engaging and impactful programming, we highlight the richness of Indian heritage while addressing community needs and aspirations. We create a dynamic platform for storytelling, cultural expression, and meaningful dialogue—empowering individuals and organizations to share their contributions, celebrate diversity, and build lasting connections.</p></article>
      </div>

      <section className="mt-14"><div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.2em] text-pink-700">Diverse content</p><h2 className="mt-3 text-4xl font-black md:text-5xl">Programming with purpose</h2><p className="mt-4 text-lg leading-8 text-slate-600">From live community celebrations to intimate stories, our programming informs, entertains, connects, and gives back.</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{programs.map((program, index) => <article key={program.title} className={`rounded-3xl border p-6 ${index === 0 ? "border-pink-200 bg-pink-50" : "border-slate-200 bg-white"}`}><span className="text-sm font-black text-pink-600">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-3 text-xl font-black">{program.title}</h3><p className="mt-2 leading-7 text-slate-600">{program.description}</p></article>)}</div></section>

      <section className="mt-14 overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white md:p-12"><div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]"><div><p className="text-xs font-black uppercase tracking-[.2em] text-pink-300">Be part of the story</p><h2 className="mt-3 text-3xl font-black md:text-4xl">Connect, contribute, and celebrate with SDTV.</h2><p className="mt-4 max-w-3xl leading-7 text-slate-300">Share a story, submit a community event, volunteer, sponsor our work, or invite Seattle Desi TV to cover an initiative.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><Link href="/submit-content" className="rounded-xl bg-pink-600 px-6 py-4 text-center font-black">Submit content</Link><Link href="/events?add=1" className="rounded-xl border border-white/20 px-6 py-4 text-center font-black">Add an event</Link></div></div></section>
    </section>
    <SiteFooter />
  </main>;
}

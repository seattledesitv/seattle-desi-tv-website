import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import InstagramReelEmbed from "../components/InstagramReelEmbed";

const featuredReelUrl = process.env.NEXT_PUBLIC_FEATURED_INSTAGRAM_REEL_URL || "https://www.instagram.com/seattledesitv/";

export default function LatestReelPage() {
  return (
    <main className="min-h-screen bg-[#050b18] text-white">
      <SiteHeader />
      <section className="relative overflow-hidden px-6 py-12 md:px-10 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(236,72,153,.24),transparent_24rem),radial-gradient(circle_at_86%_20%,rgba(255,210,100,.10),transparent_18rem)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">Latest Instagram Reel</p>
            <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">Fresh from Seattle Desi TV</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Feature the newest SDTV interview, event highlight, sponsor spotlight, or community moment directly from Instagram.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="https://www.instagram.com/seattledesitv/" target="_blank" rel="noreferrer" className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white hover:bg-pink-500">
                Follow @SeattleDesiTV
              </a>
              <a href="/" className="rounded-xl border border-white/30 px-5 py-3 font-black text-white hover:bg-white/10">
                Back to Home
              </a>
            </div>
          </div>
          <InstagramReelEmbed reelUrl={featuredReelUrl} caption="Update NEXT_PUBLIC_FEATURED_INSTAGRAM_REEL_URL in Vercel to feature a specific public reel." />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

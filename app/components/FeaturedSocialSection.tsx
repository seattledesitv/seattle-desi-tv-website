"use client";

import InstagramReelEmbed from "./InstagramReelEmbed";

export type FeaturedSocialItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  platform?: string | null;
  content_type?: string | null;
  content_url: string;
  thumbnail_url?: string | null;
  button_text?: string | null;
  display_order?: number | null;
};

function platformLabel(value?: string | null) {
  const platform = String(value || "instagram").toLowerCase();
  if (platform === "youtube") return "YouTube";
  if (platform === "facebook") return "Facebook";
  if (platform === "threads") return "Threads";
  if (platform === "website") return "Website";
  return "Instagram";
}

function isInstagram(url: string, platform?: string | null) {
  return String(platform || "").toLowerCase() === "instagram" || url.includes("instagram.com");
}

function isYouTube(url: string, platform?: string | null) {
  return String(platform || "").toLowerCase() === "youtube" || url.includes("youtube.com") || url.includes("youtu.be");
}

export default function FeaturedSocialSection({ items, title, subtitle }: { items: FeaturedSocialItem[]; title: string; subtitle: string }) {
  if (!items.length) return null;
  const lead = items[0];
  const secondary = items.slice(1, 4);

  return (
    <section key="featured_social" id="featured-social" className="relative overflow-hidden bg-[#050b18] px-6 py-10 text-white md:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(236,72,153,.20),transparent_22rem),radial-gradient(circle_at_88%_18%,rgba(255,210,100,.10),transparent_18rem)]" />
      <div className="relative mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 shadow-2xl shadow-black/30 backdrop-blur md:p-10">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-pink-300">Social Highlights</p>
            <h2 className="mt-1 text-3xl font-black md:text-4xl">{title}</h2>
            <p className="mt-2 max-w-3xl text-slate-300">{subtitle}</p>
          </div>
          <a href="https://www.instagram.com/seattledesitv/" target="_blank" rel="noreferrer" className="text-sm font-black text-pink-300">Follow @SeattleDesiTV →</a>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            {isInstagram(lead.content_url, lead.platform) ? (
              <InstagramReelEmbed reelUrl={lead.content_url} caption={lead.subtitle || lead.title} />
            ) : (
              <a href={lead.content_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/80">
                <div className="grid aspect-video place-items-center bg-white/5">
                  {lead.thumbnail_url ? <img src={lead.thumbnail_url} alt={lead.title} className="h-full w-full object-cover" /> : <span className="text-pink-300 font-black">{platformLabel(lead.platform)}</span>}
                </div>
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-pink-300">{platformLabel(lead.platform)}</p>
                  <h3 className="mt-2 text-2xl font-black">{lead.title}</h3>
                  {lead.subtitle && <p className="mt-2 text-sm text-slate-300">{lead.subtitle}</p>}
                </div>
              </a>
            )}
          </div>

          <div className="grid gap-4 content-start">
            {secondary.map((item) => (
              <a key={item.id} href={item.content_url} target="_blank" rel="noreferrer" className="group grid grid-cols-[96px_1fr] gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3 transition hover:bg-slate-900">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-white/5">
                  {item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover transition group-hover:scale-105" /> : <span className="text-xs font-black text-pink-300">{platformLabel(item.platform)}</span>}
                </div>
                <div className="py-1">
                  <p className="text-[10px] font-black uppercase tracking-wide text-pink-300">{platformLabel(item.platform)} · {item.content_type || "highlight"}</p>
                  <h3 className="mt-1 line-clamp-2 font-black">{item.title}</h3>
                  {item.subtitle && <p className="mt-1 line-clamp-2 text-sm text-slate-300">{item.subtitle}</p>}
                  <p className="mt-2 text-xs font-black text-white/80">{item.button_text || (isYouTube(item.content_url, item.platform) ? "Watch Now" : "View Post")} →</p>
                </div>
              </a>
            ))}
            {secondary.length === 0 && <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-6 text-slate-300">Add more featured social items in Studio to show a carousel-style list here.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

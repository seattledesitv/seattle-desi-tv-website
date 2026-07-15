"use client";

export type HeroLayoutStyle = "image_focus" | "classic" | "premium" | "cinematic" | "split_right" | "split_left" | "spotlight" | "minimal";

function getImage(item: any) {
  if (item?.image_url) return item.image_url;
  if (Array.isArray(item?.image_urls) && item.image_urls.length) return item.image_urls[0];
  return item?.image || "/hero-sdtv.png";
}

export default function HeroPreview({ layout, item }: { layout: HeroLayoutStyle; item: any }) {
  const image = getImage(item);
  const title = item?.title || item?.festival_name || "Seattle Desi TV";
  const subtitle = item?.subtitle || [item?.date, item?.location].filter(Boolean).join(" · ") || "Community stories, events, culture, interviews, radio, and media coverage across the Pacific Northwest.";
  const reverse = layout === "split_left";
  const split = layout === "split_left" || layout === "split_right" || layout === "classic" || layout === "premium";

  if (layout === "cinematic" || layout === "spotlight" || layout === "minimal" || layout === "image_focus") {
    return <div className="relative min-h-[360px] overflow-hidden rounded-3xl bg-slate-950 text-white">
      <img src={image} alt="Hero preview" className={`absolute inset-0 h-full w-full ${layout === "image_focus" ? "object-contain bg-black" : "object-cover"}`} />
      <div className={`absolute inset-0 ${layout === "image_focus" ? "bg-gradient-to-r from-black/80 via-black/35 to-black/15" : layout === "spotlight" ? "bg-[radial-gradient(circle_at_center,transparent_5%,rgba(2,6,23,.88)_78%)]" : "bg-gradient-to-t from-black/90 via-black/30 to-black/10"}`} />
      <div className={`relative z-10 flex min-h-[360px] p-7 sm:p-10 ${layout === "cinematic" || layout === "spotlight" ? "items-center justify-center text-center" : layout === "minimal" ? "items-end" : "items-center"}`}>
        <div className={layout === "minimal" ? "max-w-xl rounded-2xl border border-white/20 bg-black/55 p-5 backdrop-blur" : "max-w-2xl"}>
          <span className="inline-flex rounded-full bg-pink-600 px-3 py-1 text-xs font-black uppercase tracking-wide">Live Preview</span>
          <h3 className="mt-4 text-3xl font-black sm:text-5xl">{title}</h3>
          <p className="mt-3 text-sm text-slate-200 sm:text-lg">{subtitle}</p>
          <button className="mt-5 rounded-xl bg-white px-5 py-3 font-black text-slate-950">Learn More</button>
        </div>
      </div>
    </div>;
  }

  if (split) {
    return <div className="grid min-h-[360px] overflow-hidden rounded-3xl bg-slate-950 text-white lg:grid-cols-2">
      <div className={`flex items-center p-7 sm:p-10 ${reverse ? "lg:order-2" : ""}`}>
        <div><span className="inline-flex rounded-full bg-pink-600 px-3 py-1 text-xs font-black uppercase tracking-wide">Live Preview</span><h3 className="mt-4 text-3xl font-black sm:text-5xl">{title}</h3><p className="mt-3 text-slate-300">{subtitle}</p><button className="mt-5 rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Learn More</button></div>
      </div>
      <div className={`relative min-h-[300px] bg-black ${reverse ? "lg:order-1" : ""} ${layout === "premium" ? "m-5 overflow-hidden rounded-2xl border border-white/20 shadow-2xl" : ""}`}><img src={image} alt="Hero preview" className="absolute inset-0 h-full w-full object-contain" /></div>
    </div>;
  }

  return null;
}

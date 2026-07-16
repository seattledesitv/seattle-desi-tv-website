"use client";

export type HeroLayoutStyle = "image_focus" | "classic" | "premium" | "cinematic" | "split_right" | "split_left" | "spotlight" | "minimal";

function getImage(item: any) {
  if (item?.image_url) return item.image_url;
  if (Array.isArray(item?.image_urls) && item.image_urls.length) return item.image_urls[0];
  return item?.image || "/hero-sdtv.png";
}

function PreviewImage({ src, title, className }: { src: string; title: string; className: string }) {
  return <img src={src} alt={title || "Hero preview"} className={className} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/hero-sdtv.png"; }} />;
}

export default function HeroPreview({ layout, item }: { layout: HeroLayoutStyle; item: any }) {
  const image = getImage(item);
  const title = item?.title || item?.festival_name || "Seattle Desi TV";
  const subtitle = item?.subtitle || [item?.date, item?.location].filter(Boolean).join(" · ") || "Community stories, events, culture, interviews, radio, and media coverage across the Pacific Northwest.";
  const reverse = layout === "split_left";
  const split = layout === "split_left" || layout === "split_right" || layout === "classic" || layout === "premium";

  if (layout === "cinematic" || layout === "spotlight" || layout === "minimal" || layout === "image_focus") {
    return <div className="relative min-h-[330px] overflow-hidden rounded-2xl bg-slate-950 text-white sm:min-h-[360px] sm:rounded-3xl">
      <PreviewImage src={image} title={title} className={`absolute inset-0 h-full w-full ${layout === "image_focus" ? "bg-black object-contain" : "object-cover"}`} />
      <div className={`absolute inset-0 ${layout === "image_focus" ? "bg-gradient-to-r from-black/85 via-black/45 to-black/20" : layout === "spotlight" ? "bg-[radial-gradient(circle_at_center,transparent_5%,rgba(2,6,23,.9)_78%)]" : "bg-gradient-to-t from-black/90 via-black/35 to-black/10"}`} />
      <div className={`relative z-10 flex min-h-[330px] p-5 sm:min-h-[360px] sm:p-10 ${layout === "cinematic" || layout === "spotlight" ? "items-center justify-center text-center" : layout === "minimal" ? "items-end" : "items-center"}`}>
        <div className={layout === "minimal" ? "max-w-xl rounded-2xl border border-white/20 bg-black/60 p-4 backdrop-blur sm:p-5" : "max-w-2xl"}>
          <span className="inline-flex rounded-full bg-pink-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide sm:text-xs">Live Preview</span>
          <h3 className="mt-3 line-clamp-3 break-words text-2xl font-black leading-tight sm:mt-4 sm:text-5xl">{title}</h3>
          <p className="mt-3 line-clamp-3 break-words text-sm text-slate-200 sm:text-lg">{subtitle}</p>
          <button className="mt-4 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 sm:mt-5 sm:px-5 sm:py-3">Learn More</button>
        </div>
      </div>
    </div>;
  }

  if (split) {
    return <div className="grid min-h-[360px] overflow-hidden rounded-2xl bg-slate-950 text-white sm:rounded-3xl lg:grid-cols-2">
      <div className={`flex items-center p-5 sm:p-8 lg:p-10 ${reverse ? "lg:order-2" : ""}`}>
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-pink-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide sm:text-xs">Live Preview</span>
          <h3 className="mt-3 line-clamp-3 break-words text-2xl font-black leading-tight sm:mt-4 sm:text-5xl">{title}</h3>
          <p className="mt-3 line-clamp-3 break-words text-sm text-slate-300 sm:text-base">{subtitle}</p>
          <button className="mt-4 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-black text-white sm:mt-5 sm:px-5 sm:py-3">Learn More</button>
        </div>
      </div>
      <div className={`relative min-h-[260px] bg-black sm:min-h-[300px] ${reverse ? "lg:order-1" : ""} ${layout === "premium" ? "m-3 overflow-hidden rounded-2xl border border-white/20 shadow-2xl sm:m-5" : ""}`}>
        <PreviewImage src={image} title={title} className="absolute inset-0 h-full w-full object-contain" />
      </div>
    </div>;
  }

  return null;
}

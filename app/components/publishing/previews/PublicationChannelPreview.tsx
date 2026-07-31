import SafeImage from "../../SafeImage";
import type { PublicationPreviewChannel, PublicationPreviewModel } from "../../../lib/publishing/preview/types";

export default function PublicationChannelPreview({ model, channel }: { model: PublicationPreviewModel; channel: PublicationPreviewChannel }) {
  const social = channel === "instagram" || channel === "facebook" || channel === "linkedin";
  const frame = channel === "mobile" ? "mx-auto max-w-sm" : social ? "mx-auto max-w-xl" : channel === "newsletter" ? "mx-auto max-w-3xl" : "w-full";
  const cover = model.sections.find((section) => section.section_key === "cover");
  const coverItem = cover?.items.find((item) => item.featured && item.image_url) || cover?.items.find((item) => item.image_url);
  const heroImage = model.publication.cover_image_url || coverItem?.image_url;

  return <article className={`publication-print-root overflow-hidden rounded-3xl bg-white text-slate-950 shadow-xl ${frame}`}>
    <header className={`publication-cover ${social ? "aspect-square" : channel === "website" ? "min-h-64" : "min-h-80"} relative flex flex-col justify-end overflow-hidden bg-gradient-to-br from-slate-950 via-pink-950 to-pink-600 p-6 text-white`}>
      {heroImage && <SafeImage src={heroImage} alt={coverItem?.title || model.publication.name} className="absolute inset-0 h-full w-full object-cover" widthHint={1400} enableFullPreview={false} />}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/15" />
      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-pink-200">Seattle Desi TV · {channel}</p>
        <h1 className={`${social ? "text-4xl" : "text-3xl md:text-5xl"} mt-3 font-black`}>{model.publication.name}</h1>
        {model.publication.edition_label && <p className="mt-2 text-lg font-bold text-pink-100">{model.publication.edition_label}</p>}
        {model.publication.description && <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">{model.publication.description}</p>}
      </div>
    </header>
    {!social && <div className={`publication-body ${channel === "mobile" ? "p-4" : channel === "website" ? "p-5 md:p-6" : "p-6 md:p-8"} grid ${channel === "website" ? "gap-5" : "gap-7"}`}>
      {model.sections.filter((section) => section.section_key !== "cover").map((section) => {
        const statistics = section.section_key === "statistics";
        const actions = section.section_key === "get_involved";
        if (actions) return <section key={section.id} className="publication-section publication-get-involved relative break-inside-avoid overflow-hidden rounded-3xl bg-slate-950 p-7 text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 via-transparent to-pink-400/10" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div><p className="text-sm font-black uppercase tracking-wide text-pink-300">Join Seattle Desi TV</p><h2 className="mt-2 text-3xl font-black md:text-5xl">{section.title}</h2>{section.introduction && <p className="mt-4 text-lg leading-7 text-slate-300">{section.introduction}</p>}</div>
            <div className="grid gap-3 sm:grid-cols-2">{section.items.map((item, index) => <a key={item.id} href={item.destination_url || "#"} className={`publication-action rounded-xl border px-5 py-4 text-center font-black transition hover:-translate-y-0.5 ${index === 0 ? "border-pink-600 bg-pink-600 text-white hover:bg-pink-500" : index === 1 ? "border-white bg-white text-slate-950 hover:bg-slate-100" : "border-white/20 bg-white/10 text-white hover:bg-white/20"}`}>{item.title || "Get involved"}</a>)}</div>
          </div>
        </section>;
        return <section key={section.id} className="publication-section break-inside-avoid">
          <h2 className="border-b-2 border-pink-500 pb-2 text-2xl font-black">{section.title}</h2>
          {section.introduction && <p className={`mt-3 leading-7 ${actions ? "text-slate-300" : "text-slate-600"}`}>{section.introduction}</p>}
          <div className={`publication-item-grid mt-4 grid gap-4 ${channel !== "mobile" ? statistics ? "sm:grid-cols-3" : channel === "website" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2" : ""}`}>
            {section.items.map((item) => {
              const metadata = item.generated_content?.metadata;
              const platform = metadata && typeof metadata === "object" && "platform" in metadata ? String(metadata.platform || "") : "";
              const body = <>
                {item.image_url && <SafeImage src={item.image_url} alt={item.title || "Publication item"} className={`${channel === "website" ? "h-32" : "h-40"} w-full object-cover`} widthHint={channel === "website" ? 500 : 700} enableFullPreview={false} />}
                <div className={channel === "website" ? "p-3.5" : "p-4"}>
                  <div className="flex flex-wrap gap-2">{platform && <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase text-white">{platform}</span>}{item.featured && !statistics && <span className="rounded-full bg-pink-50 px-2 py-1 text-[10px] font-black uppercase text-pink-600">Featured</span>}</div>
                  <h3 className={`${statistics ? "text-2xl text-pink-600" : channel === "website" ? "text-base" : "text-lg"} mt-1 font-black`}>{item.title || "Untitled"}</h3>
                  {item.description && <p className={`mt-2 text-sm text-slate-600 ${channel === "website" ? "line-clamp-3 leading-5" : "leading-6"}`}>{item.description}</p>}
                </div>
              </>;
              const classes = "publication-item break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white";
              return item.destination_url ? <a key={item.id} href={item.destination_url} className={classes}>{body}</a> : <div key={item.id} className={classes}>{body}</div>;
            })}
          </div>
        </section>;
      })}
    </div>}
    {social && <div className="p-6"><p className="font-black">In this edition</p><div className="mt-3 flex flex-wrap gap-2">{model.sections.slice(0, 6).map((section) => <span key={section.id} className="rounded-full bg-pink-50 px-3 py-1 text-sm font-bold text-pink-700">{section.title}</span>)}</div><p className="mt-5 text-sm text-slate-500">Follow @seattledesitv for community stories and updates.</p></div>}
    <footer className="bg-slate-100 px-6 py-4 text-center text-xs font-bold text-slate-500">Seattle Desi TV · Community Media Platform</footer>
  </article>;
}

import SafeImage from "../../SafeImage";
import type { PublicationPreviewChannel, PublicationPreviewModel } from "../../../lib/publishing/preview/types";

export default function PublicationChannelPreview({ model, channel }: { model: PublicationPreviewModel; channel: PublicationPreviewChannel }) {
  const social = channel === "instagram" || channel === "facebook" || channel === "linkedin";
  const frame = channel === "mobile" ? "mx-auto max-w-sm" : social ? "mx-auto max-w-xl" : channel === "newsletter" ? "mx-auto max-w-3xl" : "w-full";
  const cover = model.sections.find((section) => section.section_key === "cover");
  const coverItem = cover?.items.find((item) => item.featured && item.image_url) || cover?.items.find((item) => item.image_url);
  const heroImage = model.publication.cover_image_url || coverItem?.image_url;

  return <article className={`publication-print-root overflow-hidden rounded-3xl bg-white text-slate-950 shadow-xl ${frame}`}>
    <header className={`${social ? "aspect-square" : "min-h-80"} relative flex flex-col justify-end overflow-hidden bg-gradient-to-br from-slate-950 via-pink-950 to-pink-600 p-7 text-white`}>
      {heroImage && <SafeImage src={heroImage} alt={coverItem?.title || model.publication.name} className="absolute inset-0 h-full w-full object-cover" widthHint={1400} enableFullPreview={false} />}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/15" />
      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-pink-200">Seattle Desi TV · {channel}</p>
        <h1 className={`${social ? "text-4xl" : "text-3xl md:text-5xl"} mt-3 font-black`}>{model.publication.name}</h1>
        {model.publication.edition_label && <p className="mt-2 text-lg font-bold text-pink-100">{model.publication.edition_label}</p>}
        {model.publication.description && <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">{model.publication.description}</p>}
      </div>
    </header>
    {!social && <div className={`${channel === "mobile" ? "p-4" : "p-6 md:p-8"} grid gap-7`}>
      {model.sections.filter((section) => section.section_key !== "cover").map((section) => {
        const statistics = section.section_key === "statistics";
        const actions = section.section_key === "get_involved";
        return <section key={section.id} className={`break-inside-avoid ${actions ? "rounded-3xl bg-slate-950 p-6 text-white" : ""}`}>
          <h2 className="border-b-2 border-pink-500 pb-2 text-2xl font-black">{section.title}</h2>
          {section.introduction && <p className={`mt-3 leading-7 ${actions ? "text-slate-300" : "text-slate-600"}`}>{section.introduction}</p>}
          <div className={`mt-4 grid gap-4 ${channel !== "mobile" ? statistics ? "sm:grid-cols-3" : "sm:grid-cols-2" : ""}`}>
            {section.items.map((item) => {
              const body = <>
                {item.image_url && <SafeImage src={item.image_url} alt={item.title || "Publication item"} className="h-40 w-full object-cover" widthHint={700} enableFullPreview={false} />}
                <div className="p-4">
                  {item.featured && !statistics && <span className="text-xs font-black uppercase text-pink-600">Featured</span>}
                  <h3 className={`${statistics ? "text-2xl text-pink-600" : "text-lg"} mt-1 font-black`}>{item.title || "Untitled"}</h3>
                  {item.description && <p className={`mt-2 text-sm leading-6 ${actions ? "text-slate-300" : "text-slate-600"}`}>{item.description}</p>}
                  {actions && item.destination_url && <span className="mt-3 inline-block font-black text-pink-300">Learn more →</span>}
                </div>
              </>;
              const classes = `break-inside-avoid overflow-hidden rounded-2xl border ${actions ? "border-white/15 bg-white/10" : "border-slate-200 bg-white"}`;
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

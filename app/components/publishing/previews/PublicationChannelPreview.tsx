import SafeImage from "../../SafeImage";
import type { PublicationPreviewChannel, PublicationPreviewModel } from "../../../lib/publishing/preview/types";

export default function PublicationChannelPreview({ model, channel }: { model: PublicationPreviewModel; channel: PublicationPreviewChannel }) {
  const social = channel === "instagram" || channel === "facebook" || channel === "linkedin";
  const frame = channel === "mobile" ? "mx-auto max-w-sm" : social ? "mx-auto max-w-xl" : channel === "newsletter" ? "mx-auto max-w-3xl" : "w-full";
  return <article className={`publication-print-root overflow-hidden rounded-3xl bg-white text-slate-950 shadow-xl ${frame}`}>
    <header className={`${social ? "aspect-square" : ""} flex flex-col justify-end bg-gradient-to-br from-slate-950 via-pink-950 to-pink-600 p-7 text-white`}>
      <p className="text-xs font-black uppercase tracking-[0.24em] text-pink-200">Seattle Desi TV · {channel}</p><h1 className={`${social ? "text-4xl" : "text-3xl md:text-5xl"} mt-3 font-black`}>{model.publication.name}</h1>{model.publication.edition_label && <p className="mt-2 text-lg font-bold text-pink-100">{model.publication.edition_label}</p>}{model.publication.description && <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">{model.publication.description}</p>}
    </header>
    {!social && <div className={`${channel === "mobile" ? "p-4" : "p-6 md:p-8"} grid gap-7`}>{model.sections.map((section) => <section key={section.id} className="break-inside-avoid"><h2 className="border-b-2 border-pink-500 pb-2 text-2xl font-black">{section.title}</h2>{section.introduction && <p className="mt-3 leading-7 text-slate-600">{section.introduction}</p>}<div className={`mt-4 grid gap-4 ${channel !== "mobile" ? "sm:grid-cols-2" : ""}`}>{section.items.map((item) => <div key={item.id} className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-200">{item.image_url && <SafeImage src={item.image_url} alt={item.title || "Publication item"} className="h-40 w-full object-cover" widthHint={700} enableFullPreview={false} />}<div className="p-4">{item.featured && <span className="text-xs font-black uppercase text-pink-600">Featured</span>}<h3 className="mt-1 text-lg font-black">{item.title || "Untitled"}</h3>{item.description && <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>}</div></div>)}</div></section>)}</div>}
    {social && <div className="p-6"><p className="font-black">In this edition</p><div className="mt-3 flex flex-wrap gap-2">{model.sections.slice(0, 6).map((section) => <span key={section.id} className="rounded-full bg-pink-50 px-3 py-1 text-sm font-bold text-pink-700">{section.title}</span>)}</div><p className="mt-5 text-sm text-slate-500">Follow @seattledesitv for community stories and updates.</p></div>}
    <footer className="bg-slate-100 px-6 py-4 text-center text-xs font-bold text-slate-500">Seattle Desi TV · Community Media Platform</footer>
  </article>;
}

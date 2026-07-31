import SafeImage from "../../SafeImage";
import type { PublicationItemRecord } from "../../../lib/publishing/repositories/publicationItemRepository";
import ItemStatusBadge from "./ItemStatusBadge";

export default function ItemPreview({ item }: { item: PublicationItemRecord }) {
  const included = item.inclusion_status === "included";
  return <article className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${included ? "border-slate-200" : "border-dashed border-slate-300 opacity-60"}`}>
    <SafeImage src={item.image_url} alt={item.title || "Publication item"} className="aspect-video w-full object-cover" fallbackClassName="grid aspect-video w-full place-items-center bg-slate-100 font-black text-slate-400" widthHint={900} />
    <div className="p-6">
      <div className="flex flex-wrap gap-2"><ItemStatusBadge status={included ? "included" : "excluded"} />{item.featured && <ItemStatusBadge status="featured" />}</div>
      <h2 className="mt-4 text-2xl font-black">{item.title || "Untitled item"}</h2>
      {item.description && <p className="mt-3 whitespace-pre-wrap text-slate-600">{item.description}</p>}
      {item.destination_url && <a href={item.destination_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex font-black text-pink-600">View destination →</a>}
    </div>
  </article>;
}

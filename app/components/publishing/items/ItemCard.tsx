"use client";

import SafeImage from "../../SafeImage";
import type { PublicationItemRecord } from "../../../lib/publishing/repositories/publicationItemRepository";
import ItemStatusBadge from "./ItemStatusBadge";

type Props = {
  item: PublicationItemRecord;
  selected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDrop: () => void;
};

export default function ItemCard({ item, selected, onSelect, onDragStart, onDrop }: Props) {
  const included = item.inclusion_status === "included";
  return <article
    draggable
    onDragStart={onDragStart}
    onDragOver={(event) => event.preventDefault()}
    onDrop={onDrop}
    className={`rounded-2xl border bg-white p-3 transition ${selected ? "border-pink-400 ring-2 ring-pink-100" : "border-slate-200 hover:border-slate-300"}`}
  >
    <button type="button" onClick={onSelect} className="flex w-full gap-3 text-left">
      <SafeImage src={item.image_url} alt="" fallbackLabel="No image" className="h-20 w-24 rounded-xl object-cover" fallbackClassName="grid h-20 w-24 shrink-0 place-items-center rounded-xl bg-slate-100 px-2 text-center text-xs font-bold text-slate-400" widthHint={240} enableFullPreview={false} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2"><span aria-hidden className="cursor-grab text-slate-300">⋮⋮</span><h3 className="line-clamp-2 font-black leading-snug">{item.title || "Untitled item"}</h3></div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ItemStatusBadge status={included ? "included" : "excluded"} />
          {item.featured && <ItemStatusBadge status="featured" />}
          {item.is_manually_edited && <ItemStatusBadge status="edited" />}
        </div>
      </div>
    </button>
  </article>;
}

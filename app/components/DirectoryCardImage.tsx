"use client";

import { useEffect, useState } from "react";
import SafeImage from "./SafeImage";

type Props = {
  src?: string | null;
  alt: string;
  positionX?: number | null;
  positionY?: number | null;
  zoom?: number | null;
  badge?: React.ReactNode;
  heightClass?: string;
};

export default function DirectoryCardImage({ src, alt, positionX = 50, positionY = 50, zoom = 1, badge, heightClass = "h-56" }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  if (!src) return <div className={`relative grid ${heightClass} place-items-center overflow-hidden bg-pink-50 font-black text-pink-600`}>Seattle Desi TV{badge}</div>;

  return <>
    <button type="button" onClick={() => setOpen(true)} className={`group relative block w-full overflow-hidden bg-slate-100 text-left ${heightClass}`} aria-label={`View full image for ${alt}`}>
      <SafeImage src={src} alt={alt} className="h-full w-full object-cover transition duration-300 group-hover:brightness-75" fallbackClassName={`grid ${heightClass} w-full place-items-center bg-pink-50 font-black text-pink-600`} fallbackLabel="Seattle Desi TV" widthHint={900} style={{ objectPosition: `${Number(positionX ?? 50)}% ${Number(positionY ?? 50)}%`, transform: `scale(${Number(zoom ?? 1)})` }} />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-slate-950/80 px-4 py-3 text-center text-sm font-black text-white transition group-hover:translate-y-0 group-focus:translate-y-0">View full image</span>
      {badge}
    </button>
    {open && <div role="dialog" aria-modal="true" aria-label={`Full image for ${alt}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }} className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/90 p-4 md:p-10">
      <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 font-black text-slate-950">Close ×</button>
      <img src={src} alt={alt} className="max-h-[90vh] max-w-[95vw] rounded-2xl bg-white object-contain shadow-2xl" />
    </div>}
  </>;
}

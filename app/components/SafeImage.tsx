"use client";

import { useEffect, useMemo, useState } from "react";

const previewableClasses = /object-cover/;

type SafeImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  sizes?: string;
  widthHint?: number;
  objectPosition?: string;
  zoom?: number;
  enableFullPreview?: boolean;
};

export function optimizedImageUrl(src?: string | null, widthHint = 1200) {
  const cleanSrc = typeof src === "string" ? src.trim() : "";
  if (!cleanSrc) return "";
  if (!cleanSrc.includes("res.cloudinary.com") || !cleanSrc.includes("/image/upload/")) return cleanSrc;
  if (cleanSrc.includes("f_auto") || cleanSrc.includes("q_auto")) return cleanSrc;
  const width = Math.max(160, Math.min(Number(widthHint || 1200), 1800));
  const transform = "f_auto,q_auto,c_limit,w_" + width;
  return cleanSrc.replace("/image/upload/", "/image/upload/" + transform + "/");
}

export default function SafeImage({
  src,
  alt,
  className = "",
  fallbackClassName = "",
  fallbackLabel = "Seattle Desi TV",
  loading = "lazy",
  fetchPriority = "auto",
  sizes,
  widthHint = 1200,
  objectPosition = "50% 50%",
  zoom = 1,
  enableFullPreview,
}: SafeImageProps) {
  const cleanSrc = useMemo(() => optimizedImageUrl(src, widthHint), [src, widthHint]);
  const fullSrc = useMemo(() => optimizedImageUrl(src, 1800), [src]);
  const [failed, setFailed] = useState(!cleanSrc);
  const [open, setOpen] = useState(false);
  const previewEnabled = enableFullPreview ?? previewableClasses.test(className);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = oldOverflow; };
  }, [open]);

  if (failed) {
    return (
      <div role="img" aria-label={alt || fallbackLabel} className={fallbackClassName || `bg-pink-50 text-pink-600 grid place-items-center font-black text-center ${className}`}>
        {fallbackLabel}
      </div>
    );
  }

  const image = <img src={cleanSrc} alt={alt} className={className} loading={loading} decoding="async" fetchPriority={fetchPriority} sizes={sizes} style={{ objectPosition, transform: `scale(${Math.max(1, Number(zoom || 1))})` }} onError={() => setFailed(true)} />;

  if (!previewEnabled) return image;

  return <>
    <button type="button" onClick={() => setOpen(true)} className="group relative block w-full overflow-hidden text-left" aria-label={`View full image for ${alt}`}>
      {image}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-slate-950/80 px-3 py-2 text-center text-xs font-black text-white transition group-hover:translate-y-0 group-focus:translate-y-0">View full image</span>
    </button>
    {open && <div role="dialog" aria-modal="true" aria-label={`Full image for ${alt}`} className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/90 p-4" onClick={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">Close ×</button>
      <div className="flex max-h-[92vh] max-w-[94vw] items-center justify-center rounded-2xl bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <img src={fullSrc || cleanSrc} alt={alt} className="max-h-[86vh] max-w-[90vw] object-contain" />
      </div>
    </div>}
  </>;
}

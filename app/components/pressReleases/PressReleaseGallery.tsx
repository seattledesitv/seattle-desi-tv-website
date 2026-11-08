"use client";
/* eslint-disable @next/next/no-img-element -- press release galleries use user-uploaded image URLs */
import { useEffect, useId, useRef, useState } from "react";

export default function PressReleaseGallery({ images, title, siteName }: { images: string[]; title: string; siteName: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const thumbnails = useRef<(HTMLButtonElement | null)[]>([]);
  const headingId = useId();
  const open = selected !== null && images.length > 0;
  const index = Math.max(0, Math.min(selected ?? 0, images.length - 1));

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
    };
  }, [open]);

  useEffect(() => {
    if (open) thumbnails.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [open, index]);

  function move(offset: number) {
    setSelected((current) => ((current ?? 0) + offset + images.length) % images.length);
  }
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">Release Images</h2>
        {images.length > 0 && <span className="text-sm font-bold text-slate-500">{images.length} {images.length === 1 ? "photo" : "photos"}</span>}
      </div>
      {images.length ? <>
        <p className="mt-3 text-sm leading-6 text-slate-500">Select a photo to open the gallery and browse all images.</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {images.slice(0, 6).map((url, photo) => (
            <button key={`${url}-${photo}`} type="button" aria-label={`View image ${photo + 1} of ${images.length}`} onClick={() => setSelected(photo)} className="overflow-hidden rounded-xl border-2 border-transparent focus-visible:border-pink-600">
              <img src={url} alt={`${title} — image ${photo + 1}`} loading="lazy" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSelected(0)} className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 font-black text-white">{images.length === 1 ? "View image" : `View all ${images.length} images`}</button>
      </> : <div className="mt-4 rounded-2xl bg-slate-950 p-8 text-center font-black text-white">{siteName}<br />Press Release</div>}
      <dialog ref={dialog} aria-labelledby={headingId} onClose={() => setSelected(null)}
        onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            const controls = dialog.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
            const first = controls?.[0];
            const last = controls?.[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
          if (images.length < 2) return;
          if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
          if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
          if (event.key === "Home") { event.preventDefault(); setSelected(0); }
          if (event.key === "End") { event.preventDefault(); setSelected(images.length - 1); }
        }}
        className="fixed inset-0 m-auto max-w-6xl overflow-hidden rounded-2xl bg-slate-950 p-0 text-white shadow-2xl backdrop:bg-slate-950/90"
        style={{ width: "min(1152px, calc(100vw - 2rem))", maxHeight: "calc(100dvh - 2rem)" }}>
        {open && <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/15 px-4 py-3">
            <h2 id={headingId} className="min-w-0 truncate font-bold">{title} — image gallery</h2>
            <button type="button" autoFocus onClick={() => setSelected(null)} aria-label="Close image gallery" className="shrink-0 rounded-lg bg-white/10 px-4 py-2 font-bold hover:bg-white/20">Close ✕</button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-2" style={{ height: "min(60dvh, 650px)" }}>
            <img src={images[index]} alt={`${title} — image ${index + 1} of ${images.length}`} className="h-full w-full object-contain" />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
            <button type="button" disabled={images.length < 2} onClick={() => move(-1)} className="rounded-xl bg-white/10 px-4 py-3 font-bold hover:bg-white/20 disabled:opacity-40" aria-label="Previous image">← Previous</button>
            <p role="status" aria-live="polite" aria-atomic="true" className="text-center font-bold">{index + 1} / {images.length}</p>
            <button type="button" disabled={images.length < 2} onClick={() => move(1)} className="rounded-xl bg-white/10 px-4 py-3 font-bold hover:bg-white/20 disabled:opacity-40" aria-label="Next image">Next →</button>
          </div>
          <div role="group" aria-label="Choose gallery image" className="flex shrink-0 gap-2 overflow-x-auto border-t border-white/15 p-3">
            {images.map((url, photo) => (
              <button key={`${url}-${photo}`} ref={(element) => { thumbnails.current[photo] = element; }} type="button" aria-label={`Go to image ${photo + 1}`} aria-current={index === photo ? "true" : undefined} onClick={() => setSelected(photo)} className={`h-14 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${index === photo ? "border-pink-400" : "border-transparent opacity-60"}`}>
                <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>}
      </dialog>
    </div>
  );
}

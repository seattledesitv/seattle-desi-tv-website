"use client";
/* eslint-disable @next/next/no-img-element -- press release galleries use user-uploaded image URLs */
import { useEffect, useId, useRef, useState } from "react";

export default function PressReleaseGallery({ images, title, siteName }: { images: string[]; title: string; siteName: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
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
        className="fixed inset-0 m-auto overflow-hidden rounded-xl border-0 bg-black p-0 text-white shadow-2xl backdrop:bg-slate-950/90"
        style={{ width: "min(1600px, 96vw)", height: "92dvh", maxHeight: "92dvh", maxWidth: "96vw" }}>
        {open && <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <h2 id={headingId} className="sr-only">{title} — image gallery</h2>
          <img src={images[index]} alt={`${title} — image ${index + 1} of ${images.length}`}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
          <p role="status" aria-live="polite" aria-atomic="true" className="absolute left-3 top-3 z-20 rounded-lg bg-black/70 px-3 py-2 font-bold">{index + 1} / {images.length}</p>
          <button type="button" autoFocus onClick={() => setSelected(null)} aria-label="Close image gallery"
            className="absolute right-3 top-3 z-20 rounded-lg bg-black/70 px-4 py-3 font-bold hover:bg-black/90">Close ✕</button>
          <button type="button" disabled={images.length < 2} onClick={() => move(-1)} aria-label="Previous image"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-xl bg-black/70 px-4 py-5 text-3xl font-bold hover:bg-black/90 disabled:opacity-30">‹</button>
          <button type="button" disabled={images.length < 2} onClick={() => move(1)} aria-label="Next image"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-xl bg-black/70 px-4 py-5 text-3xl font-bold hover:bg-black/90 disabled:opacity-30">›</button>
        </div>}
      </dialog>
    </div>
  );
}

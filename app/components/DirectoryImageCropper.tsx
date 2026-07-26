"use client";

import { useEffect, useRef, useState } from "react";

export type DirectoryImageMode = "cover" | "contain" | "blur";
export type DirectoryImageCrop = { x: number; y: number; zoom: number; mode: DirectoryImageMode };

type Props = {
  src?: string | null;
  value: DirectoryImageCrop;
  onChange: (value: DirectoryImageCrop) => void;
  onFileChange?: (file: File | null) => void;
  label?: string;
};

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

export default function DirectoryImageCropper({ src, value, onChange, onFileChange, label = "Directory image" }: Props) {
  const [preview, setPreview] = useState(src || "");
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);

  useEffect(() => { setPreview(src || ""); }, [src]);

  function chooseFile(file: File | null) {
    onFileChange?.(file);
    if (!file) { setPreview(src || ""); return; }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onChange({ x: 50, y: 50, zoom: 1, mode: value.mode || "cover" });
  }

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!preview || value.mode !== "cover") return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: value.x, y: value.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current; const frame = frameRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !frame) return;
    const rect = frame.getBoundingClientRect();
    const nextX = clamp(drag.x - ((event.clientX - drag.startX) / Math.max(rect.width, 1)) * 100, 0, 100);
    const nextY = clamp(drag.y - ((event.clientY - drag.startY) / Math.max(rect.height, 1)) * 100, 0, 100);
    onChange({ ...value, x: Math.round(nextX), y: Math.round(nextY) });
  }
  function pointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  const mode = value.mode || "cover";
  const foregroundClass = mode === "cover" ? "h-full w-full object-cover" : "relative z-10 h-full w-full object-contain p-4";
  const foregroundStyle = mode === "cover" ? { objectPosition: `${value.x}% ${value.y}%`, transform: `scale(${value.zoom})` } : undefined;

  return <section className="rounded-2xl border bg-slate-50 p-4">
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_260px]">
      <div>
        <label className="block text-sm font-black text-slate-800">{label}
          <input type="file" accept="image/*" className="mt-2 w-full rounded-xl border bg-white p-3 font-normal" onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
        </label>
        <div className="mt-4">
          <p className="text-sm font-black text-slate-800">How should this image appear?</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {([
              ["cover", "Fill frame", "Best for photos. Drag to choose the visible area."],
              ["contain", "Show full image", "Best for logos and flyers. Nothing is cropped."],
              ["blur", "Full image + soft background", "Shows the full image with a blurred fill behind it."],
            ] as const).map(([id, title, help]) => <button key={id} type="button" onClick={() => onChange({ ...value, mode: id, x: id === "cover" ? value.x : 50, y: id === "cover" ? value.y : 50, zoom: id === "cover" ? value.zoom : 1 })} className={`rounded-xl border p-3 text-left ${mode === id ? "border-pink-500 bg-pink-50 ring-2 ring-pink-100" : "bg-white"}`}><span className="block text-sm font-black text-slate-900">{title}</span><span className="mt-1 block text-xs text-slate-500">{help}</span></button>)}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{mode === "cover" ? "Drag the image to choose what remains visible. Use zoom only when needed." : "The complete image will remain visible inside the same fixed-size directory card."}</p>
        <div ref={frameRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} className={`relative mt-4 aspect-[16/9] touch-none overflow-hidden rounded-2xl border-2 border-dashed border-pink-300 bg-white select-none ${mode === "cover" ? "cursor-move" : "cursor-default"}`}>
          {preview ? <>{mode === "blur" && <img src={preview} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-55" />}<img src={preview} alt="Public directory card preview" draggable={false} className={foregroundClass} style={foregroundStyle} /></> : <div className="grid h-full place-items-center px-6 text-center font-black text-slate-400">Choose an image to preview the directory card</div>}
          {mode === "cover" && <div className="pointer-events-none absolute inset-4 rounded-xl border border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.10)]" />}
        </div>
        {mode === "cover" && <><label className="mt-4 block text-sm font-black text-slate-800">Zoom: {value.zoom.toFixed(2)}×
          <input type="range" min="1" max="1.8" step="0.05" value={value.zoom} onChange={(event) => onChange({ ...value, zoom: Number(event.target.value) })} className="mt-2 w-full" />
        </label>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onChange({ x: 50, y: 50, zoom: 1, mode: "cover" })} className="rounded-xl border bg-white px-4 py-2 text-sm font-black">Reset position</button><span className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-500">Position {value.x}% × {value.y}%</span></div></>}
      </div>
      <div><p className="text-sm font-black text-slate-800">Full image preview</p><div className="mt-2 grid min-h-56 place-items-center rounded-2xl border bg-white p-3">{preview ? <img src={preview} alt="Full image preview" className="max-h-72 max-w-full object-contain" /> : <span className="text-sm font-bold text-slate-400">No image selected</span>}</div><p className="mt-2 text-xs text-slate-500">Visitors can open this complete image from the directory card.</p></div>
    </div>
  </section>;
}

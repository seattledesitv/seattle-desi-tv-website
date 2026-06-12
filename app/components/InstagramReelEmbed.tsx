"use client";

import { useEffect } from "react";

type InstagramReelEmbedProps = {
  reelUrl?: string | null;
  caption?: string | null;
};

const fallbackInstagramUrl = "https://www.instagram.com/seattledesitv/";

function normalizeInstagramUrl(url?: string | null) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return fallbackInstagramUrl;
  if (!trimmed.startsWith("https://www.instagram.com/") && !trimmed.startsWith("https://instagram.com/")) return fallbackInstagramUrl;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export default function InstagramReelEmbed({ reelUrl, caption }: InstagramReelEmbedProps) {
  const safeUrl = normalizeInstagramUrl(reelUrl);

  useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.instagram.com/embed.js"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://www.instagram.com/embed.js";
      document.body.appendChild(script);
      return;
    }

    const instagram = (window as any).instgrm;
    if (instagram?.Embeds?.process) instagram.Embeds.process();
  }, [safeUrl]);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="overflow-hidden rounded-[1.5rem] bg-white text-slate-950">
        <blockquote
          className="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink={safeUrl}
          data-instgrm-version="14"
          style={{ background: "#fff", border: 0, margin: 0, minWidth: 0, width: "100%" }}
        >
          <a href={safeUrl} target="_blank" rel="noreferrer" className="block p-6 text-center font-black text-pink-600">
            View this SDTV reel on Instagram
          </a>
        </blockquote>
      </div>
      {caption && <p className="mt-4 text-center text-sm font-semibold text-white/70">{caption}</p>}
    </div>
  );
}

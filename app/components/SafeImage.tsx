"use client";

import { useMemo, useState } from "react";

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
}: SafeImageProps) {
  const cleanSrc = useMemo(() => optimizedImageUrl(src, widthHint), [src, widthHint]);
  const [failed, setFailed] = useState(!cleanSrc);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt || fallbackLabel}
        className={fallbackClassName || `bg-pink-50 text-pink-600 grid place-items-center font-black text-center ${className}`}
      >
        {fallbackLabel}
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}

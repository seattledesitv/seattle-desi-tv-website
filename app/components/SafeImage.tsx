"use client";

import { useState } from "react";

type SafeImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
};

export default function SafeImage({
  src,
  alt,
  className = "",
  fallbackClassName = "",
  fallbackLabel = "Seattle Desi TV",
}: SafeImageProps) {
  const cleanSrc = typeof src === "string" ? src.trim() : "";
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

  return <img src={cleanSrc} alt={alt} className={className} onError={() => setFailed(true)} />;
}

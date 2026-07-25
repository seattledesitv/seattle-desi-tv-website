"use client";

import { useEffect, useRef, useState } from "react";

type ExpandableBusinessOfferProps = {
  offer: string;
  previewLines?: number;
};

export default function ExpandableBusinessOffer({ offer, previewLines = 4 }: ExpandableBusinessOfferProps) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const text = String(offer || "").trim();
  const isLong = text.length > 180 || text.split("\n").length > previewLines;

  useEffect(() => {
    const article = rootRef.current?.closest("article");
    if (!article) return;

    article.querySelectorAll("button").forEach((button) => {
      if (button === toggleRef.current) return;
      const label = button.textContent?.trim().toLowerCase();
      if (label === "show more" || label === "show less") button.remove();
    });
  }, []);

  if (!text) return null;

  return (
    <div ref={rootRef} className="mt-3">
      <div
        className="whitespace-pre-line text-sm leading-6 text-gray-600"
        style={!expanded && isLong ? { maxHeight: `${previewLines * 1.5}rem`, overflow: "hidden" } : undefined}
      >
        {text}
      </div>
      {isLong && (
        <button
          ref={toggleRef}
          type="button"
          data-business-offer-toggle="true"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="mt-3 block rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-sm font-black text-pink-600 hover:bg-pink-100 hover:text-pink-700"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      <style jsx global>{`
        section.mb-7.rounded-3xl > div.mt-4.flex.gap-2.overflow-x-auto {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

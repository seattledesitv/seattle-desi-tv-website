"use client";

import { useState } from "react";

type ExpandableBusinessOfferProps = {
  offer: string;
  previewLines?: number;
};

export default function ExpandableBusinessOffer({ offer, previewLines = 4 }: ExpandableBusinessOfferProps) {
  const [expanded, setExpanded] = useState(false);
  const text = String(offer || "").trim();
  if (!text) return null;

  const isLong = text.length > 180 || text.split("\n").length > previewLines;

  return (
    <div className="mt-3">
      <p
        className="whitespace-pre-line text-sm text-gray-600"
        style={expanded || !isLong ? undefined : {
          display: "-webkit-box",
          WebkitLineClamp: previewLines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {text}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="mt-2 text-sm font-black text-pink-600 hover:text-pink-700"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

type CheckedExternalLinkProps = {
  href?: string | null;
  className?: string;
  children: React.ReactNode;
  notFoundMessage?: string;
};

function normalizeUrl(value?: string | null) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export default function CheckedExternalLink({ href, className = "", children, notFoundMessage = "Page not found. Please check back later." }: CheckedExternalLinkProps) {
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);

  async function openCheckedLink() {
    setMessage("");
    const url = normalizeUrl(href);

    if (!url) {
      setMessage(notFoundMessage);
      return;
    }

    setChecking(true);
    try {
      const response = await fetch(`/api/check-url?url=${encodeURIComponent(url)}`);
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setMessage(result?.reason || notFoundMessage);
        return;
      }

      window.open(result.url || url, "_blank", "noopener,noreferrer");
    } catch {
      setMessage(notFoundMessage);
    } finally {
      setChecking(false);
    }
  }

  return (
    <span className="relative inline-flex flex-col gap-2">
      <button type="button" onClick={openCheckedLink} disabled={checking} className={className}>
        {checking ? "Checking..." : children}
      </button>
      {message && (
        <span className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-orange-200 bg-orange-50 p-3 text-left text-sm font-bold text-orange-800 shadow-lg">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")} className="ml-3 rounded-full px-2 text-orange-900 hover:bg-orange-100" aria-label="Close message">×</button>
        </span>
      )}
    </span>
  );
}

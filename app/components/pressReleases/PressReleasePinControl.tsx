"use client";
import { useState } from "react";

export default function PressReleasePinControl({ pinned, saving, onToggle }: {
  pinned: boolean; saving: boolean; onToggle: (value: boolean) => Promise<unknown>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setError(""); setBusy(true);
    try { await onToggle(!pinned); }
    catch (cause) {
      setError(cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "Could not update the pin. Please try again.");
    } finally { setBusy(false); }
  }
  return <div>
    <button type="button" disabled={saving || busy} aria-pressed={pinned} onClick={() => void toggle()}
      className={`rounded-xl border px-4 py-2 font-black disabled:opacity-50 ${pinned ? "border-pink-300 bg-pink-100 text-pink-900" : "border-slate-300 bg-white text-slate-900"}`}>
      {busy ? "Saving pin…" : pinned ? "Unpin" : "Pin to top"}
    </button>
    {error && <p role="alert" className="mt-2 text-sm font-bold text-red-800">{error}</p>}
  </div>;
}

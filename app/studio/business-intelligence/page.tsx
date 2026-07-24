"use client";

import { useEffect } from "react";

export default function BusinessIntelligenceRedirectPage() {
  useEffect(() => { window.location.replace("/studio/businesses?status=all"); }, []);
  return <main className="min-h-screen bg-slate-950 text-white grid place-items-center"><div className="rounded-2xl border border-white/10 bg-white/10 p-6 font-bold">Opening the unified Business Management workspace...</div></main>;
}

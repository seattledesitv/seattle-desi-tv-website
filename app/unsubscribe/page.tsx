"use client";

import { useState } from "react";
import SiteHeader from "../components/SiteHeader";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
}

export default function UnsubscribePage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function update(action: "unsubscribe" | "resubscribe") {
    const normalized = email.trim().toLowerCase();
    if (!validEmail(normalized)) { setMessage("Please enter a valid email address."); return; }
    setLoading(true);
    setMessage(action === "unsubscribe" ? "Checking your subscription..." : "Checking your subscription...");
    const response = await fetch("/api/newsletter/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized, action }),
    });
    const result = await response.json();
    setMessage(result?.message || result?.error || "Subscription updated.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-[2rem] border border-white/10 bg-white p-8 text-slate-950 shadow-2xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-pink-600">Seattle Desi TV Newsletter</p>
          <h1 className="mt-3 text-4xl font-black">Manage your subscription</h1>
          <p className="mt-3 text-slate-600">Enter your email address to unsubscribe from SDTV newsletter emails. You can also resubscribe anytime.</p>
          <input className="mt-6 w-full rounded-xl border p-4 font-bold" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          <div className="mt-4 flex flex-wrap gap-3">
            <button disabled={loading} onClick={() => update("unsubscribe")} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">Unsubscribe</button>
            <button disabled={loading} onClick={() => update("resubscribe")} className="rounded-xl border px-5 py-3 font-black disabled:opacity-60">Resubscribe</button>
          </div>
          {message && <div className="mt-5 rounded-xl bg-slate-100 p-4 font-bold text-slate-800">{message}</div>}
        </div>
      </section>
    </main>
  );
}

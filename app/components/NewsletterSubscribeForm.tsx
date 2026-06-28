"use client";

import { useState } from "react";

type Props = {
  source?: string;
  compact?: boolean;
};

export default function NewsletterSubscribeForm({ source = "footer", compact = false }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setMessage("Subscribing...");
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, name: name.trim(), source }),
      });
      const result = await response.json();
      if (result?.ok) {
        setEmail("");
        setName("");
        setMessage(result.message || "Thank you for subscribing to SDTV.");
      } else {
        setMessage(result?.error || "Could not subscribe right now.");
      }
    } catch {
      setMessage("Could not subscribe right now.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      {!compact && <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name optional" className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:ring-2 focus:ring-pink-400" />}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" type="email" className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:ring-2 focus:ring-pink-400" />
        <button disabled={loading} className="rounded-xl bg-pink-600 px-5 py-3 text-sm font-black text-white hover:bg-pink-500 disabled:opacity-60">{loading ? "Saving..." : "Subscribe"}</button>
      </div>
      {message && <p className="text-xs font-bold text-pink-100">{message}</p>}
      <p className="text-xs text-slate-400">We respect your privacy. Unsubscribe anytime.</p>
    </form>
  );
}

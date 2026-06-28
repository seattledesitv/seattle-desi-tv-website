"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  source?: string;
  compact?: boolean;
};

function makeChallenge() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 1;
  return { a, b, answer: a + b };
}

export default function NewsletterSubscribeForm({ source = "footer", compact = false }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState({ a: 4, b: 5, answer: 9 });

  useEffect(() => { setChallenge(makeChallenge()); }, []);

  const captchaOk = useMemo(() => Number(captcha) === challenge.answer, [captcha, challenge.answer]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }
    if (!captchaOk) {
      setMessage(`Please answer the quick check: ${challenge.a} + ${challenge.b}.`);
      return;
    }
    setLoading(true);
    setMessage("Subscribing...");
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, name: name.trim(), source, captchaAnswer: Number(captcha), captchaExpected: challenge.answer }),
      });
      const result = await response.json();
      if (result?.ok) {
        setEmail("");
        setName("");
        setCaptcha("");
        setChallenge(makeChallenge());
        setMessage(result.message || "Thank you for subscribing to SDTV.");
      } else {
        setMessage(result?.error || "Could not subscribe right now.");
        setChallenge(makeChallenge());
        setCaptcha("");
      }
    } catch {
      setMessage("Could not subscribe right now.");
      setChallenge(makeChallenge());
      setCaptcha("");
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
      <div className="grid gap-2 sm:grid-cols-[auto_110px] sm:items-center">
        <label className="text-xs font-bold text-slate-300">Quick check: {challenge.a} + {challenge.b} =</label>
        <input value={captcha} onChange={(event) => setCaptcha(event.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="rounded-xl border border-white/10 bg-white px-3 py-2 text-sm font-black text-slate-950 outline-none focus:ring-2 focus:ring-pink-400" />
      </div>
      {message && <p className="text-xs font-bold text-pink-100">{message}</p>}
      <p className="text-xs text-slate-400">We respect your privacy. <a href="/unsubscribe" className="font-bold text-pink-300 underline">Unsubscribe anytime</a>.</p>
    </form>
  );
}

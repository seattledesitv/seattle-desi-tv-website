"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const requestTypes = ["General Inquiry", "Volunteer", "Internship", "RJ / Radio Host", "VJ / Anchor", "Sponsorship", "Event Coverage", "Business Listing", "Partnership"];
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "";
const ctaCards = [
  ["Join as Volunteer", "Support SDTV events, production, community outreach, and operations.", "Volunteer"],
  ["Become an RJ", "Host or support Seattle Desi Radio programs and community segments.", "RJ / Radio Host"],
  ["Become a VJ", "Anchor interviews, event coverage, reels, and community stories.", "VJ / Anchor"],
  ["Request Event Coverage", "Invite SDTV to cover your cultural, community, or business event.", "Event Coverage"],
  ["Sponsor SDTV", "Promote your brand across SDTV web, video, radio, and community channels.", "Sponsorship"],
];

declare global {
  interface Window {
    turnstile?: any;
  }
}

function normalizedInterest(value: string | null | undefined) {
  if (!value) return "";
  const decoded = decodeURIComponent(value);
  return requestTypes.includes(decoded) ? decoded : "";
}

export default function ContactSection({ compact = false, initialInterest = "" }: { compact?: boolean; initialInterest?: string }) {
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", interest: "General Inquiry", message: "" });
  const [captchaToken, setCaptchaToken] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const interest = normalizedInterest(initialInterest);
    if (interest) {
      setForm((current) => ({ ...current, interest, message: current.message || `Hi SDTV team, I am interested in ${interest}. Please share next steps.` }));
    }
  }, [initialInterest]);

  function renderTurnstile() {
    if (!siteKey || !turnstileRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: siteKey,
      callback: (token: string) => {
        setCaptchaToken(token);
        setStatus((current) => current === "Please complete the captcha." ? "" : current);
      },
      "expired-callback": () => setCaptchaToken(""),
      "error-callback": () => {
        setCaptchaToken("");
        setStatus("Captcha had an error. Please refresh and try again.");
      },
    });
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      renderTurnstile();
      if (widgetIdRef.current) window.clearInterval(timer);
    }, 300);
    return () => window.clearInterval(timer);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { setStatus("Please enter name, email, and message."); return; }
    if (!captchaToken) { setStatus("Please complete the captcha."); return; }
    setSaving(true);
    setStatus("Submitting...");
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, captchaToken }),
    });
    const result = await response.json();
    if (!response.ok || !result?.success) {
      setStatus(result?.error || "Could not submit contact request.");
    } else {
      setStatus("Thank you. Seattle Desi TV received your message.");
      setForm({ name: "", email: "", phone: "", interest: "General Inquiry", message: "" });
      setCaptchaToken("");
      if (window.turnstile && widgetIdRef.current) window.turnstile.reset(widgetIdRef.current);
    }
    setSaving(false);
  }

  function chooseInterest(interest: string) {
    setForm((current) => ({ ...current, interest, message: current.message || `Hi SDTV team, I am interested in ${interest}. Please share next steps.` }));
    setTimeout(() => document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  return (
    <section id="contact" className={compact ? "py-10" : "py-16"}>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer onLoad={renderTurnstile} />
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-start">
          <div className="bg-slate-950 text-white rounded-3xl p-8 md:p-10">
            <p className="text-pink-300 font-black uppercase tracking-wide">Contact Seattle Desi TV</p>
            <h2 className="text-4xl md:text-5xl font-black mt-3">Tell us how we can help.</h2>
            <p className="text-slate-300 mt-4">Reach out for event coverage, sponsorships, business listings, volunteering, internships, radio, interviews, or partnerships.</p>
            <div className="grid gap-3 mt-8">
              {ctaCards.map(([title, note, interest]) => <button key={title} type="button" onClick={() => chooseInterest(interest)} className="bg-white/10 rounded-2xl p-4 text-left hover:bg-white/15"><span className="block font-black">{title}</span><span className="block text-sm text-slate-300 mt-1">{note}</span></button>)}
            </div>
            <div className="grid gap-3 mt-8 text-sm">
              <a href="mailto:info@seattledesitv.com" className="bg-white/10 rounded-2xl p-4 font-bold hover:bg-white/15">info@seattledesitv.com</a>
              <a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="bg-white/10 rounded-2xl p-4 font-bold hover:bg-white/15">YouTube @SeattleDesiTV</a>
              <a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="bg-white/10 rounded-2xl p-4 font-bold hover:bg-white/15">Instagram @seattledesitv</a>
            </div>
          </div>
          <form id="contact-form" onSubmit={submit} className="bg-white text-slate-950 border rounded-3xl p-6 md:p-8 shadow-xl">
            <div className="grid md:grid-cols-2 gap-4">
              <input className="border rounded-xl p-3" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="border rounded-xl p-3" placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="border rounded-xl p-3" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <select className="border rounded-xl p-3" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}>{requestTypes.map((type) => <option key={type}>{type}</option>)}</select>
            </div>
            <textarea className="border rounded-xl p-3 w-full mt-4 min-h-36" placeholder="Message *" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <div className="mt-4 bg-slate-50 rounded-2xl p-4 border min-h-[92px]">
              {siteKey ? <div ref={turnstileRef} /> : <p className="text-red-600 font-bold text-sm">Turnstile site key is missing. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY in Vercel.</p>}
            </div>
            <button disabled={saving || !siteKey} className="w-full bg-pink-600 text-white px-5 py-4 rounded-xl font-black mt-5 disabled:opacity-50">{saving ? "Submitting..." : "Submit Contact Request"}</button>
            {status && <p className="mt-4 text-sm font-bold text-orange-700">{status}</p>}
          </form>
        </div>
      </div>
    </section>
  );
}

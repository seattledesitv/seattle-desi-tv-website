"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const requestTypes = ["General Inquiry", "Volunteer", "Internship", "RJ / Radio Host", "VJ / Anchor", "Sponsorship", "Event Coverage", "Business Listing", "Partnership"];

export default function ContactSection({ compact = false }: { compact?: boolean }) {
  const captcha = useMemo(() => {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    return { a, b, answer: a + b };
  }, []);
  const [form, setForm] = useState({ name: "", email: "", phone: "", request_type: "General Inquiry", message: "", captcha: "" });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { setStatus("Please enter name, email, and message."); return; }
    if (Number(form.captcha) !== captcha.answer) { setStatus("Captcha answer is incorrect. Please try again."); return; }
    setSaving(true);
    setStatus("Submitting...");
    const payload: any = {
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      request_type: form.request_type,
      message: form.message,
      status: "new",
      source: "website_contact",
    };
    const { error } = await supabase.from("contact_requests").insert(payload);
    if (error) {
      setStatus(`Could not submit contact request: ${error.message}`);
    } else {
      setStatus("Thank you. Seattle Desi TV received your message.");
      setForm({ name: "", email: "", phone: "", request_type: "General Inquiry", message: "", captcha: "" });
    }
    setSaving(false);
  }

  return (
    <section id="contact" className={compact ? "py-10" : "py-16"}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-start">
          <div className="bg-slate-950 text-white rounded-3xl p-8 md:p-10">
            <p className="text-pink-300 font-black uppercase tracking-wide">Contact Seattle Desi TV</p>
            <h2 className="text-4xl md:text-5xl font-black mt-3">Tell us how we can help.</h2>
            <p className="text-slate-300 mt-4">Reach out for event coverage, sponsorships, business listings, volunteering, internships, radio, interviews, or partnerships.</p>
            <div className="grid gap-4 mt-8 text-sm">
              <a href="mailto:info@seattledesitv.com" className="bg-white/10 rounded-2xl p-4 font-bold hover:bg-white/15">info@seattledesitv.com</a>
              <a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="bg-white/10 rounded-2xl p-4 font-bold hover:bg-white/15">YouTube @SeattleDesiTV</a>
              <a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="bg-white/10 rounded-2xl p-4 font-bold hover:bg-white/15">Instagram @seattledesitv</a>
            </div>
          </div>
          <form onSubmit={submit} className="bg-white text-slate-950 border rounded-3xl p-6 md:p-8 shadow-xl">
            <div className="grid md:grid-cols-2 gap-4">
              <input className="border rounded-xl p-3" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="border rounded-xl p-3" placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="border rounded-xl p-3" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <select className="border rounded-xl p-3" value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })}>{requestTypes.map((type) => <option key={type}>{type}</option>)}</select>
            </div>
            <textarea className="border rounded-xl p-3 w-full mt-4 min-h-36" placeholder="Message *" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <div className="mt-4 bg-slate-50 rounded-2xl p-4 border">
              <label className="font-black text-sm">Captcha: What is {captcha.a} + {captcha.b}?</label>
              <input className="border rounded-xl p-3 w-full mt-2" placeholder="Answer" value={form.captcha} onChange={(e) => setForm({ ...form, captcha: e.target.value })} />
            </div>
            <button disabled={saving} className="w-full bg-pink-600 text-white px-5 py-4 rounded-xl font-black mt-5 disabled:opacity-50">{saving ? "Submitting..." : "Submit Contact Request"}</button>
            {status && <p className="mt-4 text-sm font-bold text-orange-700">{status}</p>}
          </form>
        </div>
      </div>
    </section>
  );
}

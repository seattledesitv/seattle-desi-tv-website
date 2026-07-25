"use client";

import { useEffect, useMemo, useState } from "react";

const actionCopy: Record<string, { title: string; description: string; button: string; tone: string }> = {
  claim: { title: "Claim this business listing", description: "Tell us who you are. The SDTV team will verify ownership before granting management access.", button: "Request to claim listing", tone: "bg-pink-600" },
  approve: { title: "Confirm this listing", description: "Confirm that the basic directory information can be published as shown.", button: "Approve listing as shown", tone: "bg-green-600" },
  correction: { title: "Request a correction", description: "Tell us what needs to be changed before or after publication.", button: "Submit correction request", tone: "bg-amber-600" },
  opt_out: { title: "Request removal", description: "Request that this business not be included in the Seattle Desi TV Community Directory.", button: "Do not include this business", tone: "bg-red-600" },
};

export default function BusinessResponsePage() {
  const [token, setToken] = useState("");
  const [action, setAction] = useState("claim");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
    const requestedAction = params.get("action") || "claim";
    setAction(actionCopy[requestedAction] ? requestedAction : "claim");
  }, []);

  const copy = useMemo(() => actionCopy[action] || actionCopy.claim, [action]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) { setStatus("This response link is incomplete. Please use the link from the SDTV email."); return; }
    if ((action === "claim" || action === "correction") && (!contactName.trim() || !contactEmail.includes("@"))) {
      setStatus("Please enter your name and a valid email address."); return;
    }
    if (action === "correction" && !message.trim()) { setStatus("Please describe the correction needed."); return; }
    if (action === "opt_out" && !window.confirm("Confirm that you want this business excluded from the SDTV Community Directory.")) return;
    setSubmitting(true); setStatus("Saving your response...");
    const response = await fetch("/api/business-response", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, action, contactName, contactEmail, message }) });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) { setStatus(result.error || "Could not save your response."); return; }
    setStatus(`Thank you. ${result.message}. The Seattle Desi TV team has recorded your response.`);
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-12 text-white">
    <div className="mx-auto max-w-2xl">
      <a href="/" className="text-sm font-bold text-pink-300">Seattle Desi TV</a>
      <section className="mt-5 rounded-3xl bg-white p-6 text-slate-950 shadow-2xl md:p-9">
        <p className="text-xs font-black uppercase tracking-widest text-pink-600">Community Business Directory</p>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">{copy.title}</h1>
        <p className="mt-3 text-gray-600">{copy.description}</p>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">The basic listing is complimentary. Claiming, correcting, approving, or requesting removal does not create a sponsorship, partnership, or endorsement relationship with Seattle Desi TV.</div>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-1 text-sm font-bold">Your name<input value={contactName} onChange={(event)=>setContactName(event.target.value)} className="rounded-xl border px-4 py-3 font-normal" placeholder="Business owner or authorised representative" /></label>
          <label className="grid gap-1 text-sm font-bold">Your email<input type="email" value={contactEmail} onChange={(event)=>setContactEmail(event.target.value)} className="rounded-xl border px-4 py-3 font-normal" placeholder="name@business.com" /></label>
          <label className="grid gap-1 text-sm font-bold">Message {action === "correction" ? "(required)" : "(optional)"}<textarea value={message} onChange={(event)=>setMessage(event.target.value)} rows={5} className="rounded-xl border px-4 py-3 font-normal" placeholder={action === "correction" ? "Describe the information that needs to be corrected." : "Add any details for the SDTV team."} /></label>
          <button disabled={submitting} className={`${copy.tone} rounded-xl px-5 py-3 font-black text-white disabled:opacity-50`}>{submitting ? "Submitting..." : copy.button}</button>
        </form>
        {status&&<div className="mt-5 rounded-xl bg-slate-100 p-4 font-bold text-slate-800">{status}</div>}
        <p className="mt-6 text-xs text-gray-500">Questions? Contact Seattle Desi TV through the contact page on seattledesitv.com.</p>
      </section>
    </div>
  </main>;
}

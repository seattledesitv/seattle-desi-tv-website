"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

function selectedTitle() {
  const tabs = Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Overview");
  const tabCard = tabs?.closest("div.rounded-3xl");
  const rightColumn = tabCard?.parentElement;
  const heading = rightColumn?.querySelector("h2.text-3xl") as HTMLElement | null;
  return heading?.textContent?.trim() || "";
}

function findSlot() {
  const headings = Array.from(document.querySelectorAll("h3"));
  const fastActionsHeading = headings.find((heading) => heading.textContent?.trim() === "Fast Actions");
  const section = fastActionsHeading?.closest("section");
  if (!section) return null;
  let slot = section.querySelector(".event-media-recovery-slot") as HTMLElement | null;
  if (!slot) {
    slot = document.createElement("div");
    slot.className = "event-media-recovery-slot mt-4 border-t pt-4";
    section.appendChild(slot);
  }
  return slot;
}

function buildBody(eventTitle: string, formLink: string) {
  return [`Hello,`, ``, `Thank you for requesting SDTV coverage for ${eventTitle || "your event"}.`, ``, `Please share your event photos or videos using this SDTV form:`, ``, formLink || "[media request link will appear after the event is resolved]", ``, `Once received, SDTV can review the media and assign it for editing/publishing consideration.`, ``, `Thank you,`, `Seattle Desi TV Team`].join("\n");
}

export default function EventOpsMediaRecovery() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [eventId, setEventId] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function resolveEvent(title: string) {
    if (!title || title === eventTitle) return;
    const { data } = await supabase.from("events").select("id,title,poc_email").eq("title", title).order("date", { ascending: false }).limit(1).maybeSingle();
    const nextId = data?.id || "";
    const nextTitle = data?.title || title;
    const nextEmail = data?.poc_email || "";
    const nextLink = nextId ? `${window.location.origin}/events/media-request/${nextId}` : "";
    setEventId(nextId);
    setEventTitle(nextTitle);
    setPocEmail(nextEmail);
    setEmailSubject(`SDTV media folder request - ${nextTitle || "Event"}`);
    setEmailBody(buildBody(nextTitle, nextLink));
  }

  useEffect(() => {
    const refresh = () => {
      setSlot(findSlot());
      resolveEvent(selectedTitle());
    };
    refresh();
    const timer = window.setInterval(refresh, 800);
    return () => window.clearInterval(timer);
  }, [eventTitle]);

  async function trackRequest() {
    setMessage("");
    if (!eventId) { setMessage("Select an event first. Event id is still loading."); return; }
    const { data: userData } = await supabase.auth.getUser();
    const formLink = `${window.location.origin}/events/media-request/${eventId}`;
    const { error } = await supabase.from("event_coverage_sources").insert({
      event_id: eventId,
      source_type: "organizer_media",
      status: "requested",
      source_url: formLink,
      platform: "Organizer Upload Link",
      contact_email: pocEmail,
      requested_by: userData?.user?.id || null,
      requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: "Organizer media requested from Event Ops v2.",
    });
    setMessage(error ? `Could not track request: ${error.message}. Run supabase/event-coverage-sources.sql if needed.` : "Organizer media request tracked.");
  }

  async function sendEmail() {
    setMessage("");
    if (!pocEmail.trim()) { setMessage("Add the POC email before sending."); return; }
    if (!emailSubject.trim() || !emailBody.trim()) { setMessage("Subject and message are required."); return; }
    setSending(true);
    const response = await fetch("/api/media-request/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: pocEmail.trim(), subject: emailSubject.trim(), message: emailBody.trim() }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(result?.error || "Email failed. Check Resend configuration.");
    else {
      await trackRequest();
      setMessage("Email sent to POC and media request tracked.");
    }
    setSending(false);
  }

  if (!slot) return null;
  const formLink = eventId ? `${typeof window !== "undefined" ? window.location.origin : ""}/events/media-request/${eventId}` : "";

  return createPortal(<div className="rounded-2xl bg-red-50 p-4 text-slate-950">
    <p className="text-xs font-black uppercase tracking-wide text-red-700">Coverage Recovery</p>
    <h4 className="mt-1 text-lg font-black">Request Organizer Media</h4>
    <p className="mt-1 text-sm text-red-900">Use this when SDTV needs media from the organizer. Edit the message and send with Resend.</p>
    {formLink ? <p className="mt-2 break-all rounded-xl bg-white p-3 text-xs font-bold text-slate-700">{formLink}</p> : <p className="mt-2 rounded-xl bg-yellow-50 p-3 text-xs font-bold text-yellow-800">Select an event and wait for the media link to resolve.</p>}
    <div className="mt-3 grid gap-2">
      <input className="rounded-xl border p-3 text-sm" placeholder="POC email" value={pocEmail} onChange={(event) => setPocEmail(event.target.value)} />
      <input className="rounded-xl border p-3 text-sm" placeholder="Email subject" value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} />
      <textarea className="min-h-36 rounded-xl border p-3 text-sm" value={emailBody} onChange={(event) => setEmailBody(event.target.value)} />
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      <button onClick={sendEmail} disabled={sending || !eventId} className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">{sending ? "Sending..." : "Send Email"}</button>
      <button onClick={trackRequest} disabled={!eventId} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white disabled:opacity-60">Track Only</button>
      {formLink && <a href={formLink} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">Open Form</a>}
    </div>
    {message && <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-red-800">{message}</p>}
  </div>, slot);
}

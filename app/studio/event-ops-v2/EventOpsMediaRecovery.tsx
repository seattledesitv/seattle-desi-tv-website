"use client";

import { useEffect, useRef, useState } from "react";
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

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export default function EventOpsMediaRecovery() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [eventId, setEventId] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);
  const [lastRequestedAt, setLastRequestedAt] = useState("");
  const [message, setMessage] = useState("");
  const activeTitleRef = useRef("");

  async function resolveEvent(title: string) {
    if (!title || title === activeTitleRef.current) return;
    activeTitleRef.current = title;
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
    setLastRequestedAt("");
    if (nextId) {
      const { data: existing } = await supabase.from("event_coverage_sources").select("requested_at,created_at,status").eq("event_id", nextId).eq("source_type", "organizer_media").order("created_at", { ascending: false }).limit(1).maybeSingle();
      setLastRequestedAt(existing?.requested_at || existing?.created_at || "");
    }
  }

  useEffect(() => {
    setSlot(findSlot());
    const timer = window.setInterval(() => {
      const nextSlot = findSlot();
      if (nextSlot && nextSlot !== slot) setSlot(nextSlot);
      resolveEvent(selectedTitle());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function notifyPoc(formLink: string) {
    const email = pocEmail.trim().toLowerCase();
    if (!email) return;
    const { data: profile } = await supabase.from("user_profiles").select("user_id,email").eq("email", email).limit(1).maybeSingle();
    const userId = profile?.user_id;
    if (!userId) return;
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "SDTV requests event media",
      message: `Please provide the media folder for ${eventTitle || "your event"}.`,
      link: formLink,
      read: false,
    });
  }

  async function trackRequest() {
    if (!eventId) { setMessage("Select an event first. Event id is still loading."); return false; }
    const { data: userData } = await supabase.auth.getUser();
    const formLink = `${window.location.origin}/events/media-request/${eventId}`;
    const payload = {
      event_id: eventId,
      source_type: "organizer_media",
      status: "requested",
      source_url: formLink,
      platform: "Organizer Upload Link",
      contact_email: pocEmail.trim(),
      requested_by: userData?.user?.id || null,
      requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: "Organizer media requested from Event Ops v2.",
    };
    const { error } = await supabase.from("event_coverage_sources").insert(payload);
    if (error) {
      setMessage(`Could not track request: ${error.message}. Run supabase/event-coverage-sources.sql if needed.`);
      return false;
    }
    setLastRequestedAt(payload.requested_at);
    await notifyPoc(formLink);
    return true;
  }

  async function sendRequest() {
    setMessage("");
    if (!validEmail(pocEmail)) { setMessage("POC email is missing or invalid. Please update the event POC email or enter a valid email here."); return; }
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
      setMessage("Request sent. Email, tracking record, and POC notification are complete if the POC has an SDTV login profile.");
    }
    setSending(false);
  }

  if (!slot) return null;
  const formLink = eventId ? `${typeof window !== "undefined" ? window.location.origin : ""}/events/media-request/${eventId}` : "";
  const lastRequestedText = lastRequestedAt ? new Date(lastRequestedAt).toLocaleString() : "Not requested yet";

  return createPortal(<div className="rounded-2xl bg-red-50 p-4 text-slate-950">
    <p className="text-xs font-black uppercase tracking-wide text-red-700">Coverage Recovery</p>
    <h4 className="mt-1 text-lg font-black">Request Organizer Media</h4>
    <p className="mt-1 text-sm text-red-900">Edit the message, then send one request. This sends email, tracks the request, and notifies the POC if they have an SDTV login.</p>
    <p className="mt-2 rounded-xl bg-white p-3 text-xs font-bold text-slate-700">Last requested: {lastRequestedText}</p>
    {formLink ? <p className="mt-2 break-all rounded-xl bg-white p-3 text-xs font-bold text-slate-700">{formLink}</p> : <p className="mt-2 rounded-xl bg-yellow-50 p-3 text-xs font-bold text-yellow-800">Select an event and wait for the media link to resolve.</p>}
    <div className="mt-3 grid gap-2">
      <label className="text-xs font-black uppercase text-red-700">To / POC Email<input className="mt-1 w-full rounded-xl border p-3 text-sm" placeholder="poc@example.com" value={pocEmail} onChange={(event) => setPocEmail(event.target.value)} /></label>
      <input className="rounded-xl border p-3 text-sm" placeholder="Email subject" value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} />
      <textarea className="min-h-36 rounded-xl border p-3 text-sm" value={emailBody} onChange={(event) => setEmailBody(event.target.value)} />
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      <button onClick={sendRequest} disabled={sending || !eventId} className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">{sending ? "Sending..." : "Send Request / Reminder"}</button>
      {formLink && <a href={formLink} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">Open Form</a>}
    </div>
    {message && <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-red-800">{message}</p>}
  </div>, slot);
}

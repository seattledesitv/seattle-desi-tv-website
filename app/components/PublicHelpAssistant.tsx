"use client";

import { FormEvent, useMemo, useState } from "react";
import { SDTV_EIN, SDTV_ORGANIZATION_EMAIL } from "../lib/organizationDetails";
import { useCurrentSite } from "../lib/sites/SiteContext";

type AssistantLink = { label: string; href: string };
type AssistantMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  links?: AssistantLink[];
};

type PublicEvent = {
  id?: string;
  title?: string;
  date?: string;
  startTime?: string;
  location?: string;
};

const quickQuestions = [
  "Events this week",
  "Become a volunteer",
  "Sponsorship packages",
  "About SDTV",
];

function localDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function currentWeekBounds() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(value.weekday);
  const anchor = new Date(`${value.year}-${value.month}-${value.day}T12:00:00-07:00`);
  const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: localDate(monday), end: localDate(sunday) };
}

function eventTime(event: PublicEvent) {
  const time = String(event.startTime || "").trim();
  if (!time) return "Time listed on event page";
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
    new Date(2026, 0, 1, hours, minutes),
  );
}

async function eventsThisWeek(): Promise<AssistantMessage> {
  try {
    const response = await fetch("/api/mobile/v1/events?limit=100", { cache: "no-store" });
    if (!response.ok) throw new Error("Events are unavailable");
    const payload = await response.json();
    const { start, end } = currentWeekBounds();
    const events = (Array.isArray(payload?.items) ? payload.items : [])
      .filter((event: PublicEvent) => event.date && event.date >= start && event.date <= end)
      .slice(0, 8) as PublicEvent[];
    if (!events.length) {
      return {
        id: Date.now(),
        role: "assistant",
        text: `I could not find an approved event between ${start} and ${end}. You can still browse all upcoming events.`,
        links: [{ label: "View all events", href: "/events" }],
      };
    }
    return {
      id: Date.now(),
      role: "assistant",
      text: `Here are the approved events this week (${start} through ${end}):\n\n${events
        .map((event) => `• ${event.title || "Community event"} — ${event.date}, ${eventTime(event)}${event.location ? ` — ${event.location}` : ""}`)
        .join("\n")}`,
      links: [
        ...events.filter((event) => event.id).slice(0, 4).map((event) => ({ label: String(event.title || "View event"), href: `/events/${event.id}` })),
        { label: "View all events", href: "/events" },
      ],
    };
  } catch {
    return {
      id: Date.now(),
      role: "assistant",
      text: "I could not load the live event list right now. Please use the Events page, which always shows the currently approved listings.",
      links: [{ label: "Open Events", href: "/events" }],
    };
  }
}

function standardAnswer(question: string, siteName: string): AssistantMessage {
  const text = question.toLowerCase();
  const answer = (message: string, links?: AssistantLink[]): AssistantMessage => ({ id: Date.now(), role: "assistant", text: message, links });

  if (/volunteer|join.*team|help sdtv/.test(text)) {
    return answer(
      `To volunteer with ${siteName}:\n\n1. Open the Contact page.\n2. Choose “Volunteer” as the request type.\n3. Tell us about your interests, availability, and relevant experience.\n4. The SDTV team will review the request and share onboarding steps.\n\nVolunteer opportunities may include event coverage, production, radio, community outreach, and operations.`,
      [{ label: "Start volunteer request", href: "/contact?interest=volunteer" }, { label: "Meet the team", href: "/team" }],
    );
  }
  if (/sponsor|sponsorship|partner|package|advertis/.test(text)) {
    return answer(
      "Current website packages include annual Community Partnerships—Platinum ($5,000), Gold ($2,500), and Silver ($600)—plus reel and content packages currently listed from $100 to $350. Benefits vary by tier and may include website visibility, social promotion, interviews, Desi Weekend Vibes placement, and radio promotion. Please confirm availability and current terms with SDTV before purchasing.",
      [{ label: "Compare sponsorship packages", href: "/marketing-packages" }, { label: "Ask about sponsorship", href: "/contact?interest=sponsorship" }],
    );
  }
  if (/mission|about|nonprofit|501|ein|charity/.test(text)) {
    return answer(
      `${siteName} is a 501(c)(3) nonprofit community media organization (EIN ${SDTV_EIN}). Its mission is to elevate Desi culture, talent, and voices through community storytelling, cultural programming, interviews, radio, event coverage, and meaningful dialogue.`,
      [{ label: "About SDTV", href: "/about" }, { label: "Community disclaimer", href: "/community-disclaimer" }],
    );
  }
  if (/bylaw|articles of incorporation|board|governance|officer/.test(text)) {
    return answer(
      `I can explain SDTV's published mission and public programs, but I should not interpret or quote governance documents that have not been added to this assistant's approved knowledge. For official bylaws, Articles of Incorporation, board, or officer questions, please contact ${SDTV_ORGANIZATION_EMAIL}.`,
      [{ label: "Contact SDTV", href: "/contact" }, { label: "About SDTV", href: "/about" }],
    );
  }
  if (/submit.*event|add.*event|list.*event|event organizer/.test(text)) {
    return answer(
      "Community members can submit an event for review. Open the event submission page, provide the event details and flyer, and submit it. The event remains pending until an SDTV administrator approves it.",
      [{ label: "Submit an event", href: "/events/submit" }, { label: "Browse events", href: "/events" }],
    );
  }
  if (/business|directory|listing/.test(text)) {
    return answer(
      "The SDTV business directory helps the community discover approved local businesses. You can browse listings, submit or claim a business, suggest corrections, and explore current offers.",
      [{ label: "Browse businesses", href: "/businesses" }, { label: "Business inquiry", href: "/contact?interest=business-listing" }],
    );
  }
  if (/press release|news|announcement|submit content|share.*story/.test(text)) {
    return answer(
      "You can submit community news, announcements, stories, images, video links, or a press release for SDTV review. Submission does not guarantee publication.",
      [{ label: "Share with SDTV", href: "/submit-content" }, { label: "Press releases", href: "/press-releases" }],
    );
  }
  if (/contact|email|phone|whatsapp/.test(text)) {
    return answer(
      `For official SDTV inquiries, email ${SDTV_ORGANIZATION_EMAIL}. You can also use the Contact page for volunteering, sponsorship, event coverage, business listings, radio, interviews, or partnerships.`,
      [{ label: "Contact SDTV", href: "/contact" }],
    );
  }
  return answer(
    "I can help with this week's events, volunteering, sponsorship packages, event submissions, business listings, press releases, SDTV's mission, and contact information. Try one of the suggested questions below, or contact SDTV for something more specific.",
    [{ label: "Contact SDTV", href: "/contact" }],
  );
}

export default function PublicHelpAssistant() {
  const site = useCurrentSite();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const initialMessage = useMemo<AssistantMessage>(() => ({
    id: 1,
    role: "assistant",
    text: `Hi! I’m the ${site.shortName} website assistant. I can help you find events, volunteer, explore sponsorship packages, and navigate community services.`,
  }), [site.shortName]);
  const [messages, setMessages] = useState<AssistantMessage[]>([initialMessage]);

  async function ask(rawQuestion: string) {
    const clean = rawQuestion.trim().slice(0, 300);
    if (!clean || busy) return;
    const exchangeId = Date.now() * 2;
    setMessages((current) => [...current, { id: exchangeId, role: "user", text: clean }]);
    setQuestion("");
    setBusy(true);
    const response = /event|what.*happening|this week/i.test(clean)
      ? await eventsThisWeek()
      : standardAnswer(clean, site.name);
    setMessages((current) => [...current, { ...response, id: exchangeId + 1 }]);
    setBusy(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 md:bottom-6 md:left-6">
      {open && (
        <section className="mb-3 flex max-h-[min(680px,78vh)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-2xl" aria-label={`${site.shortName} website assistant`}>
          <header className="flex items-start justify-between bg-slate-950 p-5 text-white">
            <div><p className="text-xs font-black uppercase tracking-[.18em] text-pink-300">Website assistant</p><h2 className="mt-1 text-xl font-black">Ask {site.shortName}</h2><p className="mt-1 text-xs text-slate-300">Live events and approved SDTV information</p></div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-white/10 px-3 py-2 font-black" aria-label="Close website assistant">×</button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "ml-10 rounded-2xl bg-pink-600 p-3 text-sm font-bold text-white" : "mr-5 rounded-2xl border bg-white p-3 text-sm leading-6 shadow-sm"}>
                <p className="whitespace-pre-line">{message.text}</p>
                {message.links && <div className="mt-3 flex flex-wrap gap-2">{message.links.map((link) => <a key={`${message.id}-${link.href}-${link.label}`} href={link.href} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white">{link.label}</a>)}</div>}
              </div>
            ))}
            {busy && <p className="mr-5 rounded-2xl border bg-white p-3 text-sm font-bold text-slate-500">Checking the latest information…</p>}
          </div>
          <div className="border-t bg-white p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{quickQuestions.map((item) => <button key={item} type="button" onClick={() => void ask(item)} className="shrink-0 rounded-full border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-black text-pink-700">{item}</button>)}</div>
            <form onSubmit={submit} className="flex gap-2"><label htmlFor="sdtv-assistant-question" className="sr-only">Ask SDTV a question</label><input id="sdtv-assistant-question" value={question} maxLength={300} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about events, volunteering…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 text-sm" /><button disabled={busy || !question.trim()} className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Send</button></form>
            <p className="mt-2 text-[11px] leading-4 text-slate-500">Answers use public SDTV information. Confirm important details on the linked page or with SDTV.</p>
          </div>
        </section>
      )}
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex items-center gap-2 rounded-full border border-white/20 bg-pink-600 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-black/30 transition hover:-translate-y-0.5 hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-300" aria-expanded={open} aria-label={open ? "Close SDTV website assistant" : "Open SDTV website assistant"}>
        <span aria-hidden="true">✦</span><span>Ask {site.shortName}</span>
      </button>
    </div>
  );
}

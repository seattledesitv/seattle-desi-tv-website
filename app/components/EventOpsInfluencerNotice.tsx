"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type EventRow = { id: string; title: string; poc_email?: string | null; date?: string | null; location?: string | null };
type IntentRow = { id: string; event_id: string; user_email?: string | null; influencer_profile_id?: string | null; status?: string | null; expected_platforms?: string | null };

function label(value?: string | null) { return String(value || "").replaceAll("_", " ") || "—"; }
function safeSelector(value: string) { return value.replace(/[^a-zA-Z0-9_-]/g, "-"); }

function buildEmailHref(event: EventRow, approvedCount: number, pendingCount: number) {
  const subject = `SDTV coverage plan for ${event.title}`;
  const body = [
    "Hello,",
    "",
    "Sharing the current Seattle Desi TV coverage plan for your event.",
    "",
    `Event: ${event.title}`,
    `Date: ${event.date || "TBD"}`,
    `Location: ${event.location || "TBD"}`,
    "",
    `Influencer/Social Collaboration: ${approvedCount} approved, ${pendingCount} pending`,
    "Crew and media coverage details are being coordinated by Seattle Desi TV.",
    "",
    "Thank you,",
    "Seattle Desi TV",
  ].join("\n");
  return `mailto:${event.poc_email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function EventOpsInfluencerNotice() {
  const [active, setActive] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [intents, setIntents] = useState<IntentRow[]>([]);

  async function load() {
    if (typeof window === "undefined" || window.location.pathname !== "/studio/event-ops") return;
    setActive(true);
    const [eventResult, intentResult] = await Promise.all([
      supabase.from("events").select("id,title,poc_email,date,location").order("date", { ascending: false }).limit(300),
      supabase.from("event_influencer_intents").select("id,event_id,user_email,influencer_profile_id,status,expected_platforms").order("created_at", { ascending: false }).limit(1000),
    ]);
    setEvents(eventResult.data || []);
    setIntents(intentResult.data || []);
  }

  const statsByEvent = useMemo(() => {
    const map: Record<string, { total: number; approved: number; pending: number; completed: number; rejected: number }> = {};
    for (const row of intents) {
      const key = row.event_id;
      if (!map[key]) map[key] = { total: 0, approved: 0, pending: 0, completed: 0, rejected: 0 };
      map[key].total += 1;
      const status = String(row.status || "pending").toLowerCase();
      if (status === "approved") map[key].approved += 1;
      else if (status === "completed") map[key].completed += 1;
      else if (status === "rejected") map[key].rejected += 1;
      else map[key].pending += 1;
    }
    return map;
  }, [intents]);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    function applyBadges() {
      const eventCards = Array.from(document.querySelectorAll("button h3")).map((h3) => h3.closest("button")).filter(Boolean) as HTMLButtonElement[];
      for (const card of eventCards) {
        const title = card.querySelector("h3")?.textContent?.trim() || "";
        const event = events.find((item) => item.title === title);
        if (!event) continue;
        const stats = statsByEvent[event.id] || { total: 0, approved: 0, pending: 0, completed: 0, rejected: 0 };
        const grid = card.querySelector(".grid.grid-cols-2");
        if (grid && !card.querySelector(`[data-sdtv-influencer-card="${safeSelector(event.id)}"]`)) {
          const box = document.createElement("div");
          box.setAttribute("data-sdtv-influencer-card", safeSelector(event.id));
          box.className = `rounded-xl border p-2 ${stats.total > 0 ? "bg-yellow-50 text-yellow-800 border-yellow-100" : "bg-slate-50 text-slate-500 border-slate-100"}`;
          box.innerHTML = `<p class="text-xs font-black">Influencer Collab</p><p class="text-[11px] mt-1">${stats.total ? `${stats.approved + stats.completed} approved · ${stats.pending} pending` : "None"}</p>`;
          grid.appendChild(box);
        }
        const meta = card.querySelector(".flex.flex-wrap.gap-2.mt-3");
        if (meta && stats.total > 0 && !card.querySelector(`[data-sdtv-influencer-pill="${safeSelector(event.id)}"]`)) {
          const pill = document.createElement("span");
          pill.setAttribute("data-sdtv-influencer-pill", safeSelector(event.id));
          pill.className = "text-[11px] rounded-full bg-yellow-50 px-2 py-1 font-bold text-yellow-800";
          pill.textContent = `${stats.total} influencer request${stats.total === 1 ? "" : "s"}`;
          meta.appendChild(pill);
        }
        if (event.poc_email && !card.querySelector(`[data-sdtv-email-poc="${safeSelector(event.id)}"]`)) {
          const meta = card.querySelector(".flex.flex-wrap.gap-2.mt-3");
          const link = document.createElement("a");
          link.setAttribute("data-sdtv-email-poc", safeSelector(event.id));
          link.className = "text-[11px] rounded-full bg-pink-50 px-2 py-1 font-bold text-pink-700";
          link.textContent = "Email POC";
          link.href = buildEmailHref(event, stats.approved + stats.completed, stats.pending);
          link.addEventListener("click", (event) => event.stopPropagation());
          meta?.appendChild(link);
        }
      }
    }

    applyBadges();
    const observer = new MutationObserver(applyBadges);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [active, events, statsByEvent]);

  return null;
}

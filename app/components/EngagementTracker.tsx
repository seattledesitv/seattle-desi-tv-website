"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "sdtv-engagement-session";
const VIEW_PREFIX = "sdtv-engagement-view:";

function sessionId() {
  try {
    let value = sessionStorage.getItem(SESSION_KEY);
    if (!value) {
      value = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, value);
    }
    return value;
  } catch {
    return "";
  }
}

function entityFromPath(pathname: string) {
  const event = pathname.match(/^\/events\/([^/?#]+)/);
  if (event && event[1] !== "submit" && event[1] !== "new") return { entityType: "event", entityId: event[1] };
  const organization = pathname.match(/^\/community-organizations\/([^/?#]+)/);
  if (organization && !["manage", "submit", "suggest-update", "link-event"].includes(organization[1])) return { entityType: "organization", entityId: organization[1] };
  return null;
}

function actionFromElement(element: HTMLElement, href: string) {
  const text = `${element.textContent || ""} ${element.getAttribute("aria-label") || ""}`.toLowerCase();
  const target = href.toLowerCase();
  if (target.startsWith("tel:")) return "phone_click";
  if (target.startsWith("mailto:")) return "email_click";
  if (target.includes("wa.me") || target.includes("whatsapp.com")) return "whatsapp_click";
  if (target.includes("google.com/maps") || text.includes("map") || text.includes("direction")) return "directions_click";
  if (text.includes("ticket") || text.includes("register")) return "ticket_click";
  if (text.includes("calendar") || text.includes(".ics") || target.includes("calendar.google")) return "calendar_click";
  if (text.includes("share") || text.includes("copy link") || target.includes("sharer")) return "share_click";
  if (["facebook.com", "instagram.com", "youtube.com", "youtu.be"].some((domain) => target.includes(domain))) return "social_click";
  if (text.includes("manage")) return "manage_click";
  if (/^https?:\/\//.test(target)) return "website_click";
  return "other_click";
}

function businessFromElement(element: HTMLElement) {
  const article = element.closest("article");
  const name = article?.querySelector("h2, h3")?.textContent?.trim() || "";
  return name ? { entityType: "business", entityId: null, entityName: name } : null;
}

function send(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ ...payload, sessionId: sessionId() });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/engagement", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/engagement", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => null);
  } catch {
    // Analytics must never affect the user experience.
  }
}

export default function EngagementTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const entity = entityFromPath(pathname);
    if (!entity) return;
    try {
      const key = `${VIEW_PREFIX}${entity.entityType}:${entity.entityId}`;
      const previous = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - previous < 30 * 60 * 1000) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // Continue without de-duplication when storage is unavailable.
    }
    send({ ...entity, actionType: "page_view", pagePath: pathname });
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const clickable = target?.closest("a,button") as HTMLElement | null;
      if (!clickable) return;
      const anchor = clickable.closest("a") as HTMLAnchorElement | null;
      const href = anchor?.href || "";
      const routeEntity = entityFromPath(window.location.pathname);
      const entity = routeEntity || (window.location.pathname === "/businesses" ? businessFromElement(clickable) : null);
      if (!entity) return;
      send({ ...entity, actionType: actionFromElement(clickable, href), pagePath: window.location.pathname, targetUrl: href || null });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}

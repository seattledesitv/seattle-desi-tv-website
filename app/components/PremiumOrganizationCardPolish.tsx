"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { useCurrentSite } from "../lib/sites/SiteContext";
import { forSite } from "../lib/sites/query";

const supabase = getSupabaseBrowserClient();

function active(row: any) {
  if (!row?.is_premium) return false;
  const now = Date.now();
  const starts = row.premium_starts_at ? new Date(row.premium_starts_at).getTime() : 0;
  const ends = row.premium_ends_at ? new Date(row.premium_ends_at).getTime() : Number.POSITIVE_INFINITY;
  return starts <= now && now <= ends;
}

export default function PremiumOrganizationCardPolish() {
  const site = useCurrentSite();
  useEffect(() => {
    if (window.location.pathname !== "/community-organizations") return;
    let cancelled = false;
    const timers: number[] = [];

    async function apply() {
      const { data, error } = await forSite(supabase
        .from("community_organizations")
        .select("id,is_premium,premium_rank,premium_starts_at,premium_ends_at,premium_label"), site.id)
        .eq("status", "approved")
        .eq("approved", true);
      if (cancelled || error) return;

      const premium = new Map((data || []).filter(active).map((row: any) => [String(row.id), row]));

      const enhance = () => {
        if (cancelled) return;
        const profileLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/community-organizations/"]'))
          .filter((link) => !link.href.includes("/manage") && !link.href.includes("/suggest-update"));
        const cards = Array.from(new Set(profileLinks.map((link) => link.closest("article")).filter(Boolean))) as HTMLElement[];
        if (!cards.length) return;
        const parent = cards[0].parentElement;
        if (!parent) return;

        cards.forEach((card) => {
          const link = card.querySelector<HTMLAnchorElement>('a[href^="/community-organizations/"]');
          const id = link?.getAttribute("href")?.split("/").filter(Boolean).pop() || "";
          const row: any = premium.get(id);
          card.dataset.premiumRank = row ? String(Number(row.premium_rank || 100)) : "999999";
          card.dataset.premium = row ? "yes" : "no";
          if (!row) return;
          card.classList.add("border-amber-300", "ring-2", "ring-amber-100", "shadow-lg");
          if (!card.querySelector('[data-premium-organization-badge="yes"]')) {
            const badge = document.createElement("span");
            badge.dataset.premiumOrganizationBadge = "yes";
            badge.className = "absolute left-4 top-4 z-20 rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase text-amber-950 shadow";
            badge.textContent = row.premium_label || "Premium";
            card.style.position = "relative";
            card.appendChild(badge);
          }
        });

        const sorted = [...cards].sort((a, b) => {
          const premiumDifference = Number(b.dataset.premium === "yes") - Number(a.dataset.premium === "yes");
          if (premiumDifference) return premiumDifference;
          return Number(a.dataset.premiumRank || 999999) - Number(b.dataset.premiumRank || 999999);
        });

        // Reorder only when necessary. This avoids repeated DOM mutations and browser freezes.
        const current = Array.from(parent.children).filter((child) => cards.includes(child as HTMLElement));
        const alreadySorted = sorted.every((card, index) => current[index] === card);
        if (!alreadySorted) sorted.forEach((card) => parent.appendChild(card));
      };

      // The directory renders after its database request. A few bounded retries are enough
      // and avoid the previous body-wide MutationObserver feedback loop.
      [0, 250, 750, 1500].forEach((delay) => {
        timers.push(window.setTimeout(enhance, delay));
      });
    }

    void apply();
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return null;
}

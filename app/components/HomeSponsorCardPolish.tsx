"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { useCurrentSite } from "../lib/sites/SiteContext";

const supabase = getSupabaseBrowserClient();
const TIERS = ["Platinum Contributor", "Gold Contributor", "Silver Contributor", "Bronze Contributor", "Community Contributor"];

function normalizeTier(value: string) {
  const tier = String(value || "");
  if (/platinum/i.test(tier)) return "Platinum Contributor";
  if (/gold/i.test(tier)) return "Gold Contributor";
  if (/silver/i.test(tier)) return "Silver Contributor";
  if (/bronze/i.test(tier)) return "Bronze Contributor";
  return "Community Contributor";
}

function tierTone(label: string) {
  const value = label.toLowerCase();
  if (value.includes("platinum")) return { badge: "◆ Platinum Contributor", border: "#94a3b8", background: "linear-gradient(145deg,#ffffff 0%,#eef2f7 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#f8fafc 100%)" };
  if (value.includes("gold")) return { badge: "★ Gold Contributor", border: "#e5b94f", background: "linear-gradient(145deg,#fffdf7 0%,#fff7dc 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#fffaf0 100%)" };
  if (value.includes("silver")) return { badge: "Silver Contributor", border: "#cbd5e1", background: "linear-gradient(145deg,#ffffff 0%,#f1f5f9 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#f8fafc 100%)" };
  if (value.includes("bronze")) return { badge: "Bronze Contributor", border: "#d6a36a", background: "linear-gradient(145deg,#ffffff 0%,#fff7ed 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#fffaf5 100%)" };
  return { badge: "Community Contributor", border: "#f9a8d4", background: "linear-gradient(145deg,#ffffff 0%,#fdf2f8 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#fff7fb 100%)" };
}

function createCard(contributor: any, tier: string) {
  const tone = tierTone(tier);
  const wrapper = contributor.website ? document.createElement("a") : document.createElement("div");
  if (contributor.website) {
    const link = wrapper as HTMLAnchorElement;
    link.href = contributor.website;
    link.target = "_blank";
    link.rel = "noreferrer";
  }

  const card = document.createElement("div");
  card.className = "relative h-full overflow-hidden rounded-2xl border p-3 text-center shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl";
  card.style.borderColor = tone.border;
  card.style.background = tone.background;

  const badge = document.createElement("span");
  badge.textContent = tone.badge;
  badge.className = "absolute left-4 top-4 z-10 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide shadow-sm";
  badge.style.background = tone.border;
  badge.style.color = "#111827";
  card.appendChild(badge);

  const logoFrame = document.createElement("div");
  logoFrame.className = "mt-8 mb-3 grid w-full place-items-center overflow-hidden rounded-2xl border p-4 sm:p-5";
  logoFrame.style.height = "clamp(190px, 24vw, 270px)";
  logoFrame.style.background = tone.canvas;
  logoFrame.style.borderColor = `${tone.border}66`;

  if (contributor.logo_url) {
    const image = document.createElement("img");
    image.src = contributor.logo_url;
    image.alt = contributor.name || "Contributor";
    image.className = "block h-full w-full object-contain";
    logoFrame.appendChild(image);
  } else {
    const fallback = document.createElement("span");
    fallback.textContent = contributor.name || "SDTV Contributor";
    fallback.className = "px-4 text-center font-black text-pink-600";
    logoFrame.appendChild(fallback);
  }
  card.appendChild(logoFrame);

  const name = document.createElement("h3");
  name.textContent = contributor.name || "SDTV Contributor";
  name.className = "px-2 text-xl font-black leading-tight text-slate-950";
  card.appendChild(name);

  if (contributor.website) {
    const visit = document.createElement("p");
    visit.textContent = "Visit Contributor →";
    visit.className = "mx-2 mb-1 mt-2 inline-flex rounded-full bg-pink-600 px-4 py-2 text-sm font-black text-white";
    card.appendChild(visit);
  }

  wrapper.appendChild(card);
  return wrapper;
}

async function renderContributorSection(siteId: string, siteName: string): Promise<boolean> {
  if (typeof window === "undefined" || window.location.pathname !== "/") return true;

  const heading = Array.from(document.querySelectorAll("h2")).find((item) =>
    ["Our Sponsors", "Our Contributors"].includes(item.textContent?.trim() || "")
  );
  const section = heading?.closest("section");
  const content = heading?.parentElement;
  if (!heading || !section || !content) return false;
  if (section.getAttribute("data-sdtv-contributors-rendered") === "true") return true;

  const { data, error } = await supabase
    .from("homepage_sponsors")
    .select("id,name,website,logo_url,tier,display_order,active")
    .eq("site_id", siteId)
    .eq("active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return true;

  section.setAttribute("data-sdtv-contributors-rendered", "true");
  heading.textContent = "Our Contributors";

  const eyebrow = Array.from(content.querySelectorAll("p")).find((item) => item.textContent?.trim() === "Sponsors");
  if (eyebrow) eyebrow.textContent = "Contributors";
  const description = Array.from(content.querySelectorAll("p")).find((item) => /partners supporting Seattle Desi TV/i.test(item.textContent || ""));
  if (description) description.textContent = `Thank you to the businesses and community contributors supporting ${siteName}.`;

  let tierContainer = Array.from(content.children).find(
    (child) => child instanceof HTMLElement && child.classList.contains("space-y-8")
  ) as HTMLElement | undefined;

  const emptyMessage = Array.from(content.querySelectorAll("p")).find((item) => /Sponsors will appear here|Contributors will appear here/i.test(item.textContent || ""));
  if (!tierContainer) {
    tierContainer = document.createElement("div");
    tierContainer.className = "space-y-8";
    if (emptyMessage) emptyMessage.replaceWith(tierContainer);
    else content.appendChild(tierContainer);
  } else if (emptyMessage) {
    emptyMessage.remove();
  }

  tierContainer.replaceChildren();
  const contributors = data || [];
  if (!contributors.length) {
    const message = document.createElement("p");
    message.className = "text-gray-500";
    message.textContent = "Contributors will appear here after they are added in Studio.";
    tierContainer.appendChild(message);
    return true;
  }

  TIERS.forEach((tier) => {
    const rows = contributors.filter((row: any) => normalizeTier(row.tier) === tier);
    if (!rows.length) return;

    const block = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "mb-4 text-2xl font-black";
    title.textContent = `${tier}s`;
    block.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "grid gap-5 md:grid-cols-2 xl:grid-cols-4";
    rows.forEach((row: any) => grid.appendChild(createCard(row, tier)));
    block.appendChild(grid);
    tierContainer?.appendChild(block);
  });

  return true;
}

export default function HomeSponsorCardPolish() {
  const site = useCurrentSite();
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const tryRender = async () => {
      if (cancelled) return;
      attempts += 1;
      if (!site.id) return;
      const complete = await renderContributorSection(site.id, site.name);
      if (!complete && attempts < 12 && !cancelled) window.setTimeout(tryRender, 300);
    };

    tryRender();
    return () => { cancelled = true; };
  }, [site.id, site.name]);

  return null;
}

"use client";

import { useEffect } from "react";

function tierTone(label: string) {
  const value = label.toLowerCase();
  if (value.includes("platinum")) return { badge: "◆ Platinum Contributor", border: "#94a3b8", background: "linear-gradient(145deg,#ffffff 0%,#eef2f7 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#f8fafc 100%)" };
  if (value.includes("gold")) return { badge: "★ Gold Contributor", border: "#e5b94f", background: "linear-gradient(145deg,#fffdf7 0%,#fff7dc 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#fffaf0 100%)" };
  if (value.includes("silver")) return { badge: "Silver Contributor", border: "#cbd5e1", background: "linear-gradient(145deg,#ffffff 0%,#f1f5f9 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#f8fafc 100%)" };
  if (value.includes("bronze")) return { badge: "Bronze Contributor", border: "#d6a36a", background: "linear-gradient(145deg,#ffffff 0%,#fff7ed 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#fffaf5 100%)" };
  return { badge: "Community Contributor", border: "#f9a8d4", background: "linear-gradient(145deg,#ffffff 0%,#fdf2f8 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#fff7fb 100%)" };
}

function applyContributorCardPolish() {
  if (typeof window === "undefined" || window.location.pathname !== "/") return;
  const heading = Array.from(document.querySelectorAll("h2")).find((item) => ["Our Sponsors", "Our Contributors"].includes(item.textContent?.trim() || ""));
  const section = heading?.closest("section");
  if (!section || section.getAttribute("data-sdtv-contributor-polished") === "true") return;
  section.setAttribute("data-sdtv-contributor-polished", "true");

  const eyebrow = Array.from(section.querySelectorAll("p")).find((item) => item.textContent?.trim() === "Sponsors");
  if (eyebrow) eyebrow.textContent = "Contributors";
  if (heading) heading.textContent = "Our Contributors";
  const description = Array.from(section.querySelectorAll("p")).find((item) => /partners supporting Seattle Desi TV/i.test(item.textContent || ""));
  if (description) description.textContent = "Thank you to the businesses and community contributors supporting Seattle Desi TV.";
  const empty = Array.from(section.querySelectorAll("p")).find((item) => /Sponsors will appear here/i.test(item.textContent || ""));
  if (empty) empty.textContent = "Contributors will appear here after they are added in Studio.";

  const tierHeadings = Array.from(section.querySelectorAll("h3")).filter((item) => /sponsors|partners|contributors/i.test(item.textContent || ""));
  tierHeadings.forEach((tierHeading) => {
    tierHeading.textContent = String(tierHeading.textContent || "")
      .replace(/Gold Sponsors?/i, "Gold Contributors")
      .replace(/Silver Sponsors?/i, "Silver Contributors")
      .replace(/Community Partners?/i, "Community Contributors")
      .replace(/Platinum Sponsors?/i, "Platinum Contributors")
      .replace(/Bronze Sponsors?/i, "Bronze Contributors");
    const tone = tierTone(tierHeading.textContent || "");
    const tierBlock = tierHeading.parentElement;
    const grid = tierBlock?.querySelector(":scope > div.grid");
    if (!grid) return;
    grid.classList.remove("xl:grid-cols-4");
    grid.classList.add("sm:grid-cols-2", "lg:grid-cols-3", "2xl:grid-cols-4");
    Array.from(grid.children).forEach((entry) => {
      const card = entry.matches("a") ? entry.firstElementChild : entry;
      if (!(card instanceof HTMLElement) || card.dataset.sdtvContributorShowcase === "true") return;
      card.dataset.sdtvContributorShowcase = "true";
      card.classList.remove("p-5", "shadow-sm");
      card.classList.add("relative", "overflow-hidden", "group", "p-3", "shadow-lg", "hover:-translate-y-1", "hover:shadow-2xl", "duration-300");
      card.style.minHeight = "0"; card.style.borderColor = tone.border; card.style.background = tone.background;
      const badge = document.createElement("span"); badge.textContent = tone.badge; badge.className = "absolute left-4 top-4 z-10 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide shadow-sm"; badge.style.background = tone.border; badge.style.color = "#111827"; card.prepend(badge);
      const logoFrame = Array.from(card.children).find((child) => child instanceof HTMLElement && child.querySelector("img")) as HTMLElement | undefined;
      if (logoFrame) { logoFrame.className = "mt-8 mb-3 grid w-full place-items-center overflow-hidden rounded-2xl border p-4 sm:p-5"; logoFrame.style.height = "clamp(190px, 24vw, 270px)"; logoFrame.style.background = tone.canvas; logoFrame.style.borderColor = `${tone.border}66`; const image = logoFrame.querySelector("img"); if (image instanceof HTMLImageElement) { image.className = "block transition duration-300 group-hover:scale-[1.03]"; image.style.width = "100%"; image.style.height = "100%"; image.style.maxWidth = "100%"; image.style.maxHeight = "100%"; image.style.objectFit = "contain"; image.style.objectPosition = "center"; image.style.padding = "0"; } }
      const name = card.querySelector("h3"); if (name) name.className = "px-2 text-xl font-black leading-tight text-slate-950";
      const visit = Array.from(card.querySelectorAll("p")).find((item) => /visit sponsor|visit contributor/i.test(item.textContent || ""));
      if (visit instanceof HTMLElement) { visit.textContent = "Visit Contributor →"; visit.className = "mx-2 mb-1 mt-2 inline-flex rounded-full bg-pink-600 px-4 py-2 text-sm font-black text-white transition group-hover:bg-pink-500"; }
    });
  });
}

export default function HomeSponsorCardPolish() {
  useEffect(() => { applyContributorCardPolish(); const observer = new MutationObserver(applyContributorCardPolish); observer.observe(document.body, { childList: true, subtree: true }); return () => observer.disconnect(); }, []);
  return null;
}

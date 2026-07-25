"use client";

import { useEffect } from "react";

function applyPremiumBusinessPolish() {
  if (typeof window === "undefined" || window.location.pathname !== "/businesses") return;

  const cards = Array.from(document.querySelectorAll("article"));
  cards.forEach((card) => {
    if (!(card instanceof HTMLElement) || card.dataset.sdtvPremiumCard === "true") return;

    const premiumBadge = Array.from(card.querySelectorAll("span")).find((span) =>
      /premium|featured|community partner/i.test((span.textContent || "").trim())
    );
    if (!(premiumBadge instanceof HTMLElement)) return;

    card.dataset.sdtvPremiumCard = "true";
    card.classList.add("relative", "overflow-hidden", "shadow-xl", "hover:-translate-y-1", "hover:shadow-2xl", "duration-300");
    card.style.borderColor = "#e7b83f";
    card.style.borderWidth = "2px";
    card.style.background = "linear-gradient(180deg,#fffdf7 0%,#ffffff 44%)";
    card.style.boxShadow = "0 18px 45px rgba(146,96,12,.15)";

    premiumBadge.textContent = `${premiumBadge.textContent?.trim() || "Premium"} · Featured`;
    premiumBadge.className = "absolute left-0 top-0 z-20 rounded-br-2xl bg-gradient-to-r from-amber-400 to-yellow-300 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-amber-950 shadow-lg";

    const imageWrapper = card.firstElementChild;
    if (imageWrapper instanceof HTMLElement) {
      imageWrapper.style.borderBottom = "1px solid rgba(217,160,28,.35)";
      const image = imageWrapper.querySelector("img");
      if (image instanceof HTMLElement) image.classList.add("transition", "duration-500", "hover:scale-[1.025]");
    }

    const content = Array.from(card.children).find((child) => child !== imageWrapper) as HTMLElement | undefined;
    if (!content) return;

    const featuredNote = document.createElement("div");
    featuredNote.className = "mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900";
    featuredNote.innerHTML = '<span>★ Featured business</span><span class="text-amber-700">Priority placement</span>';
    content.prepend(featuredNote);

    const greenOffer = Array.from(content.querySelectorAll("p")).find((item) => {
      const cls = item.getAttribute("class") || "";
      return cls.includes("green") || /discount|off|offer|available/i.test(item.textContent || "");
    });
    if (greenOffer instanceof HTMLElement) {
      greenOffer.className = "mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black leading-relaxed text-emerald-800";
    }

    const reviewLink = Array.from(content.querySelectorAll("a")).find((link) => /reviews/i.test(link.textContent || ""));
    const reviewArea = reviewLink?.parentElement;
    if (reviewArea instanceof HTMLElement) {
      reviewArea.classList.add("rounded-xl", "border", "border-amber-100", "bg-amber-50/60", "px-3", "py-3");
    }

    const actionLinks = Array.from(content.querySelectorAll("a")).filter((link) => /website|map/i.test(link.textContent || ""));
    actionLinks.forEach((link, index) => {
      if (!(link instanceof HTMLElement)) return;
      link.classList.add("shadow-sm", "transition", "hover:-translate-y-0.5");
      if (index === 0) link.style.boxShadow = "0 8px 18px rgba(219,39,119,.18)";
    });
  });
}

export default function PremiumBusinessCardPolish() {
  useEffect(() => {
    applyPremiumBusinessPolish();
    const observer = new MutationObserver(applyPremiumBusinessPolish);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

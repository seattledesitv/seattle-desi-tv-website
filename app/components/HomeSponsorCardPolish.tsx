"use client";

import { useEffect } from "react";

function tierTone(label: string) {
  const value = label.toLowerCase();
  if (value.includes("gold")) return { badge: "★ Gold Sponsor", border: "#e5b94f", background: "linear-gradient(145deg,#fffdf7 0%,#fff7dc 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#fffaf0 100%)" };
  if (value.includes("silver")) return { badge: "Silver Sponsor", border: "#cbd5e1", background: "linear-gradient(145deg,#ffffff 0%,#f1f5f9 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#f8fafc 100%)" };
  return { badge: "Community Partner", border: "#f9a8d4", background: "linear-gradient(145deg,#ffffff 0%,#fdf2f8 100%)", canvas: "linear-gradient(145deg,#ffffff 0%,#fff7fb 100%)" };
}

function applySponsorCardPolish() {
  if (typeof window === "undefined" || window.location.pathname !== "/") return;

  const sponsorHeading = Array.from(document.querySelectorAll("h2")).find(
    (heading) => heading.textContent?.trim() === "Our Sponsors"
  );
  const section = sponsorHeading?.closest("section");
  if (!section) return;

  section.setAttribute("data-sdtv-sponsor-polished", "true");

  const tierHeadings = Array.from(section.querySelectorAll("h3")).filter((heading) =>
    /sponsors|partners/i.test(heading.textContent || "")
  );

  tierHeadings.forEach((heading) => {
    const tone = tierTone(heading.textContent || "");
    const tierBlock = heading.parentElement;
    const grid = tierBlock?.querySelector(":scope > div.grid");
    if (!grid) return;

    grid.classList.remove("xl:grid-cols-4");
    grid.classList.add("sm:grid-cols-2", "lg:grid-cols-3", "2xl:grid-cols-4");

    Array.from(grid.children).forEach((entry) => {
      const card = entry.matches("a") ? entry.firstElementChild : entry;
      if (!(card instanceof HTMLElement) || card.dataset.sdtvSponsorShowcase === "true") return;
      card.dataset.sdtvSponsorShowcase = "true";

      card.classList.remove("p-5", "shadow-sm");
      card.classList.add("relative", "overflow-hidden", "group", "p-3", "shadow-lg", "hover:-translate-y-1", "hover:shadow-2xl", "duration-300");
      card.style.minHeight = "0";
      card.style.borderColor = tone.border;
      card.style.background = tone.background;

      const badge = document.createElement("span");
      badge.textContent = tone.badge;
      badge.className = "absolute left-4 top-4 z-10 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide shadow-sm";
      badge.style.background = tone.border;
      badge.style.color = "#111827";
      card.prepend(badge);

      const logoFrame = Array.from(card.children).find((child) => child instanceof HTMLElement && child.querySelector("img")) as HTMLElement | undefined;
      if (logoFrame) {
        logoFrame.className = "mt-8 mb-3 grid w-full place-items-center overflow-hidden rounded-2xl border p-4 sm:p-5";
        logoFrame.style.height = "clamp(190px, 24vw, 270px)";
        logoFrame.style.background = tone.canvas;
        logoFrame.style.borderColor = `${tone.border}66`;

        const image = logoFrame.querySelector("img");
        if (image instanceof HTMLImageElement) {
          image.className = "block transition duration-300 group-hover:scale-[1.03]";
          image.style.width = "100%";
          image.style.height = "100%";
          image.style.maxWidth = "100%";
          image.style.maxHeight = "100%";
          image.style.objectFit = "contain";
          image.style.objectPosition = "center";
          image.style.padding = "0";
        }
      }

      const name = card.querySelector("h3");
      if (name) {
        name.className = "px-2 text-xl font-black leading-tight text-slate-950";
      }

      const visit = Array.from(card.querySelectorAll("p")).find((item) => /visit sponsor/i.test(item.textContent || ""));
      if (visit instanceof HTMLElement) {
        visit.textContent = "Visit Sponsor →";
        visit.className = "mx-2 mb-1 mt-2 inline-flex rounded-full bg-pink-600 px-4 py-2 text-sm font-black text-white transition group-hover:bg-pink-500";
      }
    });
  });
}

export default function HomeSponsorCardPolish() {
  useEffect(() => {
    applySponsorCardPolish();
    const observer = new MutationObserver(applySponsorCardPolish);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

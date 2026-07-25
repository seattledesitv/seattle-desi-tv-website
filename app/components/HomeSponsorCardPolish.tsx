"use client";

import { useEffect } from "react";

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
    const tierBlock = heading.parentElement;
    const grid = tierBlock?.querySelector(":scope > div.grid");
    if (!grid) return;

    grid.classList.remove("xl:grid-cols-4");
    grid.classList.add("lg:grid-cols-3", "2xl:grid-cols-4");

    Array.from(grid.children).forEach((entry) => {
      const card = entry.matches("a") ? entry.firstElementChild : entry;
      if (!(card instanceof HTMLElement)) return;

      card.classList.remove("p-5");
      card.classList.add("p-4", "overflow-hidden", "group");
      card.style.minHeight = "0";

      const logoFrame = card.firstElementChild;
      if (logoFrame instanceof HTMLElement) {
        logoFrame.classList.remove("h-24", "mb-4");
        logoFrame.classList.add("h-36", "md:h-40", "mb-3", "p-3");

        const image = logoFrame.querySelector("img");
        if (image instanceof HTMLImageElement) {
          image.classList.remove("max-h-20", "p-2");
          image.classList.add("max-h-full", "max-w-[92%]", "object-contain", "transition", "duration-300", "group-hover:scale-105");
        }
      }

      const name = card.querySelector("h3");
      if (name) {
        name.classList.remove("text-lg");
        name.classList.add("text-xl", "leading-tight");
      }

      const visit = card.querySelector("p");
      if (visit) {
        visit.classList.remove("mt-2");
        visit.classList.add("mt-1");
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

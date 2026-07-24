"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CLAMPED_HEIGHT = "6.5rem";

export default function BusinessDirectoryOfferClamp() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/businesses") return;

    const enhance = () => {
      document.querySelectorAll<HTMLElement>("main article p.whitespace-pre-line").forEach((paragraph) => {
        if (paragraph.dataset.offerClampReady === "true") return;
        paragraph.dataset.offerClampReady = "true";

        const fullHeight = paragraph.scrollHeight;
        if (fullHeight <= 112) return;

        paragraph.style.maxHeight = CLAMPED_HEIGHT;
        paragraph.style.overflow = "hidden";
        paragraph.style.position = "relative";
        paragraph.style.transition = "max-height 220ms ease";

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Show more";
        button.className = "mt-2 text-sm font-black text-pink-600 hover:text-pink-700";
        button.setAttribute("aria-expanded", "false");

        button.addEventListener("click", () => {
          const expanded = button.getAttribute("aria-expanded") === "true";
          button.setAttribute("aria-expanded", String(!expanded));
          button.textContent = expanded ? "Show more" : "Show less";
          paragraph.style.maxHeight = expanded ? CLAMPED_HEIGHT : `${paragraph.scrollHeight}px`;
        });

        paragraph.insertAdjacentElement("afterend", button);
      });
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}

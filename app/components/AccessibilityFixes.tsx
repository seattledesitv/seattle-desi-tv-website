"use client";

import { useEffect } from "react";

function labelFromContext(element: Element, fallback: string) {
  const parentText = element.closest("section, form, div")?.textContent || "";
  const text = parentText.toLowerCase();
  if (text.includes("month")) return "Month filter";
  if (text.includes("year")) return "Year filter";
  if (text.includes("view")) return "View mode";
  if (text.includes("category")) return "Category filter";
  if (text.includes("status")) return "Status filter";
  if (text.includes("search")) return "Search filter";
  return fallback;
}

export default function AccessibilityFixes() {
  useEffect(() => {
    function patchAccessibility() {
      document.querySelectorAll("select").forEach((select, index) => {
        if (!select.getAttribute("aria-label") && !select.getAttribute("aria-labelledby")) {
          select.setAttribute("aria-label", labelFromContext(select, `Select option ${index + 1}`));
        }
      });

      document.querySelectorAll("input, textarea").forEach((field, index) => {
        const input = field as HTMLInputElement | HTMLTextAreaElement;
        if (input.type === "hidden") return;
        if (!input.id) input.id = `sdtv-field-${index + 1}`;
        if (!input.getAttribute("aria-label") && !input.getAttribute("aria-labelledby")) {
          const placeholder = input.getAttribute("placeholder");
          const type = input.getAttribute("type");
          if (placeholder) input.setAttribute("aria-label", placeholder);
          else if (type === "month") input.setAttribute("aria-label", "Calendar month");
        }
      });

      document.querySelectorAll("button").forEach((button, index) => {
        const text = button.textContent?.trim();
        if (!text && !button.getAttribute("aria-label")) button.setAttribute("aria-label", `Button ${index + 1}`);
      });

      document.querySelectorAll("img").forEach((image, index) => {
        if (!image.getAttribute("alt")) image.setAttribute("alt", `Seattle Desi TV image ${index + 1}`);
        if (!image.getAttribute("loading")) image.setAttribute("loading", "lazy");
        if (!image.getAttribute("decoding")) image.setAttribute("decoding", "async");
      });
    }

    patchAccessibility();
    const observer = new MutationObserver(() => patchAccessibility());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

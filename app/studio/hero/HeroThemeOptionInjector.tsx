"use client";

import { useEffect } from "react";

const EXTRA_THEMES = [
  ["crimson", "Crimson"],
  ["teal", "Teal"],
  ["royal", "Royal Indigo"],
  ["sunset", "Sunset"],
  ["monochrome", "Monochrome"],
] as const;

function isHeroThemeSelect(select: HTMLSelectElement) {
  const values = Array.from(select.options).map((option) => option.value);
  return values.includes("fallback") && values.includes("gold") && values.includes("pink");
}

export default function HeroThemeOptionInjector() {
  useEffect(() => {
    function addOptions() {
      document.querySelectorAll("select").forEach((element) => {
        const select = element as HTMLSelectElement;
        if (!isHeroThemeSelect(select)) return;
        EXTRA_THEMES.forEach(([value, label]) => {
          if (Array.from(select.options).some((option) => option.value === value)) return;
          select.add(new Option(label, value));
        });
      });
    }

    addOptions();
    const observer = new MutationObserver(addOptions);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

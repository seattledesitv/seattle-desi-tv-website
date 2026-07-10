"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import HomepageHeroLoader from "./HomepageHeroLoader";

export default function HomepageHeroBridge() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>(".sdtv-legacy-home-root > main");
    if (!main) return;

    const oldHero = Array.from(main.children).find((child) => child.tagName === "SECTION") as HTMLElement | undefined;
    if (!oldHero) return;

    const mount = document.createElement("div");
    mount.setAttribute("data-modular-home-hero", "true");
    main.insertBefore(mount, oldHero);
    oldHero.style.display = "none";
    setTarget(mount);

    return () => {
      oldHero.style.display = "";
      mount.remove();
    };
  }, []);

  return target ? createPortal(<HomepageHeroLoader />, target) : null;
}

"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteConfig } from "./types";

const SiteContext = createContext<SiteConfig | null>(null);

export function SiteProvider({ site, children }: { site: SiteConfig; children: ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useCurrentSite() {
  const site = useContext(SiteContext);
  if (!site) throw new Error("useCurrentSite must be used inside SiteProvider.");
  return site;
}

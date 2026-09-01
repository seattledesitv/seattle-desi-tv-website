"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { useCurrentSite } from "../lib/sites/SiteContext";
import { forSite } from "../lib/sites/query";

const supabase = getSupabaseBrowserClient();

type OwnershipBusiness = { id: string; name: string; address?: string | null; owner_verified_at?: string | null; image_position_x?: number | null; image_position_y?: number | null; image_zoom?: number | null };

export default function BusinessOwnershipActions() {
  const site = useCurrentSite();
  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/businesses") return;
    let cancelled = false;
    let enhancing = false;

    async function loadBusinesses(): Promise<OwnershipBusiness[]> {
      const enhanced = await forSite(supabase.from("local_businesses").select("id,name,address,owner_verified_at,image_position_x,image_position_y,image_zoom"), site.id).eq("status", "approved");
      if (!enhanced.error) return (enhanced.data || []) as OwnershipBusiness[];
      const fallback = await forSite(supabase.from("local_businesses").select("id,name,address,owner_verified_at"), site.id).eq("status", "approved");
      if (!fallback.error) return (fallback.data || []) as OwnershipBusiness[];
      const basic = await forSite(supabase.from("local_businesses").select("id,name,address"), site.id).eq("status", "approved");
      return (basic.data || []) as OwnershipBusiness[];
    }

    async function enhance() {
      if (enhancing || cancelled) return;
      enhancing = true;
      try {
        const data = await loadBusinesses();
        if (cancelled || !data.length) return;
        const byName = new Map(data.map((row) => [String(row.name || "").trim().toLowerCase(), row]));
        document.querySelectorAll("main article").forEach((article) => {
          const heading = article.querySelector("h2");
          const name = String(heading?.textContent || "").trim().toLowerCase();
          const business = byName.get(name);
          if (!business) return;

          const image = article.querySelector("img.object-cover") as HTMLImageElement | null;
          if (image) {
            image.style.objectPosition = `${Number(business.image_position_x ?? 50)}% ${Number(business.image_position_y ?? 50)}%`;
            image.style.transform = `scale(${Math.max(1, Number(business.image_zoom ?? 1))})`;
            image.style.transformOrigin = `${Number(business.image_position_x ?? 50)}% ${Number(business.image_position_y ?? 50)}%`;
          }

          if (article.getAttribute("data-ownership-actions") === "yes") return;
          const body = heading?.closest("div.p-5") || article.lastElementChild;
          if (!(body instanceof HTMLElement)) return;
          article.setAttribute("data-ownership-actions", "yes");
          const panel = document.createElement("div");
          panel.className = "mt-4 border-t border-slate-100 pt-4 text-xs";
          const verified = Boolean(business.owner_verified_at);
          panel.innerHTML = verified
            ? `<div class="flex flex-wrap items-center gap-3"><span class="rounded-full bg-emerald-50 px-3 py-2 font-black text-emerald-700">✓ Owner verified</span><a class="font-bold text-pink-600 hover:text-pink-700" href="/my-businesses/image-editor?business=${business.id}">Manage image</a><a class="font-bold text-slate-500 hover:text-pink-600" href="/businesses/suggest-edit?business=${business.id}">Suggest an edit</a></div>`
            : `<p class="mb-3 font-bold text-slate-600">Do you own or manage this business?</p><div class="flex flex-wrap items-center gap-3"><a class="rounded-full bg-pink-600 px-3 py-2 font-black text-white hover:bg-pink-700" href="/businesses/claim?business=${business.id}">Manage this Business</a><a class="font-bold text-slate-500 hover:text-pink-600" href="/businesses/suggest-edit?business=${business.id}">Suggest an edit</a></div>`;
          body.appendChild(panel);
        });
      } finally {
        enhancing = false;
      }
    }

    enhance();
    const observer = new MutationObserver(() => { void enhance(); });
    observer.observe(document.body, { childList: true, subtree: true });
    const retry = window.setInterval(() => { void enhance(); }, 1500);
    return () => { cancelled = true; observer.disconnect(); window.clearInterval(retry); };
  }, []);
  return null;
}

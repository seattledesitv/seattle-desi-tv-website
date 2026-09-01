"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { useCurrentSite } from "../lib/sites/SiteContext";
import { forSite } from "../lib/sites/query";

const supabase = getSupabaseBrowserClient();

export default function BusinessReviewSummaryEnhancer() {
  const site = useCurrentSite();
  useEffect(() => {
    if (window.location.pathname !== "/businesses") return;
    let cancelled = false;

    async function enhance() {
      const businessResult = await forSite(supabase.from("local_businesses").select("id,name"), site.id).eq("status", "approved");
      if (cancelled || businessResult.error) return;
      const reviewResult = await forSite(supabase.from("business_reviews").select("business_id,rating"), site.id).eq("status", "approved");
      if (cancelled || reviewResult.error) return;

      const stats: Record<string, { total: number; count: number }> = {};
      (reviewResult.data || []).forEach((review: any) => {
        const current = stats[review.business_id] || { total: 0, count: 0 };
        current.total += Number(review.rating || 0); current.count += 1; stats[review.business_id] = current;
      });
      const byName = new Map((businessResult.data || []).map((business: any) => [String(business.name || "").trim().toLowerCase(), business]));

      document.querySelectorAll("main article").forEach((article) => {
        if (article.getAttribute("data-sdtv-reviews") === "yes") return;
        const heading = article.querySelector("h2");
        const business = byName.get(String(heading?.textContent || "").trim().toLowerCase());
        if (!business) return;
        article.setAttribute("data-sdtv-reviews", "yes");
        const content = article.querySelector(".p-5") || article.lastElementChild;
        if (!content) return;
        const value = stats[business.id] || { total: 0, count: 0 };
        const average = value.count ? (value.total / value.count).toFixed(1) : "New";
        const row = document.createElement("div");
        row.className = "mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4";
        row.innerHTML = `<div class="text-sm"><span class="font-black text-amber-500">★ ${average}</span><span class="ml-2 text-slate-500">${value.count ? `${value.count} review${value.count === 1 ? "" : "s"}` : "Be the first to review"}</span></div><a class="whitespace-nowrap text-sm font-black text-pink-600" href="/businesses/reviews?business=${encodeURIComponent(business.id)}">Reviews →</a>`;
        content.appendChild(row);
      });
    }

    enhance();
    const observer = new MutationObserver(() => enhance());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { cancelled = true; observer.disconnect(); };
  }, [site.id]);
  return null;
}

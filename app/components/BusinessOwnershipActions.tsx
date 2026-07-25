"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function BusinessOwnershipActions() {
  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/businesses") return;
    let cancelled = false;

    async function enhance() {
      const { data } = await supabase.from("local_businesses").select("id,name,address,owner_verified_at").eq("status", "approved");
      if (cancelled || !data) return;
      const byName = new Map(data.map((row: any) => [String(row.name || "").trim().toLowerCase(), row]));
      document.querySelectorAll("main article").forEach((article) => {
        if (article.getAttribute("data-ownership-actions") === "yes") return;
        const heading = article.querySelector("h2");
        const name = String(heading?.textContent || "").trim().toLowerCase();
        const business = byName.get(name);
        if (!business) return;
        article.setAttribute("data-ownership-actions", "yes");
        const body = heading?.closest(".p-5") || article.lastElementChild;
        if (!body) return;
        const panel = document.createElement("div");
        panel.className = "mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs";
        const verified = Boolean((business as any).owner_verified_at);
        panel.innerHTML = verified
          ? `<span class="rounded-full bg-emerald-50 px-3 py-2 font-black text-emerald-700">✓ Owner verified</span><a class="font-bold text-slate-500 hover:text-pink-600" href="/businesses/suggest-edit?business=${business.id}">Suggest an edit</a>`
          : `<a class="rounded-full bg-slate-100 px-3 py-2 font-black text-slate-700 hover:bg-pink-50 hover:text-pink-700" href="/businesses/claim?business=${business.id}">Are you the owner?</a><a class="font-bold text-slate-500 hover:text-pink-600" href="/businesses/suggest-edit?business=${business.id}">Suggest an edit</a>`;
        body.appendChild(panel);
      });
    }

    enhance();
    const observer = new MutationObserver(() => enhance());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { cancelled = true; observer.disconnect(); };
  }, []);
  return null;
}

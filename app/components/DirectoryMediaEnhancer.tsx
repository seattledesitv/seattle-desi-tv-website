"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type Row = { id: string; name: string; image?: string | null; image_urls?: string[] | null; image_position_x?: number | null; image_position_y?: number | null; image_zoom?: number | null; image_display_mode?: "cover" | "contain" | "blur" | null };
function imageFor(row: Row) { return Array.isArray(row.image_urls) && row.image_urls[0] ? row.image_urls[0] : row.image || ""; }
function key(value?: string | null) { return String(value || "").trim().toLowerCase(); }
function escapeAttribute(value: string) { return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }

function applyPresentation(container: HTMLElement, img: HTMLImageElement, row: Row) {
  const mode = row.image_display_mode || "cover";
  container.style.setProperty("background", mode === "contain" ? "white" : "#e2e8f0", "important");
  img.style.setProperty("position", "relative", "important");
  img.style.setProperty("z-index", "1", "important");
  if (mode === "cover") {
    img.style.setProperty("object-fit", "cover", "important");
    img.style.setProperty("object-position", `${Number(row.image_position_x ?? 50)}% ${Number(row.image_position_y ?? 50)}%`, "important");
    img.style.setProperty("transform", `scale(${Number(row.image_zoom ?? 1)})`, "important");
    img.style.setProperty("padding", "0", "important");
    img.style.setProperty("transform-origin", `${Number(row.image_position_x ?? 50)}% ${Number(row.image_position_y ?? 50)}%`, "important");
  } else {
    img.style.setProperty("object-fit", "contain", "important");
    img.style.setProperty("object-position", "center", "important");
    img.style.setProperty("transform", "none", "important");
    img.style.setProperty("padding", "12px", "important");
    if (mode === "blur") {
      container.style.setProperty("background-image", `linear-gradient(rgba(255,255,255,.38),rgba(255,255,255,.38)),url(\"${imageFor(row).replaceAll('"', '%22')}\")`, "important");
      container.style.setProperty("background-size", "cover", "important");
      container.style.setProperty("background-position", "center", "important");
    } else {
      container.style.removeProperty("background-image");
    }
  }
  container.dataset.imageDisplayMode = mode;
}

export default function DirectoryMediaEnhancer() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    const isBusinessPublic = path === "/businesses";
    const isOrganizationPublic = path === "/community-organizations";
    const isBusinessStudio = path === "/studio/businesses";
    const isOrganizationStudio = path === "/studio/community-orgs";
    if (!isBusinessPublic && !isOrganizationPublic && !isBusinessStudio && !isOrganizationStudio) return;

    let cancelled = false;
    let observer: MutationObserver | null = null;
    let interval = 0;

    async function run() {
      const business = isBusinessPublic || isBusinessStudio;
      const table = business ? "local_businesses" : "community_organizations";
      const query = supabase.from(table).select("id,name,image,image_urls,image_position_x,image_position_y,image_zoom,image_display_mode");
      const result = isBusinessPublic || isOrganizationPublic ? await query.eq("status", "approved") : await query;
      if (cancelled || result.error) return;
      const rows = (result.data || []) as Row[];
      const byName = new Map(rows.map((row) => [key(row.name), row]));

      if (isBusinessPublic) {
        document.querySelectorAll("main article").forEach((article) => {
          const row = byName.get(key(article.querySelector("h2")?.textContent)); if (!row) return;
          const img = article.querySelector("img"); if (!(img instanceof HTMLImageElement)) return;
          const container = img.parentElement instanceof HTMLElement ? img.parentElement : article as HTMLElement;
          applyPresentation(container, img, row);
        });
      }

      if (isOrganizationPublic) {
        document.querySelectorAll("main article").forEach((article) => {
          const name = key(article.querySelector("h3")?.textContent);
          const row = byName.get(name); const src = row ? imageFor(row) : "";
          if (!row || !src) return;
          let button = article.querySelector("[data-directory-media-image='yes']") as HTMLButtonElement | null;
          if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.dataset.directoryMediaImage = "yes";
            button.className = "group relative mb-5 block h-56 w-full overflow-hidden rounded-2xl bg-slate-100";
            button.innerHTML = `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(row.name)}" class="h-full w-full transition duration-300 group-hover:brightness-75"><span class="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-full bg-slate-950/80 px-4 py-3 text-center text-sm font-black text-white transition group-hover:translate-y-0">View full image</span>`;
            button.addEventListener("click", () => {
              const overlay = document.createElement("div");
              overlay.className = "fixed inset-0 z-[1000] grid place-items-center bg-slate-950/90 p-4";
              overlay.innerHTML = `<button class="absolute right-4 top-4 rounded-full bg-white px-4 py-2 font-black text-slate-950">Close ×</button><img src="${escapeAttribute(src)}" alt="${escapeAttribute(row.name)}" class="max-h-[90vh] max-w-[95vw] rounded-2xl bg-white object-contain shadow-2xl">`;
              overlay.addEventListener("click", (event) => { if (event.target === overlay || (event.target as HTMLElement).tagName === "BUTTON") overlay.remove(); });
              document.body.appendChild(overlay);
            });
            article.prepend(button);
          }
          const img = button.querySelector("img"); if (img instanceof HTMLImageElement) applyPresentation(button, img, row);
        });
      }

      if (isBusinessStudio) {
        document.querySelectorAll("main article").forEach((article) => {
          if (article.getAttribute("data-admin-media-link") === "yes") return;
          const row = byName.get(key(article.querySelector("h3")?.textContent)); if (!row) return;
          const fullEdit = Array.from(article.querySelectorAll("a")).find((anchor) => anchor.textContent?.includes("Full Edit"));
          if (!fullEdit?.parentElement) return;
          const link = document.createElement("a");
          link.href = `/studio/directory-image-editor?type=business&id=${row.id}`;
          link.className = "rounded-lg bg-pink-600 px-4 py-3 text-sm font-bold text-white";
          link.textContent = "Manage Image";
          fullEdit.parentElement.insertBefore(link, fullEdit.nextSibling);
          article.setAttribute("data-admin-media-link", "yes");
        });
      }

      if (isOrganizationStudio) {
        const heading = Array.from(document.querySelectorAll("main h2")).find((node) => byName.has(key(node.textContent)));
        if (heading && !document.querySelector("[data-organization-image-link='yes']")) {
          const row = byName.get(key(heading.textContent));
          if (row) {
            const link = document.createElement("a");
            link.href = `/studio/directory-image-editor?type=organization&id=${row.id}`;
            link.className = "mt-4 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white";
            link.textContent = "Manage Organization Image";
            link.setAttribute("data-organization-image-link", "yes");
            heading.parentElement?.appendChild(link);
          }
        }
      }
    }

    void run();
    observer = new MutationObserver(() => { void run(); });
    observer.observe(document.body, { childList: true, subtree: true });
    interval = window.setInterval(() => { void run(); }, 900);
    return () => { cancelled = true; observer?.disconnect(); window.clearInterval(interval); };
  }, []);
  return null;
}

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
  img.style.setProperty("position", "relative", "important"); img.style.setProperty("z-index", "1", "important");
  if (mode === "cover") {
    img.style.setProperty("object-fit", "cover", "important");
    img.style.setProperty("object-position", `${Number(row.image_position_x ?? 50)}% ${Number(row.image_position_y ?? 50)}%`, "important");
    img.style.setProperty("transform", `scale(${Number(row.image_zoom ?? 1)})`, "important");
    img.style.setProperty("padding", "0", "important");
    img.style.setProperty("transform-origin", `${Number(row.image_position_x ?? 50)}% ${Number(row.image_position_y ?? 50)}%`, "important");
  } else {
    img.style.setProperty("object-fit", "contain", "important"); img.style.setProperty("object-position", "center", "important"); img.style.setProperty("transform", "none", "important"); img.style.setProperty("padding", "12px", "important");
    if (mode === "blur") { container.style.setProperty("background-image", `linear-gradient(rgba(255,255,255,.38),rgba(255,255,255,.38)),url(\"${imageFor(row).replaceAll('"', '%22')}\")`, "important"); container.style.setProperty("background-size", "cover", "important"); container.style.setProperty("background-position", "center", "important"); }
    else container.style.removeProperty("background-image");
  }
  container.dataset.imageDisplayMode = mode;
}

async function loadRows(table: string, publicOnly: boolean) {
  const fullColumns = "id,name,image,image_urls,image_position_x,image_position_y,image_zoom,image_display_mode";
  const fallbackColumns = "id,name,image,image_position_x,image_position_y,image_zoom,image_display_mode";
  const fullQuery = supabase.from(table).select(fullColumns);
  const full = publicOnly ? await fullQuery.eq("status", "approved") : await fullQuery;
  if (!full.error) return (full.data || []) as Row[];
  if (!/image_urls/i.test(full.error.message || "")) return [];
  const fallbackQuery = supabase.from(table).select(fallbackColumns);
  const fallback = publicOnly ? await fallbackQuery.eq("status", "approved") : await fallbackQuery;
  return fallback.error ? [] : (fallback.data || []) as Row[];
}

function attachLightbox(button: HTMLButtonElement, src: string, name: string) {
  if (button.dataset.directoryLightboxReady === "yes") return;
  button.dataset.directoryLightboxReady = "yes";
  button.addEventListener("click", () => {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-[1000] grid place-items-center bg-slate-950/90 p-4";
    overlay.innerHTML = `<button class="absolute right-4 top-4 rounded-full bg-white px-4 py-2 font-black text-slate-950">Close ×</button><img src="${escapeAttribute(src)}" alt="${escapeAttribute(name)}" class="max-h-[90vh] max-w-[95vw] rounded-2xl bg-white object-contain shadow-2xl">`;
    overlay.addEventListener("click", (event) => { if (event.target === overlay || (event.target as HTMLElement).tagName === "BUTTON") overlay.remove(); });
    document.body.appendChild(overlay);
  });
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
    let cancelled = false; let observer: MutationObserver | null = null; let interval = 0;

    async function run() {
      const business = isBusinessPublic || isBusinessStudio;
      const rows = await loadRows(business ? "local_businesses" : "community_organizations", isBusinessPublic || isOrganizationPublic);
      if (cancelled || !rows.length) return;
      const byName = new Map(rows.map((row) => [key(row.name), row]));

      if (isBusinessPublic) document.querySelectorAll("main article").forEach((article) => { const row = byName.get(key(article.querySelector("h2")?.textContent)); if (!row) return; const img = article.querySelector("img"); if (!(img instanceof HTMLImageElement)) return; applyPresentation(img.parentElement instanceof HTMLElement ? img.parentElement : article as HTMLElement, img, row); });

      if (isOrganizationPublic) document.querySelectorAll("main article").forEach((article) => {
        const row = byName.get(key(article.querySelector("h3")?.textContent)); if (!row) return;
        const src = imageFor(row);
        if (src) {
          let button = article.querySelector("[data-directory-media-image='yes']") as HTMLButtonElement | null;
          if (!button) {
            button = document.createElement("button"); button.type = "button"; button.dataset.directoryMediaImage = "yes"; button.className = "group relative block h-56 w-full overflow-hidden bg-slate-100";
            button.innerHTML = `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(row.name)}" class="h-full w-full transition duration-300 group-hover:brightness-75"><span class="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-full bg-slate-950/80 px-4 py-3 text-center text-sm font-black text-white transition group-hover:translate-y-0">View full image</span>`;
            article.prepend(button);
          }
          attachLightbox(button, src, row.name);
          const img = button.querySelector("img"); if (img instanceof HTMLImageElement) applyPresentation(button, img, row);
        }
        if (!article.querySelector("[data-organization-manage-action='yes']")) {
          const panel = document.createElement("div"); panel.dataset.organizationManageAction = "yes"; panel.className = "mt-5 border-t border-slate-200 pt-4";
          panel.innerHTML = `<p class="mb-3 text-sm font-bold text-slate-600">Are you an authorized representative of this organization?</p><a href="/community-organizations/manage?organization=${row.id}" class="inline-flex rounded-full bg-pink-600 px-4 py-2 text-sm font-black text-white hover:bg-pink-700">Manage this Organization</a>`;
          article.appendChild(panel);
        }
      });

      if (isBusinessStudio) document.querySelectorAll("main article").forEach((article) => { if (article.getAttribute("data-admin-media-link") === "yes") return; const row = byName.get(key(article.querySelector("h3")?.textContent)); if (!row) return; const fullEdit = Array.from(article.querySelectorAll("a")).find((anchor) => anchor.textContent?.includes("Full Edit")); if (!fullEdit?.parentElement) return; const link = document.createElement("a"); link.href = `/studio/directory-image-editor?type=business&id=${row.id}`; link.className = "rounded-lg bg-pink-600 px-4 py-3 text-sm font-bold text-white"; link.textContent = "Manage Image"; fullEdit.parentElement.insertBefore(link, fullEdit.nextSibling); article.setAttribute("data-admin-media-link", "yes"); });

      if (isOrganizationStudio) { const heading = Array.from(document.querySelectorAll("main h2")).find((node) => byName.has(key(node.textContent))); if (heading && !document.querySelector("[data-organization-image-link='yes']")) { const row = byName.get(key(heading.textContent)); if (row) { const link = document.createElement("a"); link.href = `/studio/directory-image-editor?type=organization&id=${row.id}`; link.className = "mt-4 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white"; link.textContent = "Manage Organization Image"; link.setAttribute("data-organization-image-link", "yes"); heading.parentElement?.appendChild(link); } } }
    }
    void run(); observer = new MutationObserver(() => { void run(); }); observer.observe(document.body, { childList: true, subtree: true }); interval = window.setInterval(() => { void run(); }, 900);
    return () => { cancelled = true; observer?.disconnect(); window.clearInterval(interval); };
  }, []);
  return null;
}

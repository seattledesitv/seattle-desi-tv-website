"use client";

import { useEffect, useState } from "react";
import AccountMenu from "./AccountMenu";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";
import { useCurrentSite } from "../lib/sites/SiteContext";
import { forSite } from "../lib/sites/query";

const supabase = getSupabaseBrowserClient();
const HEADER_CACHE_KEY = "sdtv-header-state-v1";
const HERO_STYLE_ID = "sdtv-hero-theme-style";
const HERO_THEMES = ["fallback", "gold", "pink", "blue", "festival", "cinematic", "emerald"];
let heroThemeByImage: Record<string, string> = {};

type HeaderLink = { label: string; href: string; show: boolean; primary?: boolean };

function readCachedHeaderState() {
  if (typeof window === "undefined") return { email: "", role: "general_public" };
  try {
    const raw = window.localStorage.getItem(HEADER_CACHE_KEY);
    return raw ? JSON.parse(raw) : { email: "", role: "general_public" };
  } catch {
    return { email: "", role: "general_public" };
  }
}

function writeCachedHeaderState(state: any) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HEADER_CACHE_KEY, JSON.stringify(state));
  } catch {}
}

function normalizeImage(value?: string | null) {
  return String(value || "").trim().replace(/\?.*$/, "");
}

function eventImage(row: any) {
  if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row?.image || "";
}

function installHeroThemeStyles() {
  if (typeof document === "undefined" || document.getElementById(HERO_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HERO_STYLE_ID;
  style.textContent = `.sdtv-themed-hero{--hero-accent:#db2777;--hero-soft:rgba(219,39,119,.20);--hero-border:rgba(244,114,182,.40);--hero-button:#db2777;--hero-button-text:#fff}.sdtv-themed-hero:after{content:"";position:absolute;inset:auto -8% -70px -8%;height:155px;pointer-events:none;z-index:1;background:radial-gradient(ellipse at center,var(--hero-soft),transparent 68%);filter:blur(8px)}.sdtv-themed-hero>div:nth-child(1){opacity:.42!important;filter:blur(4px) saturate(1.08)!important;transform:scale(1.04)!important}.sdtv-themed-hero>div:nth-child(2){background:linear-gradient(90deg,rgba(2,6,23,.96) 0%,rgba(2,6,23,.86) 40%,rgba(2,6,23,.50) 72%,rgba(2,6,23,.32) 100%)!important}.sdtv-themed-hero .sdtv-theme-grid{position:relative;z-index:2;border:1px solid var(--hero-border);border-radius:28px;margin-top:22px;margin-bottom:22px;height:calc(100% - 44px)!important;padding-top:22px!important;padding-bottom:22px!important;background:linear-gradient(115deg,rgba(2,6,23,.16),rgba(255,255,255,.015));box-shadow:inset 0 0 60px var(--hero-soft),0 20px 55px rgba(0,0,0,.26)}.sdtv-themed-hero .sdtv-theme-poster-card{border:2px solid var(--hero-border)!important;background:rgba(2,6,23,.34)!important;box-shadow:0 18px 55px rgba(0,0,0,.50),0 0 24px var(--hero-soft)!important}.sdtv-themed-hero .sdtv-theme-poster-card img{display:block!important;visibility:visible!important;opacity:1!important;object-fit:contain!important;background:#020617!important}.sdtv-themed-hero .sdtv-theme-text p:first-child{color:var(--hero-accent)!important}.sdtv-themed-hero .sdtv-theme-text a:first-of-type{background:var(--hero-button)!important;color:var(--hero-button-text)!important;box-shadow:0 12px 28px var(--hero-soft)!important}.sdtv-hero-gold{--hero-accent:#f6c453;--hero-soft:rgba(245,158,11,.22);--hero-border:rgba(251,191,36,.58);--hero-button:linear-gradient(180deg,#fde68a,#d99a20);--hero-button-text:#111827}.sdtv-hero-pink{--hero-accent:#f9a8d4;--hero-soft:rgba(219,39,119,.24);--hero-border:rgba(244,114,182,.50);--hero-button:#db2777;--hero-button-text:#fff}.sdtv-hero-blue{--hero-accent:#93c5fd;--hero-soft:rgba(37,99,235,.25);--hero-border:rgba(96,165,250,.52);--hero-button:#2563eb;--hero-button-text:#fff}.sdtv-hero-festival{--hero-accent:#fdba74;--hero-soft:rgba(249,115,22,.25);--hero-border:rgba(251,146,60,.54);--hero-button:#ea580c;--hero-button-text:#fff}.sdtv-hero-cinematic{--hero-accent:#d8b4fe;--hero-soft:rgba(147,51,234,.25);--hero-border:rgba(192,132,252,.52);--hero-button:#7e22ce;--hero-button-text:#fff}.sdtv-hero-emerald{--hero-accent:#86efac;--hero-soft:rgba(16,185,129,.24);--hero-border:rgba(52,211,153,.52);--hero-button:#059669;--hero-button-text:#fff}.sdtv-hero-fallback .sdtv-theme-grid{border-color:rgba(255,255,255,.12);box-shadow:none;background:transparent}.sdtv-hero-fallback:after{display:none}@media(max-width:767px){.sdtv-themed-hero .sdtv-theme-grid{margin:12px 10px;height:calc(100% - 24px)!important;border-radius:22px;padding-left:18px!important;padding-right:18px!important}.sdtv-themed-hero:after{height:95px;bottom:-40px}}`;
  document.head.appendChild(style);
}

async function loadHeroThemeMap(siteId: string | null) {
  const [bannerResult, festivalResult, eventResult] = await Promise.all([
    forSite(supabase.from("homepage_hero_banners").select("image_url,theme"), siteId).eq("active", true),
    forSite(supabase.from("festival_hero_assets").select("image_url,theme"), siteId).eq("active", true),
    forSite(supabase.from("events").select("image,image_urls,hero_theme"), siteId).eq("featured", true).eq("status", "approved"),
  ]);
  const next: Record<string, string> = {};
  [...(bannerResult.data || []), ...(festivalResult.data || [])].forEach((row: any) => {
    const image = normalizeImage(row.image_url);
    if (image) next[image] = HERO_THEMES.includes(String(row.theme || "")) ? row.theme : "fallback";
  });
  (eventResult.data || []).forEach((row: any) => {
    const image = normalizeImage(eventImage(row));
    if (image) next[image] = HERO_THEMES.includes(String(row.hero_theme || "")) ? row.hero_theme : "fallback";
  });
  heroThemeByImage = next;
}

function automaticTheme(text: string) {
  const value = text.toLowerCase();
  if (/holi|diwali|bathukamma|festival|mela|rangoli|navratri/.test(value)) return "festival";
  if (/concert|performance|dance|music|cinema|film|show/.test(value)) return "cinematic";
  if (/radio|business|technology|interview|media/.test(value)) return "blue";
  if (/katha|gala|temple|classical|wedding|velvet/.test(value)) return "gold";
  if (/nature|wellness|garden|health|community service/.test(value)) return "emerald";
  return "fallback";
}

function enhanceHeroTheme() {
  if (typeof window === "undefined" || window.location.pathname !== "/") return;
  installHeroThemeStyles();
  const header = document.querySelector("header");
  const section = header?.nextElementSibling as HTMLElement | null;
  if (!section) return;
  const grid = Array.from(section.children).find((child) => child.className?.toString().includes("max-w-7xl")) as HTMLElement | undefined;
  if (!grid) return;
  const posterWrap = grid.children?.[1] as HTMLElement | undefined;
  const posterCard = posterWrap?.firstElementChild as HTMLElement | undefined;
  const imageElement = posterCard?.querySelector("img") as HTMLImageElement | null;
  const image = normalizeImage(imageElement?.currentSrc || imageElement?.src || "");
  const selectedTheme = heroThemeByImage[image] || automaticTheme(section.textContent || "");
  const theme = HERO_THEMES.includes(selectedTheme) ? selectedTheme : "fallback";
  section.classList.remove("sdtv-premium-event-hero", ...HERO_THEMES.map((name) => `sdtv-hero-${name}`));
  section.classList.add("sdtv-themed-hero", `sdtv-hero-${theme}`);
  grid.classList.add("sdtv-theme-grid");
  (grid.firstElementChild as HTMLElement | null)?.classList.add("sdtv-theme-text");
  posterCard?.classList.add("sdtv-theme-poster-card");
}

export default function SiteHeader() {
  const site = useCurrentSite();
  const cached = readCachedHeaderState();
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(cached.email));
  const [role, setRole] = useState(cached.role || "general_public");
  const [menuOpen, setMenuOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    setPathname(window.location.pathname || "/");
    async function loadState() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user || null;
      const nextRole = await resolveUserRole(supabase, currentUser);
      setIsLoggedIn(Boolean(currentUser?.email));
      setRole(nextRole);
      writeCachedHeaderState({ email: currentUser?.email || "", role: nextRole });
    }
    void loadState();
  }, []);

  useEffect(() => {
    loadHeroThemeMap(site.id).finally(enhanceHeroTheme);
    const id = window.setInterval(enhanceHeroTheme, 600);
    return () => window.clearInterval(id);
  }, [pathname, site.id]);

  const canSeeStudio = Boolean(isLoggedIn && isAdminRole(role));
  const communityLinks: HeaderLink[] = [
    { label: "Groups", href: "/community-groups", show: true },
    { label: "Organizations", href: "/community-organizations", show: true },
    { label: "Classifieds", href: "/classifieds", show: true },
    { label: "Press Releases", href: "/press-releases", show: true },
    { label: "Matrimony", href: "/matrimony", show: true },
  ];
  const links: HeaderLink[] = [
    { label: "Home", href: "/", show: true },
    { label: "TV", href: "/tv", show: true },
    { label: "Radio", href: "/radio", show: true },
    { label: "Events", href: "/events", show: true },
    { label: "Businesses", href: "/businesses", show: true },
    { label: "Influencers", href: "/influencers", show: true },
    { label: "Advertise", href: "/marketing-packages", show: true },
    { label: "Team", href: "/team", show: true },
    { label: "Contact", href: "/contact", show: true },
    { label: "My Hub", href: "/my-hub", show: isLoggedIn },
    { label: "Studio", href: "/studio", show: canSeeStudio },
  ];
  const mobileLinks: HeaderLink[] = [{ label: `Share with ${site.shortName}`, href: "/submit-content", show: true, primary: true }, ...links];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const communityActive = communityLinks.some((link) => isActive(link.href));

  function desktopLinkClass(link: HeaderLink) {
    if (isActive(link.href)) return "rounded-xl bg-pink-600 px-3 py-2 text-white shadow-sm shadow-pink-200/60 whitespace-nowrap";
    return "rounded-xl px-2 py-2 hover:bg-pink-50 hover:text-pink-600 whitespace-nowrap";
  }

  function mobileLinkClass(link: HeaderLink) {
    if (isActive(link.href)) return "bg-pink-600 text-white ring-2 ring-pink-200";
    return link.primary ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-950";
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050b18] px-4 py-2 text-sm text-white md:px-10">
        <div className="hidden flex-wrap gap-4 sm:flex">
          {site.settings.youtube_url && <a href={String(site.settings.youtube_url)} target="_blank" rel="noreferrer" className="hover:text-pink-300">YouTube</a>}
          {site.settings.instagram_url && <a href={String(site.settings.instagram_url)} target="_blank" rel="noreferrer" className="hover:text-pink-300">Instagram</a>}
          {site.settings.facebook_url && <a href={String(site.settings.facebook_url)} target="_blank" rel="noreferrer" className="hover:text-pink-300">Facebook</a>}
          {site.settings.contact_email && <a href={`mailto:${String(site.settings.contact_email)}`} className="hover:text-pink-300">{String(site.settings.contact_email)}</a>}
        </div>
        <span className="font-bold text-yellow-300">{site.name} + Radio</span>
      </div>

      <header className="sticky top-0 z-40 border-b bg-white/95 px-3 py-3 text-slate-950 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <a href="/" className="flex min-w-0 items-center gap-2 text-base font-black md:text-xl">
              <img src={String(site.settings.logo_url || "/sdtv-logo.png")} alt={site.name} className="h-10 w-auto shrink-0 md:h-14" />
              <span className="truncate">{site.name}</span>
            </a>
            <a href="/submit-content" className="hidden rounded-xl bg-pink-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-pink-700 sm:inline-flex">Share with {site.shortName}</a>
          </div>

          <nav className="hidden items-center gap-1 text-sm font-bold lg:flex">
            {links.filter((link) => link.show).slice(0, 5).map((link) => (
              <a key={link.href + link.label} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={desktopLinkClass(link)}>{link.label}</a>
            ))}

            <div
              className="relative"
              onMouseEnter={() => setCommunityOpen(true)}
              onMouseLeave={() => setCommunityOpen(false)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCommunityOpen(false);
              }}
            >
              <button
                type="button"
                onClick={() => setCommunityOpen((open) => !open)}
                aria-expanded={communityOpen}
                aria-haspopup="menu"
                className={communityActive ? "rounded-xl bg-pink-600 px-3 py-2 text-white shadow-sm shadow-pink-200/60 whitespace-nowrap" : "rounded-xl px-2 py-2 hover:bg-pink-50 hover:text-pink-600 whitespace-nowrap"}
              >
                Community ▾
              </button>

              {communityOpen && (
                <div className="absolute left-0 top-full z-[100] w-56 pt-2" role="menu">
                  <div className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-950 shadow-2xl">
                    {communityLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        role="menuitem"
                        onClick={() => setCommunityOpen(false)}
                        className="block rounded-xl px-4 py-3 hover:bg-pink-50 hover:text-pink-600 focus:bg-pink-50 focus:text-pink-600 focus:outline-none"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {links.filter((link) => link.show).slice(5).map((link) => (
              <a key={link.href + link.label} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={desktopLinkClass(link)}>{link.label}</a>
            ))}
            <AccountMenu tone="light" from="site" />
          </nav>

          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <AccountMenu tone="light" from="site" />
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-black">{menuOpen ? "Close" : "Menu"}</button>
          </div>
        </div>

        {menuOpen && (
          <nav className="mx-auto mt-3 grid max-w-7xl grid-cols-2 gap-2 text-sm font-bold lg:hidden">
            {mobileLinks.filter((link) => link.show).map((link) => (
              <a key={link.href + link.label} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`${mobileLinkClass(link)} rounded-xl px-3 py-3 text-center`}>{link.label}</a>
            ))}
            <div className="col-span-2 mt-1 rounded-xl bg-slate-950 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-pink-200">Community</div>
            {communityLinks.map((link) => (
              <a key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`${mobileLinkClass(link)} rounded-xl px-3 py-3 text-center`}>{link.label}</a>
            ))}
          </nav>
        )}
      </header>
    </>
  );
}

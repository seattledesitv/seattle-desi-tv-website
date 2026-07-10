"use client";

import { useEffect, useState } from "react";
import AccountMenu from "./AccountMenu";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
const HEADER_CACHE_KEY = "sdtv-header-state-v1";
const HERO_STYLE_ID = "sdtv-hero-theme-style";
const HERO_THEMES = ["fallback", "gold", "pink", "blue", "festival", "cinematic"];
let heroThemeByImage: Record<string, string> = {};

type HeaderLink = { label: string; href: string; show: boolean; primary?: boolean };

function readCachedHeaderState() {
  if (typeof window === "undefined") return { email: "", role: "general_public" };
  try { const raw = window.localStorage.getItem(HEADER_CACHE_KEY); return raw ? JSON.parse(raw) : { email: "", role: "general_public" }; } catch { return { email: "", role: "general_public" }; }
}
function writeCachedHeaderState(state: any) { if (typeof window === "undefined") return; try { window.localStorage.setItem(HEADER_CACHE_KEY, JSON.stringify(state)); } catch {} }
function normalizeImage(value?: string | null) { return String(value || "").trim().replace(/\?.*$/, ""); }

function installHeroThemeStyles() {
  if (typeof document === "undefined" || document.getElementById(HERO_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HERO_STYLE_ID;
  style.textContent = `.sdtv-themed-hero{--hero-accent:#db2777;--hero-soft:rgba(219,39,119,.20);--hero-border:rgba(244,114,182,.40);--hero-button:#db2777;--hero-button-text:#fff}.sdtv-themed-hero:after{content:"";position:absolute;inset:auto -8% -70px -8%;height:155px;pointer-events:none;z-index:1;background:radial-gradient(ellipse at center,var(--hero-soft),transparent 68%);filter:blur(8px)}.sdtv-themed-hero>div:nth-child(1){opacity:.42!important;filter:blur(4px) saturate(1.08)!important;transform:scale(1.04)!important}.sdtv-themed-hero>div:nth-child(2){background:linear-gradient(90deg,rgba(2,6,23,.96) 0%,rgba(2,6,23,.86) 40%,rgba(2,6,23,.50) 72%,rgba(2,6,23,.32) 100%)!important}.sdtv-themed-hero .sdtv-theme-grid{position:relative;z-index:2;border:1px solid var(--hero-border);border-radius:28px;margin-top:22px;margin-bottom:22px;height:calc(100% - 44px)!important;padding-top:22px!important;padding-bottom:22px!important;background:linear-gradient(115deg,rgba(2,6,23,.16),rgba(255,255,255,.015));box-shadow:inset 0 0 60px var(--hero-soft),0 20px 55px rgba(0,0,0,.26)}.sdtv-themed-hero .sdtv-theme-poster-card{border:2px solid var(--hero-border)!important;background:rgba(2,6,23,.34)!important;box-shadow:0 18px 55px rgba(0,0,0,.50),0 0 24px var(--hero-soft)!important}.sdtv-themed-hero .sdtv-theme-poster-card img{display:block!important;visibility:visible!important;opacity:1!important;object-fit:contain!important;background:#020617!important}.sdtv-themed-hero .sdtv-theme-text p:first-child{color:var(--hero-accent)!important}.sdtv-themed-hero .sdtv-theme-text a:first-of-type{background:var(--hero-button)!important;color:var(--hero-button-text)!important;box-shadow:0 12px 28px var(--hero-soft)!important}.sdtv-hero-gold{--hero-accent:#f6c453;--hero-soft:rgba(245,158,11,.22);--hero-border:rgba(251,191,36,.58);--hero-button:linear-gradient(180deg,#fde68a,#d99a20);--hero-button-text:#111827}.sdtv-hero-pink{--hero-accent:#f9a8d4;--hero-soft:rgba(219,39,119,.24);--hero-border:rgba(244,114,182,.50);--hero-button:#db2777;--hero-button-text:#fff}.sdtv-hero-blue{--hero-accent:#93c5fd;--hero-soft:rgba(37,99,235,.25);--hero-border:rgba(96,165,250,.52);--hero-button:#2563eb;--hero-button-text:#fff}.sdtv-hero-festival{--hero-accent:#fdba74;--hero-soft:rgba(249,115,22,.25);--hero-border:rgba(251,146,60,.54);--hero-button:#ea580c;--hero-button-text:#fff}.sdtv-hero-cinematic{--hero-accent:#d8b4fe;--hero-soft:rgba(147,51,234,.25);--hero-border:rgba(192,132,252,.52);--hero-button:#7e22ce;--hero-button-text:#fff}.sdtv-hero-fallback .sdtv-theme-grid{border-color:rgba(255,255,255,.12);box-shadow:none;background:transparent}.sdtv-hero-fallback:after{display:none}@media(max-width:767px){.sdtv-themed-hero .sdtv-theme-grid{margin:12px 10px;height:calc(100% - 24px)!important;border-radius:22px;padding-left:18px!important;padding-right:18px!important}.sdtv-themed-hero:after{height:95px;bottom:-40px}}`;
  document.head.appendChild(style);
}

async function loadHeroThemeMap() {
  const [bannerResult, festivalResult] = await Promise.all([
    supabase.from("homepage_hero_banners").select("image_url,theme").eq("active", true),
    supabase.from("festival_hero_assets").select("image_url,theme").eq("active", true),
  ]);
  const next: Record<string, string> = {};
  [...(bannerResult.data || []), ...(festivalResult.data || [])].forEach((row: any) => {
    const image = normalizeImage(row.image_url);
    if (image) next[image] = HERO_THEMES.includes(String(row.theme || "")) ? row.theme : "fallback";
  });
  heroThemeByImage = next;
}

function automaticTheme(text: string) {
  const value = text.toLowerCase();
  if (/holi|diwali|bathukamma|festival|mela|rangoli|navratri/.test(value)) return "festival";
  if (/concert|performance|dance|music|cinema|film|show/.test(value)) return "cinematic";
  if (/radio|business|technology|interview|media/.test(value)) return "blue";
  if (/katha|gala|temple|classical|wedding|velvet/.test(value)) return "gold";
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
    loadState();
  }, []);

  useEffect(() => {
    loadHeroThemeMap().finally(enhanceHeroTheme);
    const id = window.setInterval(enhanceHeroTheme, 600);
    return () => window.clearInterval(id);
  }, [pathname]);

  const canSeeStudio = Boolean(isLoggedIn && isAdminRole(role));
  const communityLinks: HeaderLink[] = [{ label: "Groups", href: "/community-groups", show: true }, { label: "Organizations", href: "/community-organizations", show: true }];
  const links: HeaderLink[] = [{ label: "Home", href: "/", show: true }, { label: "TV", href: "/tv", show: true }, { label: "Radio", href: "/radio", show: true }, { label: "Events", href: "/events", show: true }, { label: "Businesses", href: "/businesses", show: true }, { label: "Influencers", href: "/influencers", show: true }, { label: "Advertise", href: "/marketing-packages", show: true }, { label: "Team", href: "/team", show: true }, { label: "Contact", href: "/contact", show: true }, { label: "My Hub", href: "/my-hub", show: isLoggedIn }, { label: "Studio", href: "/studio", show: canSeeStudio }];
  const mobileLinks: HeaderLink[] = [{ label: "Share with SDTV", href: "/submit-content", show: true, primary: true }, ...links];
  function isActive(href: string) { if (href === "/") return pathname === "/"; return pathname === href || pathname.startsWith(`${href}/`); }
  const communityActive = communityLinks.some((link) => isActive(link.href));
  function desktopLinkClass(link: HeaderLink) { if (isActive(link.href)) return "rounded-xl bg-pink-600 px-3 py-2 text-white shadow-sm shadow-pink-200/60 whitespace-nowrap"; return "rounded-xl px-2 py-2 hover:bg-pink-50 hover:text-pink-600 whitespace-nowrap"; }
  function mobileLinkClass(link: HeaderLink) { if (isActive(link.href)) return "bg-pink-600 text-white ring-2 ring-pink-200"; return link.primary ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-950"; }

  return <><div className="bg-[#050b18] text-white text-sm px-4 md:px-10 py-2 flex flex-wrap items-center justify-between gap-3"><div className="hidden sm:flex gap-4 flex-wrap"><a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="hover:text-pink-300">YouTube</a><a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Instagram</a><a href="https://facebook.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Facebook</a><a href="mailto:info@seattledesitv.com" className="hover:text-pink-300">info@seattledesitv.com</a></div><span className="font-bold text-yellow-300">Seattle Desi TV + Radio</span></div><header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-3 md:px-10 py-3 text-slate-950"><div className="max-w-7xl mx-auto flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3 md:gap-4"><a href="/" className="flex min-w-0 items-center gap-2 font-black text-base md:text-xl"><img src="/sdtv-logo.png" alt="Seattle Desi TV" className="h-10 md:h-14 w-auto shrink-0" /><span className="truncate">Seattle Desi TV</span></a><a href="/submit-content" className="hidden sm:inline-flex rounded-xl bg-pink-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-pink-700">Share with SDTV</a></div><nav className="hidden lg:flex items-center gap-1 font-bold text-sm">{links.filter((link) => link.show).slice(0, 5).map((link) => <a key={link.href + link.label} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={desktopLinkClass(link)}>{link.label}</a>)}<div className="relative" onMouseEnter={() => setCommunityOpen(true)} onMouseLeave={() => setCommunityOpen(false)}><button type="button" onClick={() => setCommunityOpen((open) => !open)} aria-expanded={communityOpen} className={communityActive ? "rounded-xl bg-pink-600 px-3 py-2 text-white shadow-sm shadow-pink-200/60 whitespace-nowrap" : "rounded-xl px-2 py-2 hover:bg-pink-50 hover:text-pink-600 whitespace-nowrap"}>Community ▾</button>{communityOpen && <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-slate-950 shadow-2xl">{communityLinks.map((link) => <a key={link.href} href={link.href} className="block rounded-xl px-4 py-3 hover:bg-pink-50 hover:text-pink-600">{link.label}</a>)}</div>}</div>{links.filter((link) => link.show).slice(5).map((link) => <a key={link.href + link.label} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={desktopLinkClass(link)}>{link.label}</a>)}<AccountMenu tone="light" from="site" /></nav><div className="lg:hidden flex items-center gap-2 shrink-0"><AccountMenu tone="light" from="site" /><button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} className="border border-slate-300 px-3 py-2 rounded-xl font-black text-sm">{menuOpen ? "Close" : "Menu"}</button></div></div>{menuOpen && <nav className="lg:hidden max-w-7xl mx-auto mt-3 grid grid-cols-2 gap-2 text-sm font-bold">{mobileLinks.filter((link) => link.show).map((link) => <a key={link.href + link.label} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`${mobileLinkClass(link)} px-3 py-3 rounded-xl text-center`}>{link.label}</a>)}<div className="col-span-2 mt-1 rounded-xl bg-slate-950 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-pink-200">Community</div>{communityLinks.map((link) => <a key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`${mobileLinkClass(link)} px-3 py-3 rounded-xl text-center`}>{link.label}</a>)}</nav>}</header></>;
}

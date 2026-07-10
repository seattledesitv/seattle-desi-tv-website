"use client";

import { useEffect, useState } from "react";
import AccountMenu from "./AccountMenu";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
const HEADER_CACHE_KEY = "sdtv-header-state-v1";
const PREMIUM_HERO_STYLE_ID = "sdtv-premium-event-hero-style";

type HeaderLink = { label: string; href: string; show: boolean; primary?: boolean };

function readCachedHeaderState() {
  if (typeof window === "undefined") return { email: "", role: "general_public" };
  try { const raw = window.localStorage.getItem(HEADER_CACHE_KEY); return raw ? JSON.parse(raw) : { email: "", role: "general_public" }; } catch { return { email: "", role: "general_public" }; }
}
function writeCachedHeaderState(state: any) { if (typeof window === "undefined") return; try { window.localStorage.setItem(HEADER_CACHE_KEY, JSON.stringify(state)); } catch {} }

const HERO_THEMES = ["gold", "pink", "blue", "festival", "cinematic"] as const;
function heroThemeFor(text: string) {
  const value = text.toLowerCase();
  if (/diwali|gala|velvet|classical|katha|temple|heritage|fundraiser/.test(value)) return "gold";
  if (/holi|bathukamma|festival|mela|pongal|navratri|celebration/.test(value)) return "festival";
  if (/radio|tech|business|interview|podcast|news|media/.test(value)) return "blue";
  if (/concert|dance|music|film|performance|show/.test(value)) return "cinematic";
  let total = 0; for (const char of value) total += char.charCodeAt(0);
  return HERO_THEMES[total % HERO_THEMES.length] || "pink";
}

function installPremiumHeroStyle() {
  if (typeof document === "undefined" || document.getElementById(PREMIUM_HERO_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PREMIUM_HERO_STYLE_ID;
  style.textContent = `
.sdtv-premium-event-hero{--hero-accent:#ec4899;--hero-accent-soft:rgba(236,72,153,.22);--hero-accent-strong:#db2777;min-height:520px!important;height:auto!important;padding:32px 20px!important;background:#020617!important;isolation:isolate}
.sdtv-premium-event-hero[data-sdtv-theme="gold"]{--hero-accent:#f6c453;--hero-accent-soft:rgba(245,158,11,.22);--hero-accent-strong:#d99a20}
.sdtv-premium-event-hero[data-sdtv-theme="pink"]{--hero-accent:#f472b6;--hero-accent-soft:rgba(236,72,153,.24);--hero-accent-strong:#db2777}
.sdtv-premium-event-hero[data-sdtv-theme="blue"]{--hero-accent:#60a5fa;--hero-accent-soft:rgba(59,130,246,.24);--hero-accent-strong:#2563eb}
.sdtv-premium-event-hero[data-sdtv-theme="festival"]{--hero-accent:#fb923c;--hero-accent-soft:rgba(249,115,22,.25);--hero-accent-strong:#ea580c}
.sdtv-premium-event-hero[data-sdtv-theme="cinematic"]{--hero-accent:#a78bfa;--hero-accent-soft:rgba(139,92,246,.24);--hero-accent-strong:#7c3aed}
.sdtv-premium-event-hero:before{content:"";position:absolute;inset:26px 22px;border:1px solid color-mix(in srgb,var(--hero-accent) 70%,transparent);border-radius:28px;pointer-events:none;z-index:2;box-shadow:inset 0 0 70px var(--hero-accent-soft),0 0 28px var(--hero-accent-soft)}
.sdtv-premium-event-hero:after{content:"";position:absolute;left:24px;right:24px;bottom:28px;height:112px;background:radial-gradient(circle at 14% 88%,var(--hero-accent-soft),transparent 24rem),linear-gradient(165deg,transparent 30%,var(--hero-accent-soft) 47%,var(--hero-accent) 50%,var(--hero-accent-soft) 54%,transparent 66%);opacity:.72;pointer-events:none;z-index:2}
.sdtv-premium-event-hero>div:nth-child(1){opacity:.52!important;filter:blur(5px) saturate(1.18) brightness(.88)!important;transform:scale(1.06)!important}
.sdtv-premium-event-hero>div:nth-child(2){background:linear-gradient(90deg,rgba(2,6,23,.97) 0%,rgba(2,6,23,.82) 40%,rgba(2,6,23,.42) 72%,rgba(2,6,23,.18) 100%)!important}
.sdtv-premium-event-hero .sdtv-premium-hero-grid{min-height:456px!important;padding-top:22px!important;padding-bottom:22px!important;z-index:3!important}
.sdtv-premium-event-hero .sdtv-premium-hero-text{max-width:620px!important;padding-left:clamp(0px,3vw,42px)}
.sdtv-premium-event-hero .sdtv-premium-hero-text p:first-child{color:var(--hero-accent)!important;letter-spacing:.18em!important;font-size:.9rem!important}
.sdtv-premium-event-hero .sdtv-premium-hero-text h1{font-size:clamp(2.8rem,5.7vw,5.5rem)!important;line-height:.98!important;text-shadow:0 10px 30px rgba(0,0,0,.48)!important}
.sdtv-premium-event-hero .sdtv-premium-hero-text p:not(:first-child){font-size:clamp(1rem,1.55vw,1.25rem)!important;color:rgba(255,255,255,.88)!important}
.sdtv-premium-event-hero .sdtv-premium-hero-text a:first-of-type{background:linear-gradient(180deg,color-mix(in srgb,var(--hero-accent) 78%,white),var(--hero-accent-strong))!important;color:white!important;border-radius:16px!important;padding:1rem 1.65rem!important;box-shadow:0 16px 35px var(--hero-accent-soft)!important}
.sdtv-premium-event-hero[data-sdtv-theme="gold"] .sdtv-premium-hero-text a:first-of-type{color:#111827!important}
.sdtv-premium-event-hero .sdtv-premium-poster-wrap{display:flex!important;visibility:visible!important;justify-content:center!important;max-height:none!important;padding-right:clamp(0px,3vw,42px)}
.sdtv-premium-event-hero .sdtv-premium-poster-card{display:block!important;visibility:visible!important;opacity:1!important;max-width:390px!important;width:min(390px,88vw)!important;border:2px solid var(--hero-accent)!important;border-radius:26px!important;background:rgba(15,23,42,.42)!important;padding:10px!important;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 24px 70px rgba(0,0,0,.55),0 0 34px var(--hero-accent-soft)!important}
.sdtv-premium-event-hero .sdtv-premium-poster-card>div{background:transparent!important}
.sdtv-premium-event-hero .sdtv-premium-poster-card img{display:block!important;visibility:visible!important;opacity:1!important;width:100%!important;height:100%!important;object-fit:contain!important;background:transparent!important}
@media(max-width:767px){.sdtv-premium-event-hero{min-height:620px!important;padding:20px 12px!important}.sdtv-premium-event-hero:before{inset:14px 10px;border-radius:22px}.sdtv-premium-event-hero:after{left:10px;right:10px;bottom:15px}.sdtv-premium-event-hero .sdtv-premium-hero-grid{min-height:570px!important}.sdtv-premium-event-hero .sdtv-premium-hero-text{padding-left:0}.sdtv-premium-event-hero .sdtv-premium-poster-wrap{display:none!important}}
`;
  document.head.appendChild(style);
}

function enhancePremiumEventHero() {
  if (typeof window === "undefined" || window.location.pathname !== "/") return;
  installPremiumHeroStyle();
  const header = document.querySelector("header");
  const section = header?.nextElementSibling as HTMLElement | null;
  if (!section) return;
  const text = section.textContent || "";
  if (!text.toLowerCase().includes("featured event")) {
    section.classList.remove("sdtv-premium-event-hero");
    section.removeAttribute("data-sdtv-theme");
    return;
  }
  section.classList.add("sdtv-premium-event-hero");
  section.setAttribute("data-sdtv-theme", heroThemeFor(text));
  const grid = Array.from(section.children).find((child) => child.className?.toString().includes("max-w-7xl")) as HTMLElement | undefined;
  grid?.classList.add("sdtv-premium-hero-grid");
  const textPanel = grid?.firstElementChild as HTMLElement | null;
  textPanel?.classList.add("sdtv-premium-hero-text");
  const posterWrap = grid?.children?.[1] as HTMLElement | undefined;
  posterWrap?.classList.add("sdtv-premium-poster-wrap");
  const posterCard = posterWrap?.firstElementChild as HTMLElement | undefined;
  posterCard?.classList.add("sdtv-premium-poster-card");
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
      setIsLoggedIn(Boolean(currentUser?.email)); setRole(nextRole);
      writeCachedHeaderState({ email: currentUser?.email || "", role: nextRole });
    }
    loadState();
  }, []);

  useEffect(() => {
    enhancePremiumEventHero();
    const id = window.setInterval(enhancePremiumEventHero, 500);
    return () => window.clearInterval(id);
  }, [pathname]);

  const canSeeStudio = Boolean(isLoggedIn && isAdminRole(role));
  const communityLinks: HeaderLink[] = [{ label: "Groups", href: "/community-groups", show: true }, { label: "Organizations", href: "/community-organizations", show: true }];
  const links: HeaderLink[] = [
    { label: "Home", href: "/", show: true }, { label: "TV", href: "/tv", show: true }, { label: "Radio", href: "/radio", show: true }, { label: "Events", href: "/events", show: true }, { label: "Businesses", href: "/businesses", show: true }, { label: "Influencers", href: "/influencers", show: true }, { label: "Advertise", href: "/marketing-packages", show: true }, { label: "Team", href: "/team", show: true }, { label: "Contact", href: "/contact", show: true }, { label: "My Hub", href: "/my-hub", show: isLoggedIn }, { label: "Studio", href: "/studio", show: canSeeStudio },
  ];
  const mobileLinks: HeaderLink[] = [{ label: "Share with SDTV", href: "/submit-content", show: true, primary: true }, ...links];
  function isActive(href: string) { if (href === "/") return pathname === "/"; return pathname === href || pathname.startsWith(`${href}/`); }
  const communityActive = communityLinks.some((link) => isActive(link.href));
  function desktopLinkClass(link: HeaderLink) { if (isActive(link.href)) return "rounded-xl bg-pink-600 px-3 py-2 text-white shadow-sm shadow-pink-200/60 whitespace-nowrap"; return "rounded-xl px-2 py-2 hover:bg-pink-50 hover:text-pink-600 whitespace-nowrap"; }
  function mobileLinkClass(link: HeaderLink) { if (isActive(link.href)) return "bg-pink-600 text-white ring-2 ring-pink-200"; return link.primary ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-950"; }

  return <><div className="bg-[#050b18] text-white text-sm px-4 md:px-10 py-2 flex flex-wrap items-center justify-between gap-3"><div className="hidden sm:flex gap-4 flex-wrap"><a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="hover:text-pink-300">YouTube</a><a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Instagram</a><a href="https://facebook.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Facebook</a><a href="mailto:info@seattledesitv.com" className="hover:text-pink-300">info@seattledesitv.com</a></div><span className="font-bold text-yellow-300">Seattle Desi TV + Radio</span></div><header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-3 md:px-10 py-3 text-slate-950"><div className="max-w-7xl mx-auto flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3 md:gap-4"><a href="/" className="flex min-w-0 items-center gap-2 font-black text-base md:text-xl"><img src="/sdtv-logo.png" alt="Seattle Desi TV" className="h-10 md:h-14 w-auto shrink-0" /><span className="truncate">Seattle Desi TV</span></a><a href="/submit-content" className="hidden sm:inline-flex rounded-xl bg-pink-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-pink-700">Share with SDTV</a></div><nav className="hidden lg:flex items-center gap-1 font-bold text-sm">{links.filter((link) => link.show).slice(0, 5).map((link) => <a key={link.href + link.label} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={desktopLinkClass(link)}>{link.label}</a>)}<div className="relative" onMouseEnter={() => setCommunityOpen(true)} onMouseLeave={() => setCommunityOpen(false)}><button type="button" onClick={() => setCommunityOpen((open) => !open)} aria-expanded={communityOpen} className={communityActive ? "rounded-xl bg-pink-600 px-3 py-2 text-white shadow-sm shadow-pink-200/60 whitespace-nowrap" : "rounded-xl px-2 py-2 hover:bg-pink-50 hover:text-pink-600 whitespace-nowrap"}>Community ▾</button>{communityOpen && <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-slate-950 shadow-2xl">{communityLinks.map((link) => <a key={link.href} href={link.href} className="block rounded-xl px-4 py-3 hover:bg-pink-50 hover:text-pink-600">{link.label}</a>)}</div>}</div>{links.filter((link) => link.show).slice(5).map((link) => <a key={link.href + link.label} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={desktopLinkClass(link)}>{link.label}</a>)}<AccountMenu tone="light" from="site" /></nav><div className="lg:hidden flex items-center gap-2 shrink-0"><AccountMenu tone="light" from="site" /><button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} className="border border-slate-300 px-3 py-2 rounded-xl font-black text-sm">{menuOpen ? "Close" : "Menu"}</button></div></div>{menuOpen && <nav className="lg:hidden max-w-7xl mx-auto mt-3 grid grid-cols-2 gap-2 text-sm font-bold">{mobileLinks.filter((link) => link.show).map((link) => <a key={link.href + link.label} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`${mobileLinkClass(link)} px-3 py-3 rounded-xl text-center`}>{link.label}</a>)}<div className="col-span-2 mt-1 rounded-xl bg-slate-950 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-pink-200">Community</div>{communityLinks.map((link) => <a key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`${mobileLinkClass(link)} px-3 py-3 rounded-xl text-center`}>{link.label}</a>)}</nav>}</header></>;
}

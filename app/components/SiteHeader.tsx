"use client";

import { useEffect, useState } from "react";
import AccountMenu from "./AccountMenu";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
const HEADER_CACHE_KEY = "sdtv-header-state-v1";

type HeaderLink = { label: string; href: string; show: boolean; primary?: boolean };

function readCachedHeaderState() {
  if (typeof window === "undefined") return { email: "", role: "general_public" };
  try { const raw = window.localStorage.getItem(HEADER_CACHE_KEY); return raw ? JSON.parse(raw) : { email: "", role: "general_public" }; } catch { return { email: "", role: "general_public" }; }
}
function writeCachedHeaderState(state: any) { if (typeof window === "undefined") return; try { window.localStorage.setItem(HEADER_CACHE_KEY, JSON.stringify(state)); } catch {} }

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

  const canSeeStudio = Boolean(isLoggedIn && isAdminRole(role));
  const communityLinks: HeaderLink[] = [
    { label: "Groups", href: "/community-groups", show: true },
    { label: "Organizations", href: "/community-organizations", show: true },
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
  const mobileLinks: HeaderLink[] = [
    { label: "Share with SDTV", href: "/submit-content", show: true, primary: true },
    ...links,
  ];

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
      <style jsx global>{`
        @media (min-width: 768px) {
          header + section.relative.overflow-hidden.bg-slate-950.text-white {
            min-height: 460px;
            height: auto !important;
            background:
              radial-gradient(circle at 78% 45%, rgba(219, 39, 119, 0.16), transparent 20rem),
              radial-gradient(circle at 18% 30%, rgba(245, 158, 11, 0.12), transparent 18rem),
              #020617;
          }
          header + section.relative.overflow-hidden.bg-slate-950.text-white::before {
            content: "";
            position: absolute;
            inset: 1.25rem 2rem;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 2rem;
            pointer-events: none;
            box-shadow: inset 0 0 70px rgba(255,255,255,0.04);
          }
          header + section.relative.overflow-hidden.bg-slate-950.text-white > div.absolute.inset-0:first-child {
            opacity: 0.48 !important;
            filter: blur(18px) saturate(1.25);
            transform: scale(1.18);
          }
          header + section.relative.overflow-hidden.bg-slate-950.text-white > div.absolute.inset-0:nth-child(2) {
            background:
              linear-gradient(90deg, rgba(2,6,23,0.97) 0%, rgba(2,6,23,0.82) 38%, rgba(2,6,23,0.52) 68%, rgba(2,6,23,0.88) 100%),
              radial-gradient(circle at 74% 50%, rgba(255,255,255,0.10), transparent 15rem) !important;
          }
          header + section.relative.overflow-hidden.bg-slate-950.text-white > div.relative.max-w-7xl {
            max-width: 1120px;
            grid-template-columns: minmax(0, 0.82fr) minmax(280px, 0.62fr) !important;
            gap: 2rem;
            padding-top: 2.25rem;
            padding-bottom: 2.25rem;
          }
          header + section.relative.overflow-hidden.bg-slate-950.text-white > div.relative.max-w-7xl > div:first-child {
            max-width: 640px;
            border-left: 4px solid rgba(236, 72, 153, 0.78);
            padding-left: 1.4rem;
          }
          header + section.relative.overflow-hidden.bg-slate-950.text-white h1 {
            text-shadow: 0 18px 55px rgba(0,0,0,0.45);
          }
          header + section.relative.overflow-hidden.bg-slate-950.text-white > div.relative.max-w-7xl > div:nth-child(2) {
            justify-content: center !important;
          }
          header + section.relative.overflow-hidden.bg-slate-950.text-white > div.relative.max-w-7xl > div:nth-child(2) > div {
            max-width: 320px !important;
            transform: rotate(1.5deg);
            box-shadow: 0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08);
          }
        }
      `}</style>
      <div className="bg-[#050b18] text-white text-sm px-4 md:px-10 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="hidden sm:flex gap-4 flex-wrap"><a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="hover:text-pink-300">YouTube</a><a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Instagram</a><a href="https://facebook.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Facebook</a><a href="mailto:info@seattledesitv.com" className="hover:text-pink-300">info@seattledesitv.com</a></div>
        <span className="font-bold text-yellow-300">Seattle Desi TV + Radio</span>
      </div>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-3 md:px-10 py-3 text-slate-950">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <a href="/" className="flex min-w-0 items-center gap-2 font-black text-base md:text-xl"><img src="/sdtv-logo.png" alt="Seattle Desi TV" className="h-10 md:h-14 w-auto shrink-0" /><span className="truncate">Seattle Desi TV</span></a>
            <a href="/submit-content" className="hidden sm:inline-flex rounded-xl bg-pink-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-pink-700">Share with SDTV</a>
          </div>
          <nav className="hidden lg:flex items-center gap-1 font-bold text-sm">
            {links.filter((link) => link.show).slice(0, 5).map((link) => <a key={link.href + link.label} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={desktopLinkClass(link)}>{link.label}</a>)}
            <div className="relative" onMouseEnter={() => setCommunityOpen(true)} onMouseLeave={() => setCommunityOpen(false)}>
              <button type="button" onClick={() => setCommunityOpen((open) => !open)} aria-expanded={communityOpen} className={communityActive ? "rounded-xl bg-pink-600 px-3 py-2 text-white shadow-sm shadow-pink-200/60 whitespace-nowrap" : "rounded-xl px-2 py-2 hover:bg-pink-50 hover:text-pink-600 whitespace-nowrap"}>Community ▾</button>
              {communityOpen && <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-slate-950 shadow-2xl">
                {communityLinks.map((link) => <a key={link.href} href={link.href} className="block rounded-xl px-4 py-3 hover:bg-pink-50 hover:text-pink-600">{link.label}</a>)}
              </div>}
            </div>
            {links.filter((link) => link.show).slice(5).map((link) => <a key={link.href + link.label} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={desktopLinkClass(link)}>{link.label}</a>)}
            <AccountMenu tone="light" from="site" />
          </nav>
          <div className="lg:hidden flex items-center gap-2 shrink-0">
            <AccountMenu tone="light" from="site" />
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} className="border border-slate-300 px-3 py-2 rounded-xl font-black text-sm">{menuOpen ? "Close" : "Menu"}</button>
          </div>
        </div>
        {menuOpen && <nav className="lg:hidden max-w-7xl mx-auto mt-3 grid grid-cols-2 gap-2 text-sm font-bold">
          {mobileLinks.filter((link) => link.show).map((link) => <a key={link.href + link.label} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`${mobileLinkClass(link)} px-3 py-3 rounded-xl text-center`}>{link.label}</a>)}
          <div className="col-span-2 mt-1 rounded-xl bg-slate-950 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-pink-200">Community</div>
          {communityLinks.map((link) => <a key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`${mobileLinkClass(link)} px-3 py-3 rounded-xl text-center`}>{link.label}</a>)}
        </nav>}
      </header>
    </>
  );
}

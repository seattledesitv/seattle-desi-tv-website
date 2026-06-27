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

  useEffect(() => {
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
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  const canSeeStudio = Boolean(isLoggedIn && isAdminRole(role));
  const links: HeaderLink[] = [
    { label: "Home", href: "/", show: true },
    { label: "TV", href: "/tv", show: true },
    { label: "Radio", href: "/radio", show: true },
    { label: "Events", href: "/events", show: true },
    { label: "Businesses", href: "/businesses", show: true },
    { label: "Groups", href: "/community-groups", show: true },
    { label: "Organizations", href: "/community-organizations", show: true },
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
    { label: isLoggedIn ? "Account" : "Login", href: isLoggedIn ? "/my-hub" : "/login", show: true },
  ];

  return (
    <>
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
          <nav className="hidden lg:flex items-center gap-3 font-bold text-sm">
            {links.filter((link) => link.show).map((link) => <a key={link.href + link.label} href={link.href} className="hover:text-pink-600 whitespace-nowrap">{link.label}</a>)}
            <AccountMenu tone="light" from="site" />
          </nav>
          <div className="lg:hidden flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} className="border border-slate-300 px-3 py-2 rounded-xl font-black text-sm">☰ Menu</button>
          </div>
        </div>
        {menuOpen && <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/95 text-white backdrop-blur-md">
          <div className="flex min-h-screen flex-col px-5 py-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <a href="/" onClick={() => setMenuOpen(false)} className="flex min-w-0 items-center gap-3 font-black text-xl"><img src="/sdtv-logo.png" alt="Seattle Desi TV" className="h-11 w-auto shrink-0 rounded" /><span className="truncate">Seattle Desi TV</span></a>
              <button type="button" onClick={() => setMenuOpen(false)} className="rounded-xl bg-white px-4 py-2 font-black text-slate-950">Close</button>
            </div>
            <nav className="mt-5 grid flex-1 content-start gap-2 overflow-y-auto pb-8 text-base font-black">
              {mobileLinks.filter((link) => link.show).map((link) => <a key={link.href + link.label} href={link.href} onClick={() => setMenuOpen(false)} className={`${link.primary ? "bg-pink-600 text-white" : "bg-white/10 text-white"} rounded-2xl px-4 py-4`}>{link.label}</a>)}
            </nav>
          </div>
        </div>}
      </header>
    </>
  );
}

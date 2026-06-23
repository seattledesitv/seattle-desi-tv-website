"use client";

import { useEffect, useState } from "react";
import AccountMenu from "./AccountMenu";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
const HEADER_CACHE_KEY = "sdtv-header-state-v1";

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

  const canSeeStudio = Boolean(isLoggedIn && isAdminRole(role));
  const links = [
    { label: "Home", href: "/", show: true },
    { label: "Events", href: "/events", show: true },
    { label: "Radio", href: "/radio", show: true },
    { label: "Businesses", href: "/businesses", show: true },
    { label: "Advertise", href: "/marketing-packages", show: true },
    { label: "Team", href: "/team", show: true },
    { label: "Contact", href: "/contact", show: true },
    { label: "My Hub", href: "/my-hub", show: true },
    { label: "Studio", href: "/studio", show: canSeeStudio },
  ];

  return (
    <>
      <div className="bg-[#050b18] text-white text-sm px-4 md:px-10 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="hidden sm:flex gap-4 flex-wrap"><a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="hover:text-pink-300">YouTube</a><a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Instagram</a><a href="https://facebook.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Facebook</a><a href="mailto:info@seattledesitv.com" className="hover:text-pink-300">info@seattledesitv.com</a></div>
        <span className="font-bold text-yellow-300">Seattle Desi TV + Radio</span>
      </div>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-4 md:px-10 py-3 text-slate-950">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 font-black text-lg md:text-xl"><img src="/sdtv-logo.png" alt="Seattle Desi TV" className="h-11 md:h-14 w-auto" /><span>Seattle Desi TV</span></a>
          <nav className="hidden lg:flex items-center gap-3 font-bold text-sm">
            {links.filter((link) => link.show).map((link) => <a key={link.href + link.label} href={link.href} className="hover:text-pink-600">{link.label}</a>)}
            <AccountMenu tone="light" from="site" />
          </nav>
          <div className="lg:hidden flex items-center gap-2">
            <AccountMenu tone="light" from="site" />
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} className="border border-slate-300 px-3 py-2 rounded-xl font-black text-sm">{menuOpen ? "Close" : "Menu"}</button>
          </div>
        </div>
        {menuOpen && <nav className="lg:hidden max-w-7xl mx-auto mt-3 grid grid-cols-2 gap-2 text-sm font-bold">
          {links.filter((link) => link.show).map((link) => <a key={link.href + link.label} href={link.href} onClick={() => setMenuOpen(false)} className="bg-slate-100 px-3 py-3 rounded-xl text-center">{link.label}</a>)}
        </nav>}
      </header>
    </>
  );
}

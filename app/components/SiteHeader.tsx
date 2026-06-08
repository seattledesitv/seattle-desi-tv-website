"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
const HEADER_CACHE_KEY = "sdtv-header-state-v1";

function readCachedHeaderState() {
  if (typeof window === "undefined") return { email: "", role: "general_public", unreadCount: 0 };
  try { const raw = window.localStorage.getItem(HEADER_CACHE_KEY); return raw ? JSON.parse(raw) : { email: "", role: "general_public", unreadCount: 0 }; } catch { return { email: "", role: "general_public", unreadCount: 0 }; }
}
function writeCachedHeaderState(state: any) { if (typeof window === "undefined") return; try { window.localStorage.setItem(HEADER_CACHE_KEY, JSON.stringify(state)); } catch {} }

export default function SiteHeader() {
  const cached = readCachedHeaderState();
  const [unreadCount, setUnreadCount] = useState(Number(cached.unreadCount || 0));
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(cached.email));
  const [role, setRole] = useState(cached.role || "general_public");

  useEffect(() => {
    async function loadState() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user || null;
      const nextRole = await resolveUserRole(supabase, currentUser);
      let nextUnreadCount = 0;
      if (currentUser?.id) {
        const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", currentUser.id).eq("read", false);
        nextUnreadCount = count || 0;
      }
      setIsLoggedIn(Boolean(currentUser?.email)); setRole(nextRole); setUnreadCount(nextUnreadCount);
      writeCachedHeaderState({ email: currentUser?.email || "", role: nextRole, unreadCount: nextUnreadCount });
    }
    loadState();
  }, []);

  const canSeeStudio = Boolean(isLoggedIn && isAdminRole(role));

  return (
    <>
      <div className="bg-[#050b18] text-white text-sm px-6 md:px-10 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 flex-wrap"><a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="hover:text-pink-300">YouTube</a><a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Instagram</a><a href="https://facebook.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Facebook</a><a href="mailto:info@seattledesitv.com" className="hover:text-pink-300">info@seattledesitv.com</a></div>
        <span className="font-bold text-yellow-300">Seattle Desi TV + Radio</span>
      </div>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-6 md:px-10 py-4 text-slate-950">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 font-black text-xl"><img src="/sdtv-logo.png" alt="Seattle Desi TV" className="h-14 w-auto" /><span>Seattle Desi TV</span></a>
          <nav className="hidden lg:flex items-center gap-3 font-bold text-sm">
            <a href="/" className="hover:text-pink-600">Home</a><a href="/events" className="hover:text-pink-600">Events</a><a href="/businesses" className="hover:text-pink-600">Businesses</a><a href="/radio" className="hover:text-pink-600">Radio</a><a href="/team" className="hover:text-pink-600">Team</a><a href="/contact" className="hover:text-pink-600">Contact</a>
            <a href="/my-hub" className="hover:text-pink-600">My Hub{unreadCount > 0 ? ` ${unreadCount}` : ""}</a>
            {canSeeStudio && <a href="/studio" className="hover:text-pink-600">Studio</a>}
            <a href="/login" className="bg-pink-600 text-white px-4 py-2 rounded-xl">{isLoggedIn ? "Account" : "Login"}</a>
          </nav>
          <a href="/my-hub" className="lg:hidden bg-pink-600 text-white px-4 py-2 rounded-xl font-bold">My Hub</a>
        </div>
      </header>
    </>
  );
}

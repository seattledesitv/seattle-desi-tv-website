"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

export default function SiteHeader() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");

  useEffect(() => {
    async function loadState() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user || null;
      setUser(currentUser);
      const nextRole = await resolveUserRole(supabase, currentUser);
      setRole(nextRole);
      if (!currentUser?.id) { setUnreadCount(0); return; }
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", currentUser.id).eq("read", false);
      setUnreadCount(count || 0);
    }
    loadState();
  }, []);

  const canSeeTeamTools = Boolean(user && isTeamRole(role));
  const canSeeStudio = Boolean(user && isAdminRole(role));

  return (
    <>
      <div className="bg-[#050b18] text-white text-sm px-6 md:px-10 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 flex-wrap">
          <a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="hover:text-pink-300">YouTube</a>
          <a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Instagram</a>
          <a href="https://facebook.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Facebook</a>
          <a href="mailto:info@seattledesitv.com" className="hover:text-pink-300">info@seattledesitv.com</a>
        </div>
        <span className="font-bold text-yellow-300">Seattle Desi TV + Radio</span>
      </div>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-6 md:px-10 py-4 text-slate-950">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 font-black text-xl">
            <img src="/sdtv-logo.png" alt="Seattle Desi TV" className="h-14 w-auto" />
            <span>Seattle Desi TV</span>
          </a>
          <nav className="hidden lg:flex items-center gap-3 font-bold text-sm">
            <a href="/" className="hover:text-pink-600">Home</a>
            <a href="/events" className="hover:text-pink-600">Events</a>
            <a href="/businesses" className="hover:text-pink-600">Businesses</a>
            <a href="/radio" className="hover:text-pink-600">Radio</a>
            <a href="/team" className="hover:text-pink-600">Team</a>
            <a href="/portal" className="hover:text-pink-600">Portal</a>
            {canSeeTeamTools && <a href="/my-assignments" className="hover:text-pink-600">My Assignments</a>}
            {canSeeTeamTools && <a href="/my-availability" className="hover:text-pink-600">Availability</a>}
            {user && <a href="/notifications" className="hover:text-pink-600">Notifications{unreadCount > 0 ? ` ${unreadCount}` : ""}</a>}
            {canSeeStudio && <a href="/studio" className="hover:text-pink-600">Studio</a>}
            <a href="/login" className="bg-pink-600 text-white px-4 py-2 rounded-xl">{user ? "Account" : "Login"}</a>
          </nav>
          <a href="/portal" className="lg:hidden bg-pink-600 text-white px-4 py-2 rounded-xl font-bold">Menu</a>
        </div>
      </header>
    </>
  );
}

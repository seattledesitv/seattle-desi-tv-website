"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function StudioHeader() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    ["Dashboard", "/studio"],
    ["Homepage", "/studio/homepage"],
    ["Hero", "/studio/hero"],
    ["Featured Events", "/studio/featured-events"],
    ["Sponsors", "/studio/sponsors"],
    ["Analytics", "/studio/analytics"],
    ["Events", "/studio/events"],
    ["Pending Events", "/studio/events/pending"],
    ["Businesses", "/studio/businesses"],
    ["Contact Requests", "/studio/contact-requests"],
    ["Coverage", "/studio/coverage"],
    ["Crew", "/studio/crew/pending"],
    ["Volunteers", "/studio/volunteers"],
    ["Video Production", "/studio/video-production"],
    ["Calendar", "/studio/assignments-calendar"],
    ["Roles", "/studio/roles"],
    ["Team", "/studio/team"],
    ["Radio", "/studio/radio-team"],
  ];

  async function loadUnreadCount() {
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    if (!user?.id) { setUnreadCount(0); return; }
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false);
    setUnreadCount(count || 0);
  }

  useEffect(() => { loadUnreadCount(); }, []);

  const notificationLabel = unreadCount > 0 ? `Notifications (${unreadCount})` : "Notifications";

  return (
    <div className="bg-slate-950 text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <a href="/" className="text-pink-300 font-bold text-sm">← Public Site</a>
              <h1 className="text-2xl font-black">SDTV Studio</h1>
            </div>
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} className="lg:hidden border border-white/20 px-3 py-2 rounded-lg transition text-sm font-black">{menuOpen ? "Close" : "Menu"}</button>
          </div>

          <nav className="hidden lg:flex flex-wrap gap-2 text-sm font-bold">
            {links.map(([label, href]) => <a key={href} href={href} className="bg-white/10 hover:bg-pink-600 px-3 py-2 rounded-lg transition">{label}</a>)}
            <a href="/notifications?from=studio" className="bg-white/10 hover:bg-pink-600 px-3 py-2 rounded-lg transition relative">{notificationLabel}</a>
          </nav>

          {menuOpen && <nav className="lg:hidden grid grid-cols-2 gap-2 text-sm font-bold">
            {links.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="bg-white/10 hover:bg-pink-600 px-3 py-3 rounded-lg transition text-center">{label}</a>)}
            <a href="/notifications?from=studio" onClick={() => setMenuOpen(false)} className="bg-pink-600 hover:bg-pink-700 px-3 py-3 rounded-lg transition text-center col-span-2">{notificationLabel}</a>
          </nav>}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function StudioHeader() {
  const [unreadCount, setUnreadCount] = useState(0);

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

  return (
    <div className="bg-slate-950 text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div><a href="/" className="text-pink-300 font-bold text-sm">← Public Site</a><h1 className="text-2xl font-black">SDTV Studio</h1></div>
          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            {links.map(([label, href]) => <a key={href} href={href} className="bg-white/10 hover:bg-pink-600 px-3 py-2 rounded-lg transition">{label}</a>)}
            <a href="/notifications?from=studio" className="bg-white/10 hover:bg-pink-600 px-3 py-2 rounded-lg transition relative">Notifications{unreadCount > 0 && <span className="ml-2 bg-pink-600 text-white rounded-full px-2 py-0.5 text-xs">{unreadCount}</span>}</a>
          </nav>
        </div>
      </div>
    </div>
  );
}

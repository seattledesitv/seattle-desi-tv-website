"use client";

import { useState } from "react";
import AccountMenu from "./AccountMenu";

export default function StudioHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    ["Dashboard", "/studio"],
    ["Homepage", "/studio/homepage"],
    ["Hero", "/studio/hero"],
    ["Featured Events", "/studio/featured-events"],
    ["Featured Social", "/studio/featured-social"],
    ["Testimonials", "/studio/testimonials"],
    ["Sponsors", "/studio/sponsors"],
    ["Analytics", "/studio/analytics"],
    ["Event Ops", "/studio/event-ops"],
    ["Influencer Ops", "/studio/influencer-ops"],
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

  return (
    <div className="bg-slate-950 text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <a href="/" className="text-pink-300 font-bold text-sm">← Public Site</a>
              <h1 className="text-2xl font-black">SDTV Studio</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <AccountMenu tone="dark" from="studio" />
              <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} className="lg:hidden border border-white/20 px-3 py-2 rounded-lg transition text-sm font-black">{menuOpen ? "Close" : "Menu"}</button>
            </div>
          </div>

          <nav className="hidden lg:flex flex-wrap gap-2 text-sm font-bold">
            {links.map(([label, href]) => <a key={href} href={href} className="bg-white/10 hover:bg-pink-600 px-3 py-2 rounded-lg transition">{label}</a>)}
          </nav>

          {menuOpen && <nav className="lg:hidden grid grid-cols-2 gap-2 text-sm font-bold">
            {links.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="bg-white/10 hover:bg-pink-600 px-3 py-3 rounded-lg transition text-center">{label}</a>)}
          </nav>}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import AccountMenu from "./AccountMenu";

const primaryLinks = [
  ["Dashboard", "/studio"],
  ["Event Ops", "/studio/event-ops-v2"],
  ["Influencer Management", "/studio/influencer-management"],
];

const groups = [
  {
    title: "Website",
    links: [
      ["Homepage", "/studio/homepage"],
      ["Hero", "/studio/hero"],
      ["Featured Events", "/studio/featured-events"],
      ["Featured Social", "/studio/featured-social"],
      ["Testimonials", "/studio/testimonials"],
      ["Sponsors", "/studio/sponsors"],
    ],
  },
  {
    title: "Operations",
    links: [
      ["Event Ops", "/studio/event-ops-v2"],
      ["Legacy Event Ops", "/studio/event-ops"],
      ["Events", "/studio/events"],
      ["Pending Events", "/studio/events/pending"],
      ["Coverage Briefs", "/studio/event-coverage-briefs"],
      ["Calendar", "/studio/assignments-calendar"],
    ],
  },
  {
    title: "People",
    links: [
      ["User Control", "/studio/users"],
      ["Crew", "/studio/crew/pending"],
      ["Volunteers", "/studio/volunteers"],
      ["Team", "/studio/team"],
      ["Roles", "/studio/roles"],
      ["Influencer Management", "/studio/influencer-management"],
      ["Influencer Applications", "/studio/influencer-ops"],
      ["Influencer Directory", "/studio/influencers"],
    ],
  },
  {
    title: "Media",
    links: [
      ["Video Production", "/studio/video-production"],
      ["Radio", "/studio/radio-team"],
      ["Coverage", "/studio/coverage"],
    ],
  },
  {
    title: "Community",
    links: [
      ["Businesses", "/studio/businesses"],
      ["Contact Requests", "/studio/contact-requests"],
    ],
  },
  {
    title: "Insights",
    links: [["Analytics", "/studio/analytics"]],
  },
];

export default function StudioHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState("");

  function toggleGroup(title: string) {
    setOpenGroup((current) => (current === title ? "" : title));
  }

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

          <nav className="hidden lg:flex flex-wrap items-center gap-2 text-sm font-bold" onMouseLeave={() => setOpenGroup("")}>
            {primaryLinks.map(([label, href]) => <a key={href} href={href} className="bg-pink-600 hover:bg-pink-500 px-3 py-2 rounded-lg transition">{label}</a>)}
            {groups.map((group) => {
              const isOpen = openGroup === group.title;
              return <div key={group.title} className="relative" onMouseEnter={() => setOpenGroup(group.title)}>
                <button type="button" onClick={() => toggleGroup(group.title)} aria-expanded={isOpen} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition">{group.title} ▾</button>
                {isOpen && <div className="absolute left-0 top-full z-50 min-w-64 rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
                  {group.links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpenGroup("")} className="block rounded-xl px-3 py-2 text-sm text-white hover:bg-pink-600">{label}</a>)}
                </div>}
              </div>;
            })}
          </nav>

          {menuOpen && <nav className="lg:hidden grid gap-3 text-sm font-bold">
            <div className="grid grid-cols-1 gap-2">
              {primaryLinks.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="bg-pink-600 px-3 py-3 rounded-lg transition text-center">{label}</a>)}
            </div>
            {groups.map((group) => <div key={group.title} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-pink-200">{group.title}</p>
              <div className="grid grid-cols-2 gap-2">
                {group.links.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="bg-white/10 hover:bg-pink-600 px-3 py-3 rounded-lg transition text-center">{label}</a>)}
              </div>
            </div>)}
          </nav>}
        </div>
      </div>
    </div>
  );
}

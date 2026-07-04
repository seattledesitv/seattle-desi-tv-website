"use client";

import { useEffect, useState } from "react";
import AccountMenu from "./AccountMenu";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, isVideoEditorRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

type HubLink = { label: string; href: string; show: boolean; tone?: "default" | "primary" | "team"; };

export default function MyHubHeader() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("general_public");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    setPathname(window.location.pathname || "");
    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user || null;
      setEmail(user?.email || "");
      setRole(await resolveUserRole(supabase, user));
    }
    load();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  const canSeeTeamTools = isTeamRole(role);
  const canSeeVideoTools = isVideoEditorRole(role) || isAdminRole(role);
  const canSeeStudio = isAdminRole(role);
  const shouldShowJourney = Boolean(email) && !canSeeTeamTools && !canSeeStudio && !canSeeVideoTools;

  const links: HubLink[] = [
    { label: "My Dashboard", href: "/my-hub", show: true, tone: "primary" },
    { label: "My Profile", href: "/my-profile", show: Boolean(email) },
    { label: "My ID Badge", href: "/my-id-badge", show: Boolean(email) },
    { label: "My Notifications", href: "/notifications", show: Boolean(email) },
    { label: "My Influencer Profile", href: "/my-influencer-profile", show: Boolean(email) },
    { label: "My Community Submissions", href: "/my-community-submissions", show: Boolean(email) },
    { label: "My Events", href: "/my-events", show: true },
    { label: "My Event Status", href: "/my-events-v2", show: true },
    { label: "My Businesses", href: "/my-businesses", show: true },
    { label: "My Coverage Opportunities", href: "/my-coverage", show: true, tone: canSeeTeamTools ? "default" : "team" },
    { label: "My Coverage Assignments", href: "/my-assignments", show: true, tone: canSeeTeamTools ? "default" : "team" },
    { label: "My Video Assignments", href: "/my-video-assignments", show: canSeeVideoTools, tone: "default" },
    { label: "My Availability", href: "/my-availability", show: true, tone: canSeeTeamTools ? "default" : "team" },
    { label: "My Contact Requests", href: "/my-contact-requests", show: true },
    { label: "My SDTV Journey", href: "/my-role-requests", show: shouldShowJourney },
    { label: "Studio", href: "/studio", show: canSeeStudio, tone: "primary" },
  ];

  function isActive(href: string) {
    if (!pathname) return false;
    if (href === "/my-events") return pathname === "/my-events";
    if (href === "/my-events-v2") return pathname === "/my-events-v2";
    if (href === "/my-hub") return pathname === "/my-hub";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function linkClass(tone?: HubLink["tone"], active?: boolean) {
    if (active) return "relative bg-pink-600 text-white shadow-lg shadow-pink-900/30 ring-1 ring-pink-300/40 after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-pink-200";
    if (tone === "primary") return "bg-white/10 hover:bg-pink-600 text-white";
    if (tone === "team") return "bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10";
    return "bg-white/10 hover:bg-pink-600 text-white";
  }

  return (
    <div className="bg-slate-950 text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <a href="/" className="text-pink-300 font-bold text-sm">← Public Site</a>
              <h1 className="truncate text-2xl font-black">My Hub</h1>
            </div>
            <div className="flex gap-2 shrink-0 items-center">
              <button type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} className="lg:hidden border border-white/20 px-3 py-2 rounded-lg transition text-sm font-black">☰ Menu</button>
              <div className="hidden sm:block"><AccountMenu tone="dark" from="hub" /></div>
            </div>
          </div>

          <nav className="hidden lg:flex flex-wrap gap-2 text-sm font-bold">
            {links.filter((link) => link.show).map((link) => {
              const active = isActive(link.href);
              return <a key={link.href + link.label} href={link.href} aria-current={active ? "page" : undefined} className={`${linkClass(link.tone, active)} px-3 py-2 rounded-lg transition`}>{link.label}{link.tone === "team" ? " · Team" : ""}</a>;
            })}
          </nav>

          {menuOpen && <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/95 text-white backdrop-blur-md">
            <div className="flex min-h-screen flex-col px-5 py-5">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="min-w-0"><a href="/" onClick={() => setMenuOpen(false)} className="text-sm font-bold text-pink-300">← Public Site</a><h2 className="truncate text-2xl font-black">My Hub</h2><p className="truncate text-xs font-bold text-slate-400">{email || "SDTV workspace"}</p></div>
                <button type="button" onClick={() => setMenuOpen(false)} className="rounded-xl bg-white px-4 py-2 font-black text-slate-950">Close</button>
              </div>
              <nav className="mt-5 grid flex-1 content-start gap-2 overflow-y-auto pb-8 text-base font-black">
                {links.filter((link) => link.show).map((link) => {
                  const active = isActive(link.href);
                  return <a key={link.href + link.label} href={link.href} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`${active ? "bg-pink-600 text-white" : link.tone === "team" ? "bg-white/5 text-slate-300 border border-white/10" : "bg-white/10 text-white"} rounded-2xl px-4 py-4`}>{link.label}{link.tone === "team" ? " · Team" : ""}</a>;
                })}
                <div className="pt-3"><AccountMenu tone="dark" from="hub" /></div>
              </nav>
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}

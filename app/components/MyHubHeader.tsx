"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

type HubLink = {
  label: string;
  href: string;
  show: boolean;
  tone?: "default" | "primary" | "team";
};

export default function MyHubHeader() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("general_public");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user || null;
      setEmail(user?.email || "");
      setRole(await resolveUserRole(supabase, user));
    }
    load();
  }, []);

  const canSeeTeamTools = isTeamRole(role);
  const canSeeStudio = isAdminRole(role);

  const links: HubLink[] = [
    { label: "Hub Home", href: "/my-hub", show: true, tone: "primary" },
    { label: "Portal", href: "/portal", show: true },
    { label: "Events", href: "/my-events", show: true },
    { label: "Businesses", href: "/my-businesses", show: true },
    { label: "Coverage", href: "/my-coverage", show: true },
    { label: "Contacts", href: "/my-contact-requests", show: true },
    { label: "Role Requests", href: "/my-role-requests", show: true },
    { label: "Assignments", href: "/my-assignments", show: true, tone: canSeeTeamTools ? "default" : "team" },
    { label: "Availability", href: "/my-availability", show: true, tone: canSeeTeamTools ? "default" : "team" },
    { label: "Notifications", href: "/notifications?from=hub", show: Boolean(email) },
    { label: "Account", href: "/login", show: true },
    { label: "Studio", href: "/studio", show: canSeeStudio, tone: "primary" },
  ];

  function linkClass(tone?: HubLink["tone"]) {
    if (tone === "primary") return "bg-pink-600 hover:bg-pink-700 text-white";
    if (tone === "team") return "bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10";
    return "bg-white/10 hover:bg-pink-600 text-white";
  }

  return (
    <div className="bg-slate-950 text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <a href="/" className="text-pink-300 font-bold text-sm">← Public Site</a>
              <h1 className="text-2xl font-black">My Hub</h1>
              <p className="text-xs text-slate-400 mt-1">{email ? `${email} · ${role}` : "Login to access team tools"}</p>
            </div>
            <a href="/login" className="lg:hidden bg-pink-600 hover:bg-pink-700 px-3 py-2 rounded-lg transition text-sm font-bold text-center">Account</a>
          </div>

          <nav className="overflow-x-auto whitespace-nowrap flex gap-2 text-sm font-bold pb-1 -mx-1 px-1">
            {links.filter((link) => link.show).map((link) => (
              <a key={link.href + link.label} href={link.href} className={`${linkClass(link.tone)} px-3 py-2 rounded-lg transition shrink-0`}>
                {link.label}{link.tone === "team" ? " · Team" : ""}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

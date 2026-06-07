"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

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

  const links = [
    ["Hub Home", "/my-hub", true],
    ["Portal", "/portal", true],
    ["My Assignments", "/my-assignments", canSeeTeamTools],
    ["My Availability", "/my-availability", canSeeTeamTools],
    ["Notifications", "/notifications", Boolean(email)],
    ["Studio", "/studio", canSeeStudio],
  ];

  return (
    <div className="bg-slate-950 text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <a href="/" className="text-pink-300 font-bold text-sm">← Public Site</a>
            <h1 className="text-2xl font-black">My Hub</h1>
            <p className="text-xs text-slate-400 mt-1">{email ? `${email} · ${role}` : "Login to access team tools"}</p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            {links.filter(([, , show]) => show).map(([label, href]) => (
              <a key={String(href)} href={String(href)} className="bg-white/10 hover:bg-pink-600 px-3 py-2 rounded-lg transition">
                {label}
              </a>
            ))}
            <a href="/login" className="bg-pink-600 hover:bg-pink-700 px-3 py-2 rounded-lg transition">Account</a>
          </nav>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

export default function SiteFooter() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("general_public");

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user || null;
      setEmail(user?.email || "");
      setRole(await resolveUserRole(supabase, user));
    }
    loadUser();
  }, []);

  const loggedIn = Boolean(email);
  const admin = isAdminRole(role);
  const team = isTeamRole(role);

  return (
    <footer className="bg-[#050b18] text-white px-6 md:px-10 py-10 mt-12">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
        <div>
          <h2 className="text-2xl font-black">Seattle Desi TV</h2>
          <p className="text-slate-300 mt-3 text-sm">Community media, culture, events, radio, interviews, and stories across the Pacific Northwest.</p>
        </div>
        <div>
          <h3 className="font-black mb-3">Explore</h3>
          <div className="grid gap-2 text-sm text-slate-300">
            <a href="/events">Events</a>
            <a href="/businesses">Businesses</a>
            <a href="/team">Team</a>
            <a href="/contact">Contact</a>
            <a href="/radio">Radio</a>
          </div>
        </div>
        <div>
          <h3 className="font-black mb-3">My SDTV</h3>
          <div className="grid gap-2 text-sm text-slate-300">
            <a href="/my-hub">My Hub</a>
            {team && <a href="/my-coverage">Coverage Opportunities</a>}
            {team && <a href="/my-assignments">My Assignments</a>}
            {team && <a href="/my-availability">My Availability</a>}
            {admin && <a href="/studio">Studio</a>}
            <a href="/login">{loggedIn ? "My Account" : "Login"}</a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-white/10 mt-8 pt-6 text-xs text-slate-400">Seattle Desi TV community media platform.</div>
    </footer>
  );
}

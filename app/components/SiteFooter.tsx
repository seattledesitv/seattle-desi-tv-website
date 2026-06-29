"use client";

import { useEffect, useState } from "react";
import NewsletterSubscribeForm from "./NewsletterSubscribeForm";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, resolveUserRole } from "../lib/roles";
import { SDTV_PHONE_DISPLAY, SdtvContactButtons } from "./SdtvContactLinks";

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
      <div className="max-w-7xl mx-auto mb-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 md:p-8 shadow-2xl">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-pink-300">Subscribe to SDTV</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-black">Hear from us</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Get Seattle Desi TV community updates, events, interviews, TV, radio, local business highlights, and special announcements.</p>
          </div>
          <NewsletterSubscribeForm source="footer" compact />
        </div>
      </div>
      <div className="max-w-7xl mx-auto mb-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 md:p-6">
        <div className="mb-4">
          <p className="text-sm font-black uppercase tracking-wide text-pink-300">Connect with SDTV</p>
          <h3 className="mt-1 text-2xl font-black">Call, WhatsApp, or join the fan club</h3>
          <p className="mt-2 text-sm text-slate-300">Phone: {SDTV_PHONE_DISPLAY}</p>
        </div>
        <SdtvContactButtons />
      </div>
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
        <div>
          <h2 className="text-2xl font-black">Seattle Desi TV</h2>
          <p className="text-slate-300 mt-3 text-sm">Community media, culture, events, radio, interviews, and stories across the Pacific Northwest.</p>
          <a href="/submit-content" className="mt-4 inline-flex rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white">Submit Content</a>
        </div>
        <div>
          <h3 className="font-black mb-3">Explore</h3>
          <div className="grid gap-2 text-sm text-slate-300">
            <a href="/tv">TV</a>
            <a href="/radio">Radio</a>
            <a href="/events">Events</a>
            <a href="/businesses">Businesses</a>
            <a href="/influencers">Influencers</a>
            <a href="/submit-content">Submit Content</a>
            <a href="/team">Team</a>
            <a href="/contact">Contact</a>
            <a href="/mobile-app">Mobile App Instructions</a>
          </div>
        </div>
        <div>
          <h3 className="font-black mb-3">My SDTV</h3>
          <div className="grid gap-2 text-sm text-slate-300">
            {loggedIn && <a href="/my-hub">My Hub</a>}
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

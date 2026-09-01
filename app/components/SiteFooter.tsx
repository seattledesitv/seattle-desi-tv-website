"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NewsletterSubscribeForm from "./NewsletterSubscribeForm";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, resolveUserRole } from "../lib/roles";
import { SdtvContactButtons } from "./SdtvContactLinks";
import { useCurrentSite } from "../lib/sites/SiteContext";

const supabase = getSupabaseBrowserClient();

export default function SiteFooter() {
  const site = useCurrentSite();
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
            <p className="text-sm font-black uppercase tracking-wide text-pink-300">Subscribe to {site.shortName}</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-black">Hear from us</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Get {site.name} community updates, events, interviews, TV, radio, local business highlights, and special announcements.</p>
            <Link href="/subscribe" className="mt-3 inline-flex text-sm font-black text-pink-300 underline">Open the full Subscribe page</Link>
          </div>
          <NewsletterSubscribeForm source="footer" compact />
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-8 rounded-[2rem] border border-amber-100 bg-[#fffaf0] p-5 text-slate-950 shadow-2xl shadow-black/20 md:p-6">
        <div className="mb-4">
          <p className="text-sm font-black uppercase tracking-wide text-pink-600">Connect with {site.shortName}</p>
          <h3 className="mt-1 text-2xl font-black">Call, WhatsApp, or join the fan club</h3>
          {(site.settings.phone_display || site.settings.whatsapp_number) && <p className="mt-2 text-sm text-slate-700">Phone: {String(site.settings.phone_display || site.settings.whatsapp_number)}</p>}
        </div>
        <SdtvContactButtons tone="light" />
      </div>

      <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <h2 className="text-2xl font-black">{site.name}</h2>
          <p className="text-slate-300 mt-3 text-sm leading-6">{String(site.settings.region_description || `Community media, culture, events, radio, interviews, and stories for ${site.city} and the surrounding region.`)}</p>
          <a href="/submit-content" className="mt-4 inline-flex rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white">Submit Content</a>
        </div>

        <div>
          <h3 className="font-black mb-3">Explore</h3>
          <div className="grid gap-2 text-sm text-slate-300">
            <Link href="/tv">TV</Link>
            <Link href="/about">About Us</Link>
            <Link href="/radio">Radio</Link>
            <Link href="/events">Events</Link>
            <Link href="/publications">Publications</Link>
            <Link href="/subscribe">Subscribe</Link>
            <Link href="/businesses">Businesses</Link>
            <Link href="/offers">Business Offers</Link>
            <Link href="/classifieds">Community Classifieds</Link>
            <Link href="/press-releases">Press Releases</Link>
            <Link href="/matrimony">Matrimony</Link>
            <Link href="/community-groups">Groups</Link>
            <Link href="/community-organizations">Organizations</Link>
            <Link href="/influencers">Influencers</Link>
            <Link href="/team">Team</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/mobile-app">Mobile App Instructions</Link>
          </div>
        </div>

        <div>
          <h3 className="font-black mb-3">My SDTV</h3>
          <div className="grid gap-2 text-sm text-slate-300">
            {loggedIn && <a href="/my-hub">My Hub</a>}
            {loggedIn && <a href="/my-classifieds">My Classifieds</a>}
            {loggedIn && <a href="/my-press-releases">My Press Releases</a>}
            {team && <a href="/my-coverage">Coverage Opportunities</a>}
            {team && <a href="/my-assignments">My Assignments</a>}
            {team && <a href="/my-availability">My Availability</a>}
            {admin && <a href="/studio">Studio</a>}
            <a href="/login">{loggedIn ? "My Account" : "Login"}</a>
          </div>
        </div>

        <div>
          <h3 className="font-black mb-3">Legal</h3>
          <div className="grid gap-2 text-sm text-slate-300">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms & Conditions</a>
            <a href="/content-policy">Content Usage Policy</a>
          </div>
          <div className="mt-6 border-t border-white/10 pt-5 text-sm text-slate-300">
            <p className="font-black text-white">Platform designed &amp; developed by</p>
            <p className="mt-1">Bharath Kumar Arekapudi</p>
            <a className="mt-2 inline-block text-pink-300 underline" href="mailto:abharathkumar@gmail.com">abharathkumar@gmail.com</a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
        <p>© 2026 {site.name}. All Rights Reserved.</p>
        <p>SDTV Platform v1.0.3</p>
      </div>
    </footer>
  );
}

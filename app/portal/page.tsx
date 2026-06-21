"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isVideoEditorRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

export default function PortalPage() {
  const [role, setRole] = useState("general_public");

  useEffect(() => {
    async function loadRole() {
      const { data } = await supabase.auth.getUser();
      setRole(await resolveUserRole(supabase, data?.user || null));
    }
    loadRole();
  }, []);

  const canSeeStudio = isAdminRole(role);
  const canSeeVideoTools = isVideoEditorRole(role) || canSeeStudio;
  const links = [
    ["My Assignments", "/my-assignments", "Confirm assignments and submit event coverage content."],
    ["Coverage Opportunities", "/my-coverage", "Request to join approved SDTV coverage opportunities."],
    ...(canSeeVideoTools ? [["My Video Assignments", "/my-video-assignments", "Open assigned video editing work and workflow status."]] : []),
    ["My Availability", "/my-availability", "Share when you can support SDTV coverage."],
    ["Notifications", "/notifications?from=hub", "View SDTV alerts and updates."],
    ["My Event Submissions", "/my-events", "Track events you submitted to SDTV."],
    ["My Business Listings", "/my-businesses", "Track business listings you submitted."],
    ["My Contact Requests", "/my-contact-requests", "Review messages and requests you submitted."],
    ...(canSeeStudio ? [["Studio", "/studio", "Admin workspace."]] : []),
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p>
        <h1 className="text-4xl md:text-6xl font-black mt-3">Seattle Desi TV Portal</h1>
        <p className="text-slate-300 mt-3 max-w-3xl mb-8">Your SDTV workspace for assignments, coverage opportunities, submissions, account updates, and notifications.</p>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {links.map(([label, href, note]) => (
            <a key={href} href={href} className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl border hover:scale-[1.01] transition block">
              <h2 className="text-xl font-black">{label}</h2>
              <p className="text-gray-600 mt-2 text-sm">{note}</p>
            </a>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

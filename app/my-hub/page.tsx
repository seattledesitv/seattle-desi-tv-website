"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

export default function MyHubPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("general_public");
  const [assignmentsCount, setAssignmentsCount] = useState(0);
  const [availabilityCount, setAvailabilityCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);

  async function loadHub() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    setEmail(user?.email || "");
    const nextRole = await resolveUserRole(supabase, user);
    setRole(nextRole);
    if (user?.id) {
      const [assignments, availability, notifications] = await Promise.all([
        supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "approved"),
        supabase.from("crew_availability").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("available_date", new Date().toISOString().split("T")[0]),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
      ]);
      setAssignmentsCount(assignments.count || 0);
      setAvailabilityCount(availability.count || 0);
      setNotificationsCount(notifications.count || 0);
    }
    setLoading(false);
  }

  useEffect(() => { loadHub(); }, []);

  const team = isTeamRole(role);
  const admin = isAdminRole(role);
  const cards = [
    { title: "Portal", note: "General SDTV links and workspace entry point.", href: "/portal", value: "Open" },
    { title: "My Assignments", note: "Confirm, complete, and track event coverage.", href: "/my-assignments", value: team ? assignmentsCount : "Team" },
    { title: "My Availability", note: "Share dates you can support coverage.", href: "/my-availability", value: team ? availabilityCount : "Team" },
    { title: "Notifications", note: "Unread SDTV alerts and updates.", href: "/notifications", value: notificationsCount },
    { title: "Account", note: "Login, role request, and account access.", href: "/login", value: email ? "Signed in" : "Login" },
    { title: "Studio", note: "Admin operations and content management.", href: "/studio", value: admin ? "Admin" : "Locked" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white/10 border border-white/10 rounded-3xl p-8 md:p-10 mb-8">
          <p className="text-pink-300 font-black uppercase tracking-wide">Seattle Desi TV Workspace</p>
          <h1 className="text-4xl md:text-6xl font-black mt-3">My Hub</h1>
          <p className="text-slate-300 max-w-3xl mt-3">One place for your SDTV portal, assignments, availability, notifications, and account tools.</p>
          <p className="text-slate-400 text-sm mt-4">{loading ? "Loading..." : email ? `${email} · ${role}` : "Please login to access your personalized hub."}</p>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map((card) => (
            <a key={card.href} href={card.href} className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl border hover:scale-[1.01] transition block">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="text-2xl font-black">{card.title}</h2><p className="text-gray-600 mt-2">{card.note}</p></div>
                <span className="bg-pink-50 text-pink-600 rounded-full px-3 py-1 text-sm font-black">{card.value}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

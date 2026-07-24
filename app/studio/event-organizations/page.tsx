"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import EventOrganizationManager from "../../components/EventOrganizationManager";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

export default function StudioEventOrganizationsPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("Checking access...");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user || null;
      if (!user) { setMessage("Please login to access Event Organization Ops."); setLoading(false); return; }
      const role = await resolveUserRole(supabase, user);
      setAllowed(isAdminRole(role));
      setMessage(isAdminRole(role) ? "" : "This page is for SDTV admins only.");
      setLoading(false);
    }
    load();
  }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8"><p className="font-black uppercase tracking-wide text-pink-300">Event Ops</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Event Organizations</h1><p className="mt-2 max-w-3xl text-slate-300">Manage organizers, partners, sponsors, venues, charities, educational partners, and media relationships across all events.</p><a href="/studio/event-ops-v2" className="mt-5 inline-flex rounded-xl border border-white/20 px-4 py-3 font-black text-white">← Back to Event Operations</a></div>{loading ? <div className="rounded-2xl bg-white/10 p-6">{message}</div> : !allowed ? <div className="rounded-2xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Access Required</h2><p className="mt-3 text-slate-600">{message}</p></div> : <EventOrganizationManager mode="admin" />}</section></main>;
}

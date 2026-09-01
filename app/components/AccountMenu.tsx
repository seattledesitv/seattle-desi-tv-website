"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, isVideoEditorRole, resolveUserRole } from "../lib/roles";
import { useCurrentSite } from "../lib/sites/SiteContext";
import { forSite } from "../lib/sites/query";

const supabase = getSupabaseBrowserClient();

type AccountMenuProps = { tone?: "light" | "dark"; from?: "site" | "hub" | "studio" };
function initials(email: string) { return String(email || "?").trim().charAt(0).toUpperCase() || "?"; }
function roleLabel(role: string) { return String(role || "general_public").replaceAll("_", " "); }

export default function AccountMenu({ tone = "light", from = "site" }: AccountMenuProps) {
  const site = useCurrentSite();
  const [open, setOpen] = useState(false), [email, setEmail] = useState(""), [role, setRole] = useState("general_public"), [unreadCount, setUnreadCount] = useState(0), [businessCount, setBusinessCount] = useState(0);
  async function load() {
    const { data } = await supabase.auth.getUser(); const user = data?.user || null; const nextRole = await resolveUserRole(supabase, user); let nextUnreadCount = 0, nextBusinessCount = 0;
    if (user?.id) {
      const [{ count }, managerResult, submittedResult] = await Promise.all([
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
        forSite(supabase.from("business_managers").select("business_id"), site.id).eq("user_id", user.id).eq("active", true),
        forSite(supabase.from("local_businesses").select("id"), site.id).eq("created_by", user.id),
      ]);
      nextUnreadCount = count || 0;
      const ids = new Set<string>(); (managerResult.data || []).forEach((row: any) => ids.add(row.business_id)); (submittedResult.data || []).forEach((row: any) => ids.add(row.id)); nextBusinessCount = ids.size;
    }
    setEmail(user?.email || ""); setRole(nextRole); setUnreadCount(nextUnreadCount); setBusinessCount(nextBusinessCount);
  }
  async function logout() { await supabase.auth.signOut(); setOpen(false); window.location.href = "/"; }
  useEffect(() => { load(); }, [site.id]);
  const loggedIn = Boolean(email), dark = tone === "dark", canSeeStudio = isAdminRole(role), canSeeTeam = isTeamRole(role), canSeeVideo = isVideoEditorRole(role) || canSeeStudio;
  const triggerClass = dark ? "border border-white/20 bg-white/10 text-white hover:bg-white/15" : "border border-slate-200 bg-white text-slate-950 shadow-sm hover:bg-slate-50";
  if (!loggedIn) return <a href="/login" className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-black text-white">Login</a>;
  return <div className="relative flex items-center gap-2"><a href={`/notifications?from=${from}`} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} className={`relative grid h-10 w-10 place-items-center rounded-full font-black ${triggerClass}`}><span aria-hidden="true" className="text-lg leading-none">🔔</span>{unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-pink-600 px-1 text-[10px] font-black text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}</a><button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label="Open account menu" className={`grid h-10 w-10 place-items-center rounded-full font-black ${triggerClass}`}>{initials(email)}</button>{open && <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-2xl"><div className="border-b border-slate-100 pb-3"><p className="break-all font-black">{email}</p><p className="mt-1 inline-flex rounded-full bg-pink-50 px-3 py-1 text-xs font-black capitalize text-pink-700">{roleLabel(role)}</p></div><div className="grid gap-1 py-3 text-sm font-bold"><a href="/my-hub" className="rounded-xl px-3 py-2 hover:bg-slate-100">My Hub</a><a href="/my-businesses" className="rounded-xl px-3 py-2 hover:bg-slate-100">My Businesses{businessCount ? ` (${businessCount})` : ""}</a><a href="/login" className="rounded-xl px-3 py-2 hover:bg-slate-100">My Account</a><a href={`/notifications?from=${from}`} className="rounded-xl px-3 py-2 hover:bg-slate-100">Notifications{unreadCount ? ` (${unreadCount})` : ""}</a><a href="/recognition" className="rounded-xl px-3 py-2 hover:bg-slate-100">Recognition</a>{canSeeTeam && <a href="/my-assignments" className="rounded-xl px-3 py-2 hover:bg-slate-100">My Assignments</a>}{canSeeVideo && <a href="/my-video-assignments" className="rounded-xl px-3 py-2 hover:bg-slate-100">Video Queue</a>}{canSeeStudio && <a href="/studio" className="rounded-xl px-3 py-2 hover:bg-slate-100">Studio</a>}</div><button type="button" onClick={logout} className="w-full rounded-xl border border-red-200 px-3 py-2 text-left text-sm font-black text-red-600 hover:bg-red-50">Logout</button></div>}</div>;
}

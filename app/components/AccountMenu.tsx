"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, isVideoEditorRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

type AccountMenuProps = {
  tone?: "light" | "dark";
  from?: "site" | "hub" | "studio";
};

function initials(email: string) {
  return String(email || "?").trim().charAt(0).toUpperCase() || "?";
}

function roleLabel(role: string) {
  return String(role || "general_public").replaceAll("_", " ");
}

export default function AccountMenu({ tone = "light", from = "site" }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("general_public");
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    const nextRole = await resolveUserRole(supabase, user);
    let nextUnreadCount = 0;
    if (user?.id) {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false);
      nextUnreadCount = count || 0;
    }
    setEmail(user?.email || "");
    setRole(nextRole);
    setUnreadCount(nextUnreadCount);
  }

  async function logout() {
    await supabase.auth.signOut();
    setOpen(false);
    window.location.href = "/";
  }

  useEffect(() => { load(); }, []);

  const loggedIn = Boolean(email);
  const dark = tone === "dark";
  const canSeeStudio = isAdminRole(role);
  const canSeeTeam = isTeamRole(role);
  const canSeeVideo = isVideoEditorRole(role) || canSeeStudio;
  const triggerClass = dark ? "border border-white/20 bg-white/10 text-white hover:bg-white/15" : "border border-slate-200 bg-white text-slate-950 shadow-sm hover:bg-slate-50";
  const menuClass = dark ? "bg-white text-slate-950" : "bg-white text-slate-950";

  if (!loggedIn) {
    return <a href="/login" className={`${dark ? "bg-pink-600 text-white" : "bg-pink-600 text-white"} px-4 py-2 rounded-xl font-black text-sm`}>Login</a>;
  }

  return (
    <div className="relative flex items-center gap-2">
      <a href={`/notifications?from=${from}`} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} className={`relative grid h-10 w-10 place-items-center rounded-full font-black ${triggerClass}`}>
        <span aria-hidden="true" className="text-lg leading-none">🔔</span>
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-pink-600 px-1 text-[10px] font-black text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </a>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open account menu" className={`grid h-10 w-10 place-items-center rounded-full font-black ${triggerClass}`}>
        {initials(email)}
      </button>
      {open && <div className={`absolute right-0 top-12 z-50 w-72 rounded-2xl border border-slate-200 p-4 shadow-2xl ${menuClass}`}>
        <div className="border-b border-slate-100 pb-3">
          <p className="font-black break-all">{email}</p>
          <p className="mt-1 inline-flex rounded-full bg-pink-50 px-3 py-1 text-xs font-black capitalize text-pink-700">{roleLabel(role)}</p>
        </div>
        <div className="grid gap-1 py-3 text-sm font-bold">
          <a href="/my-hub" className="rounded-xl px-3 py-2 hover:bg-slate-100">My Hub</a>
          <a href="/login" className="rounded-xl px-3 py-2 hover:bg-slate-100">My Account</a>
          <a href={`/notifications?from=${from}`} className="rounded-xl px-3 py-2 hover:bg-slate-100">Notifications{unreadCount ? ` (${unreadCount})` : ""}</a>
          <a href="/recognition" className="rounded-xl px-3 py-2 hover:bg-slate-100">Recognition</a>
          {canSeeTeam && <a href="/my-assignments" className="rounded-xl px-3 py-2 hover:bg-slate-100">My Assignments</a>}
          {canSeeVideo && <a href="/my-video-assignments" className="rounded-xl px-3 py-2 hover:bg-slate-100">Video Queue</a>}
          {canSeeStudio && <a href="/studio" className="rounded-xl px-3 py-2 hover:bg-slate-100">Studio</a>}
        </div>
        <button type="button" onClick={logout} className="w-full rounded-xl border border-red-200 px-3 py-2 text-left text-sm font-black text-red-600 hover:bg-red-50">Logout</button>
      </div>}
    </div>
  );
}

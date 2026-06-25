"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

function avatarText(row: any) {
  return String(row.full_name || row.preferred_name || row.email || "U").slice(0, 1).toUpperCase();
}

function label(value?: string | null) {
  return String(value || "general_public").replaceAll("_", " ");
}

function visibilityText(row: any) {
  if (row.public_visibility_disabled) return "Hidden everywhere";
  if (row.keep_profile_private) return "Private";
  if (row.show_name_publicly || row.allow_social_credit) return "Allowed for credit";
  return "Limited";
}

export default function StudioUsersPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadRows() {
    const { data, error } = await supabase.from("user_profiles").select("*").order("updated_at", { ascending: false }).limit(500);
    if (error) {
      setActionMessage(`Could not load user profiles: ${error.message}. Run supabase/public-user-profile.sql.`);
      setRows([]);
    } else {
      setRows(data || []);
    }
  }

  async function init() {
    setLoading(true);
    setActionMessage("");
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    const nextRole = currentUser ? await resolveUserRole(supabase, currentUser) : "";
    setRole(nextRole);
    if (!currentUser || !isAdminRole(nextRole)) {
      setMessage("Admin access required.");
      setLoading(false);
      return;
    }
    await loadRows();
    setMessage("");
    setLoading(false);
  }

  async function updateUser(row: any, payload: any, success: string) {
    setActionMessage("Updating user...");
    const { error } = await supabase.from("user_profiles").update({ ...payload, updated_at: new Date().toISOString() }).eq("user_id", row.user_id);
    if (error) {
      setActionMessage(`Update failed: ${error.message}`);
      return;
    }
    setActionMessage(success);
    await loadRows();
  }

  async function setVisibilityDisabled(row: any, disabled: boolean) {
    const reason = disabled ? window.prompt("Reason for disabling public visibility?", row.visibility_disabled_reason || "Admin disabled public visibility") : "";
    if (disabled && reason === null) return;
    await updateUser(row, {
      public_visibility_disabled: disabled,
      visibility_disabled_reason: disabled ? reason : null,
      visibility_disabled_at: disabled ? new Date().toISOString() : null,
      visibility_disabled_by: disabled ? user?.email || null : null,
      keep_profile_private: disabled ? true : row.keep_profile_private,
      show_name_publicly: disabled ? false : row.show_name_publicly,
      allow_social_credit: disabled ? false : row.allow_social_credit,
    }, disabled ? "Public visibility disabled for this user." : "Public visibility restored for this user.");
  }

  const roles = useMemo(() => Array.from(new Set(rows.map((row) => String(row.role || "general_public")))).sort(), [rows]);
  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== "all" && String(row.role || "general_public") !== roleFilter) return false;
      if (visibilityFilter === "hidden" && !row.public_visibility_disabled) return false;
      if (visibilityFilter === "public_ok" && row.public_visibility_disabled) return false;
      if (!q) return true;
      return [row.full_name, row.preferred_name, row.email, row.phone, row.city, row.role, row.short_bio].some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [rows, searchText, roleFilter, visibilityFilter]);

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white">
    <StudioHeader />
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-black uppercase tracking-wide text-pink-300">People</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">User Control</h1>
          <p className="mt-2 max-w-3xl text-slate-300">View registered SDTV profiles, roles, photos, contact details, and global public visibility controls from one place.</p>
        </div>
        <button onClick={init} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button>
      </div>

      {loading && <div className="rounded-2xl bg-white/10 p-6">{message}</div>}
      {!loading && !canAccess && <div className="rounded-2xl bg-white p-8 text-slate-950">{message}</div>}
      {!loading && canAccess && <div className="space-y-5">
        {actionMessage && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}
        <section className="grid gap-3 rounded-3xl bg-white/10 p-4 md:grid-cols-[1fr_220px_220px_120px]">
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search name, email, phone, city, role..." className="rounded-xl bg-white px-4 py-3 font-bold text-slate-950" />
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-xl bg-white px-4 py-3 font-bold text-slate-950"><option value="all">All roles</option>{roles.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          <select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)} className="rounded-xl bg-white px-4 py-3 font-bold text-slate-950"><option value="all">All visibility</option><option value="hidden">Hidden everywhere</option><option value="public_ok">Not hidden</option></select>
          <div className="rounded-xl bg-white/10 px-4 py-3 font-black">{filteredRows.length}</div>
        </section>

        <div className="grid gap-4">
          {filteredRows.map((row) => <article key={row.user_id || row.email} className={`rounded-3xl p-5 text-slate-950 shadow-xl ${row.public_visibility_disabled ? "bg-red-50 ring-2 ring-red-200" : "bg-white"}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-2xl font-black text-pink-600">{row.profile_photo_url ? <img src={row.profile_photo_url} alt="Profile" className="h-full w-full object-cover" /> : avatarText(row)}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black">{row.full_name || row.preferred_name || "Unnamed User"}</h2>{row.public_visibility_disabled && <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase text-white">Visibility disabled</span>}</div>
                  <p className="mt-1 text-sm text-slate-600">{row.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-black"><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{label(row.role)}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{visibilityText(row)}</span>{row.city && <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{row.city}</span>}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={row.role || "general_public"} onChange={(event) => updateUser(row, { role: event.target.value }, "Role updated on profile.")} className="rounded-xl border px-3 py-2 text-sm font-bold"><option value="general_public">General public</option><option value="team_member">Team member</option><option value="volunteer">Volunteer</option><option value="video_editor">Video editor</option><option value="admin">Admin</option><option value="super_admin">Super admin</option></select>
                {row.public_visibility_disabled ? <button onClick={() => setVisibilityDisabled(row, false)} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-black text-white">Restore Public Visibility</button> : <button onClick={() => setVisibilityDisabled(row, true)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white">Disable Public Visibility</button>}
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3"><p><b>Phone:</b> {row.phone || "—"}</p><p><b>Public credit:</b> {row.allow_social_credit ? "Allowed" : "No"}</p><p><b>Updated:</b> {row.updated_at ? new Date(row.updated_at).toLocaleDateString() : "—"}</p></div>
            {row.visibility_disabled_reason && <div className="mt-4 rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-800">Reason: {row.visibility_disabled_reason}</div>}
            {row.short_bio && <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{row.short_bio}</p>}
          </article>)}
          {filteredRows.length === 0 && <div className="rounded-3xl bg-white p-8 text-slate-950">No users found.</div>}
        </div>
      </div>}
    </section>
  </main>;
}

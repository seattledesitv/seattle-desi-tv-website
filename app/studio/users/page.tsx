"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

type PersonRow = {
  key: string;
  user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  preferred_name?: string | null;
  phone?: string | null;
  city?: string | null;
  role?: string | null;
  roles: string[];
  sources: string[];
  profile_photo_url?: string | null;
  image?: string | null;
  public_visibility_disabled?: boolean;
  visibility_disabled_reason?: string | null;
  keep_profile_private?: boolean;
  show_name_publicly?: boolean;
  allow_social_credit?: boolean;
  short_bio?: string | null;
  updated_at?: string | null;
};

function cleanEmail(value?: string | null) { return String(value || "").trim().toLowerCase(); }
function avatarText(row: any) { return String(row.full_name || row.preferred_name || row.name || row.email || "U").slice(0, 1).toUpperCase(); }
function label(value?: string | null) { return String(value || "general_public").replaceAll("_", " "); }
function addUnique(list: string[], value?: string | null) { const clean = String(value || "").trim(); if (clean && !list.includes(clean)) list.push(clean); }
function visibilityText(row: any) { if (row.public_visibility_disabled) return "Hidden everywhere"; if (row.keep_profile_private) return "Private"; if (row.show_name_publicly || row.allow_social_credit) return "Allowed for credit"; return "Limited"; }

export default function StudioUsersPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<PersonRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const canAccess = Boolean(user && isAdminRole(role));

  function mergePerson(map: Map<string, PersonRow>, incoming: any, source: string, sourceRole?: string) {
    const email = cleanEmail(incoming.email || incoming.user_email);
    const userId = incoming.user_id || incoming.linked_user || null;
    const key = email || String(userId || incoming.id || `${source}-${map.size}`);
    const existing: PersonRow = map.get(key) || { key, email, user_id: userId, roles: [], sources: [] };
    existing.email = existing.email || email;
    existing.user_id = existing.user_id || userId;
    existing.full_name = existing.full_name || incoming.full_name || incoming.name || incoming.user_name || null;
    existing.preferred_name = existing.preferred_name || incoming.preferred_name || null;
    existing.phone = existing.phone || incoming.phone || null;
    existing.city = existing.city || incoming.city || null;
    existing.profile_photo_url = existing.profile_photo_url || incoming.profile_photo_url || incoming.photo_url || incoming.photo || incoming.picture || null;
    existing.image = existing.image || incoming.image || incoming.id_image || null;
    existing.short_bio = existing.short_bio || incoming.short_bio || incoming.bio || null;
    existing.updated_at = existing.updated_at || incoming.updated_at || incoming.created_at || null;
    existing.role = existing.role || incoming.role || sourceRole || "general_public";
    existing.public_visibility_disabled = Boolean(existing.public_visibility_disabled || incoming.public_visibility_disabled);
    existing.visibility_disabled_reason = existing.visibility_disabled_reason || incoming.visibility_disabled_reason || incoming.reason || null;
    existing.keep_profile_private = incoming.keep_profile_private ?? existing.keep_profile_private;
    existing.show_name_publicly = incoming.show_name_publicly ?? existing.show_name_publicly;
    existing.allow_social_credit = incoming.allow_social_credit ?? existing.allow_social_credit;
    addUnique(existing.roles, incoming.role || sourceRole || "general_public");
    addUnique(existing.sources, source);
    map.set(key, existing);
  }

  async function loadRows() {
    const results = await Promise.all([
      supabase.from("user_profiles").select("*").limit(1000),
      supabase.from("admins").select("user_id,email,name,role,created_at").limit(500),
      supabase.from("team_members").select("id,user_id,email,name,title,image,photo,picture,id_image,show_on_public_team,created_at").limit(1000),
      supabase.from("radio_team_members").select("id,user_id,email,name,title,segment_name,image,created_at").limit(1000),
      supabase.from("volunteer_onboarding_submissions").select("user_id,email,full_name,phone,city,photo_url,created_at").limit(1000),
      supabase.from("influencer_profiles").select("id,user_id,email,full_name,city,bio,photo_url,status,created_at").limit(1000),
      supabase.from("public_content_requests").select("submitter_user_id,submitter_email,submitter_name,submitter_phone,submitter_city,created_at").limit(1000),
      supabase.from("public_visibility_controls").select("*").limit(1000),
    ]);

    const [profiles, admins, team, radio, volunteers, influencers, content, visibility] = results;
    const firstError = results.find((result: any) => result.error)?.error;
    if (firstError) setActionMessage(`Some user sources could not be loaded: ${firstError.message}. Make sure the latest SQL files were run.`);

    const map = new Map<string, PersonRow>();
    (profiles.data || []).forEach((row: any) => mergePerson(map, row, "Profile", row.role || "general_public"));
    (admins.data || []).forEach((row: any) => mergePerson(map, { ...row, full_name: row.name }, "Admin", row.role || "admin"));
    (team.data || []).forEach((row: any) => mergePerson(map, row, "Team", "team_member"));
    (radio.data || []).forEach((row: any) => mergePerson(map, row, "Radio", "radio"));
    (volunteers.data || []).forEach((row: any) => mergePerson(map, row, "Volunteer", "volunteer"));
    (influencers.data || []).forEach((row: any) => mergePerson(map, row, "Influencer", "influencer"));
    (content.data || []).forEach((row: any) => mergePerson(map, { user_id: row.submitter_user_id, email: row.submitter_email, full_name: row.submitter_name, phone: row.submitter_phone, city: row.submitter_city, created_at: row.created_at }, "Content Submitter", "general_public"));

    (visibility.data || []).forEach((vis: any) => {
      const key = cleanEmail(vis.email) || String(vis.user_id || "");
      const existing: PersonRow = map.get(key) || { key, email: cleanEmail(vis.email), user_id: vis.user_id, roles: ["general_public"], sources: ["Visibility"] };
      existing.public_visibility_disabled = Boolean(vis.public_visibility_disabled);
      existing.visibility_disabled_reason = vis.reason || existing.visibility_disabled_reason;
      existing.updated_at = vis.updated_at || existing.updated_at;
      map.set(key, existing);
    });

    setRows(Array.from(map.values()).sort((a, b) => String(a.full_name || a.email || "").localeCompare(String(b.full_name || b.email || ""))));
  }

  async function init() {
    setLoading(true);
    setActionMessage("");
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    const nextRole = currentUser ? await resolveUserRole(supabase, currentUser) : "";
    setRole(nextRole);
    if (!currentUser || !isAdminRole(nextRole)) { setMessage("Admin access required."); setLoading(false); return; }
    await loadRows();
    setMessage("");
    setLoading(false);
  }

  async function updateRole(row: PersonRow, nextRole: string) {
    if (!row.user_id) { setActionMessage("Role can only be updated after this person has a linked user_id/profile."); return; }
    const { error } = await supabase.from("user_profiles").upsert({ user_id: row.user_id, email: row.email, role: nextRole, updated_at: new Date().toISOString(), full_name: row.full_name || null, profile_photo_url: row.profile_photo_url || row.image || null }, { onConflict: "user_id" });
    setActionMessage(error ? `Role update failed: ${error.message}` : "Role updated on base profile.");
    await loadRows();
  }

  async function setVisibilityDisabled(row: PersonRow, disabled: boolean) {
    const email = cleanEmail(row.email);
    if (!email && !row.user_id) { setActionMessage("This row does not have an email or user id, so global visibility cannot be changed yet."); return; }
    const reason = disabled ? window.prompt("Reason for disabling public visibility?", row.visibility_disabled_reason || "Admin disabled public visibility") : "";
    if (disabled && reason === null) return;
    const payload = { email: email || `${row.user_id}@unknown.local`, user_id: row.user_id || null, public_visibility_disabled: disabled, reason: disabled ? reason : null, disabled_at: disabled ? new Date().toISOString() : null, disabled_by: disabled ? user?.email || null : null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("public_visibility_controls").upsert(payload, { onConflict: "email" });
    if (!error && row.user_id) {
      await supabase.from("user_profiles").update({ public_visibility_disabled: disabled, visibility_disabled_reason: disabled ? reason : null, visibility_disabled_at: disabled ? new Date().toISOString() : null, visibility_disabled_by: disabled ? user?.email || null : null, keep_profile_private: disabled ? true : row.keep_profile_private, show_name_publicly: disabled ? false : row.show_name_publicly, allow_social_credit: disabled ? false : row.allow_social_credit, updated_at: new Date().toISOString() }).eq("user_id", row.user_id);
    }
    setActionMessage(error ? `Visibility update failed: ${error.message}` : disabled ? "Public visibility disabled for this user." : "Public visibility restored for this user.");
    await loadRows();
  }

  const roles = useMemo(() => Array.from(new Set(rows.flatMap((row) => row.roles.length ? row.roles : [row.role || "general_public"]))).sort(), [rows]);
  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((row) => {
      const rowRoles = row.roles.length ? row.roles : [row.role || "general_public"];
      if (roleFilter !== "all" && !rowRoles.includes(roleFilter)) return false;
      if (visibilityFilter === "hidden" && !row.public_visibility_disabled) return false;
      if (visibilityFilter === "public_ok" && row.public_visibility_disabled) return false;
      if (!q) return true;
      return [row.full_name, row.preferred_name, row.email, row.phone, row.city, row.role, row.short_bio, row.sources.join(" "), row.roles.join(" ")].some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [rows, searchText, roleFilter, visibilityFilter]);

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-black uppercase tracking-wide text-pink-300">People</p><h1 className="mt-2 text-4xl font-black md:text-5xl">User Control</h1><p className="mt-2 max-w-3xl text-slate-300">Unified SDTV people directory across profiles, admins, team, volunteers, influencers, radio, and content submitters.</p></div><button onClick={init} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button></div>{loading && <div className="rounded-2xl bg-white/10 p-6">{message}</div>}{!loading && !canAccess && <div className="rounded-2xl bg-white p-8 text-slate-950">{message}</div>}{!loading && canAccess && <div className="space-y-5">{actionMessage && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}<section className="grid gap-3 rounded-3xl bg-white/10 p-4 md:grid-cols-[1fr_220px_220px_120px]"><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search name, email, phone, city, role..." className="rounded-xl bg-white px-4 py-3 font-bold text-slate-950" /><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-xl bg-white px-4 py-3 font-bold text-slate-950"><option value="all">All roles</option>{roles.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)} className="rounded-xl bg-white px-4 py-3 font-bold text-slate-950"><option value="all">All visibility</option><option value="hidden">Hidden everywhere</option><option value="public_ok">Not hidden</option></select><div className="rounded-xl bg-white/10 px-4 py-3 font-black">{filteredRows.length}</div></section><div className="grid gap-4">{filteredRows.map((row) => <article key={row.key} className={`rounded-3xl p-5 text-slate-950 shadow-xl ${row.public_visibility_disabled ? "bg-red-50 ring-2 ring-red-200" : "bg-white"}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-2xl font-black text-pink-600">{row.profile_photo_url || row.image ? <img src={row.profile_photo_url || row.image || ""} alt="Profile" className="h-full w-full object-cover" /> : avatarText(row)}</div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black">{row.full_name || row.preferred_name || "Unnamed User"}</h2>{row.public_visibility_disabled && <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase text-white">Visibility disabled</span>}</div><p className="mt-1 text-sm text-slate-600">{row.email || "No email linked"}</p><div className="mt-2 flex flex-wrap gap-2 text-xs font-black">{(row.roles.length ? row.roles : [row.role || "general_public"]).map((item) => <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{label(item)}</span>)}<span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{visibilityText(row)}</span>{row.city && <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{row.city}</span>}</div><div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">{row.sources.map((source) => <span key={source}>• {source}</span>)}</div></div></div><div className="flex flex-wrap gap-2"><select value={row.role || "general_public"} onChange={(event) => updateRole(row, event.target.value)} className="rounded-xl border px-3 py-2 text-sm font-bold"><option value="general_public">General public</option><option value="team_member">Team member</option><option value="volunteer">Volunteer</option><option value="video_editor">Video editor</option><option value="admin">Admin</option><option value="super_admin">Super admin</option></select>{row.public_visibility_disabled ? <button onClick={() => setVisibilityDisabled(row, false)} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-black text-white">Restore Public Visibility</button> : <button onClick={() => setVisibilityDisabled(row, true)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white">Disable Public Visibility</button>}</div></div><div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3"><p><b>Phone:</b> {row.phone || "—"}</p><p><b>User ID:</b> {row.user_id ? "Linked" : "Not linked"}</p><p><b>Updated:</b> {row.updated_at ? new Date(row.updated_at).toLocaleDateString() : "—"}</p></div>{row.visibility_disabled_reason && <div className="mt-4 rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-800">Reason: {row.visibility_disabled_reason}</div>}{row.short_bio && <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{row.short_bio}</p>}</article>)}{filteredRows.length === 0 && <div className="rounded-3xl bg-white p-8 text-slate-950">No users found. Run the latest SQL and make sure people exist in profiles, team, volunteers, influencers, radio, admins, or content submissions.</div>}</div></div>}</section></main>;
}

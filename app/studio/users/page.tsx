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
  state?: string | null;
  country?: string | null;
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
  allow_sdtv_contact?: boolean;
  short_bio?: string | null;
  updated_at?: string | null;
};

const roleOptions = ["general_public", "team_member", "volunteer", "video_editor", "admin", "super_admin"];
const interestOptions = ["Events", "Culture", "Business", "Community News", "Photography", "Videography", "Writing", "Volunteering", "Influencer", "Sponsor", "Advertiser"];

function cleanEmail(value?: string | null) { return String(value || "").trim().toLowerCase(); }
function label(value?: string | null) { return String(value || "general_public").replaceAll("_", " "); }
function addUnique(list: string[], value?: string | null) { const clean = String(value || "").trim(); if (clean && !list.includes(clean)) list.push(clean); }
function avatarText(row: any) { return String(row.full_name || row.preferred_name || row.name || row.email || "U").slice(0, 1).toUpperCase(); }
function visibilityText(row: any) { if (row.public_visibility_disabled) return "Hidden everywhere"; if (row.keep_profile_private) return "Private"; if (row.show_name_publicly || row.allow_social_credit) return "Allowed for credit"; return "Limited"; }
function statusClass(row: PersonRow) { return row.public_visibility_disabled ? "bg-red-100 text-red-700" : row.keep_profile_private ? "bg-slate-100 text-slate-700" : "bg-green-100 text-green-700"; }

function emptyEditForm(row?: PersonRow | null) {
  return {
    user_id: row?.user_id || "",
    email: row?.email || "",
    full_name: row?.full_name || "",
    preferred_name: row?.preferred_name || "",
    phone: row?.phone || "",
    city: row?.city || "",
    state: row?.state || "",
    country: row?.country || "",
    short_bio: row?.short_bio || "",
    profile_photo_url: row?.profile_photo_url || row?.image || "",
    role: row?.role || "general_public",
    interests: [] as string[],
    show_name_publicly: Boolean(row?.show_name_publicly),
    allow_social_credit: row?.allow_social_credit !== false,
    allow_sdtv_contact: row?.allow_sdtv_contact !== false,
    keep_profile_private: row?.keep_profile_private !== false,
  };
}

export default function StudioUsersPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<PersonRow[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"profile" | "roles" | "privacy" | "sources">("profile");
  const [editForm, setEditForm] = useState<any>(emptyEditForm());
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
    existing.state = existing.state || incoming.state || null;
    existing.country = existing.country || incoming.country || null;
    existing.profile_photo_url = existing.profile_photo_url || incoming.profile_photo_url || incoming.photo_url || incoming.photo || incoming.picture || null;
    existing.image = existing.image || incoming.image || null;
    existing.short_bio = existing.short_bio || incoming.short_bio || incoming.bio || null;
    existing.updated_at = existing.updated_at || incoming.updated_at || incoming.created_at || null;
    existing.role = existing.role || incoming.role || sourceRole || "general_public";
    existing.public_visibility_disabled = Boolean(existing.public_visibility_disabled || incoming.public_visibility_disabled);
    existing.visibility_disabled_reason = existing.visibility_disabled_reason || incoming.visibility_disabled_reason || incoming.reason || null;
    existing.keep_profile_private = incoming.keep_profile_private ?? existing.keep_profile_private;
    existing.show_name_publicly = incoming.show_name_publicly ?? existing.show_name_publicly;
    existing.allow_social_credit = incoming.allow_social_credit ?? existing.allow_social_credit;
    existing.allow_sdtv_contact = incoming.allow_sdtv_contact ?? existing.allow_sdtv_contact;
    addUnique(existing.roles, incoming.role || sourceRole || "general_public");
    addUnique(existing.sources, source);
    map.set(key, existing);
  }

  async function safeQuery(query: any) {
    const result = await query;
    if (result.error) setActionMessage((current) => current || `Some user sources could not be loaded: ${result.error.message}.`);
    return result.error ? [] : (result.data || []);
  }

  async function loadRows() {
    setActionMessage("");
    const [profiles, admins, team, radio, volunteers, influencers, content, visibility] = await Promise.all([
      safeQuery(supabase.from("user_profiles").select("*").limit(1000)),
      safeQuery(supabase.from("admins").select("user_id,email,name,role,created_at").limit(500)),
      safeQuery(supabase.from("team_members").select("id,user_id,email,name,title,image,photo,picture,show_on_public_team,created_at").limit(1000)),
      safeQuery(supabase.from("radio_team_members").select("id,user_id,email,name,title,segment_name,image,created_at").limit(1000)),
      safeQuery(supabase.from("volunteer_onboarding_submissions").select("user_id,email,full_name,phone,city,photo_url,created_at").limit(1000)),
      safeQuery(supabase.from("influencer_profiles").select("id,user_id,email,full_name,city,bio,photo_url,status,created_at").limit(1000)),
      safeQuery(supabase.from("public_content_requests").select("submitter_user_id,submitter_email,submitter_name,submitter_phone,submitter_city,created_at").limit(1000)),
      safeQuery(supabase.from("public_visibility_controls").select("*").limit(1000)),
    ]);

    const map = new Map<string, PersonRow>();
    profiles.forEach((row: any) => mergePerson(map, row, "Profile", row.role || "general_public"));
    admins.forEach((row: any) => mergePerson(map, { ...row, full_name: row.name }, "Admin", row.role || "admin"));
    team.forEach((row: any) => mergePerson(map, row, "Team", "team_member"));
    radio.forEach((row: any) => mergePerson(map, row, "Radio", "radio"));
    volunteers.forEach((row: any) => mergePerson(map, row, "Volunteer", "volunteer"));
    influencers.forEach((row: any) => mergePerson(map, row, "Influencer", "influencer"));
    content.forEach((row: any) => mergePerson(map, { user_id: row.submitter_user_id, email: row.submitter_email, full_name: row.submitter_name, phone: row.submitter_phone, city: row.submitter_city, created_at: row.created_at }, "Content Submitter", "general_public"));

    visibility.forEach((vis: any) => {
      const key = cleanEmail(vis.email) || String(vis.user_id || "");
      const existing: PersonRow = map.get(key) || { key, email: cleanEmail(vis.email), user_id: vis.user_id, roles: ["general_public"], sources: ["Visibility"] };
      existing.public_visibility_disabled = Boolean(vis.public_visibility_disabled);
      existing.visibility_disabled_reason = vis.reason || existing.visibility_disabled_reason;
      existing.updated_at = vis.updated_at || existing.updated_at;
      addUnique(existing.sources, "Visibility");
      map.set(key, existing);
    });

    const nextRows = Array.from(map.values()).sort((a, b) => String(a.full_name || a.email || "").localeCompare(String(b.full_name || b.email || "")));
    setRows(nextRows);
    const nextSelected = selectedKey && nextRows.some((row) => row.key === selectedKey) ? selectedKey : nextRows[0]?.key || "";
    setSelectedKey(nextSelected);
    const selected = nextRows.find((row) => row.key === nextSelected) || null;
    setEditForm(emptyEditForm(selected));
  }

  async function init() {
    setLoading(true);
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

  const selected = rows.find((row) => row.key === selectedKey) || filteredRows[0] || null;
  const stats = useMemo(() => ({
    total: rows.length,
    hidden: rows.filter((row) => row.public_visibility_disabled).length,
    team: rows.filter((row) => row.roles.includes("team_member")).length,
    influencers: rows.filter((row) => row.roles.includes("influencer")).length,
    admins: rows.filter((row) => row.roles.some((item) => item.includes("admin"))).length,
  }), [rows]);

  function choose(row: PersonRow) {
    setSelectedKey(row.key);
    setEditForm(emptyEditForm(row));
    setActiveTab("profile");
  }

  function updateEdit(field: string, value: any) { setEditForm((current: any) => ({ ...current, [field]: value })); }
  function toggleInterest(item: string) { setEditForm((current: any) => ({ ...current, interests: current.interests.includes(item) ? current.interests.filter((value: string) => value !== item) : [...current.interests, item] })); }

  async function saveProfile() {
    if (!selected) return;
    if (!selected.user_id) { setActionMessage("Profile updates require a linked user_id. Visibility can still be controlled by email."); return; }
    const { error } = await supabase.from("user_profiles").upsert({
      user_id: selected.user_id,
      email: editForm.email || selected.email,
      role: editForm.role,
      full_name: editForm.full_name || null,
      preferred_name: editForm.preferred_name || null,
      phone: editForm.phone || null,
      city: editForm.city || null,
      state: editForm.state || null,
      country: editForm.country || null,
      short_bio: editForm.short_bio || null,
      profile_photo_url: editForm.profile_photo_url || null,
      interests: editForm.interests || [],
      show_name_publicly: Boolean(editForm.show_name_publicly),
      allow_social_credit: Boolean(editForm.allow_social_credit),
      allow_sdtv_contact: Boolean(editForm.allow_sdtv_contact),
      keep_profile_private: Boolean(editForm.keep_profile_private),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setActionMessage(error ? `Profile update failed: ${error.message}` : "User profile updated.");
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

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white">
    <StudioHeader />
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="font-black uppercase tracking-wide text-pink-300">People</p><h1 className="mt-2 text-4xl font-black md:text-5xl">User Control</h1><p className="mt-2 max-w-3xl text-slate-300">Unified people directory with admin profile editing, roles, source history, and global public visibility controls.</p></div>
        <button onClick={init} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button>
      </div>
      {loading && <div className="rounded-2xl bg-white/10 p-6">{message}</div>}
      {!loading && !canAccess && <div className="rounded-2xl bg-white p-8 text-slate-950">{message}</div>}
      {!loading && canAccess && <div className="space-y-5">
        {actionMessage && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <section className="rounded-[2rem] bg-white p-4 text-slate-950 shadow-xl">
            <div className="p-2"><h2 className="text-2xl font-black">People</h2><p className="text-sm text-slate-500">Search and select a user to manage.</p></div>
            <div className="mt-3 grid gap-2">
              <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search name, email, phone, city, role..." className="rounded-xl border p-3 font-bold" />
              <div className="grid grid-cols-2 gap-2"><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-xl border p-3 font-bold"><option value="all">All roles</option>{roles.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)} className="rounded-xl border p-3 font-bold"><option value="all">All visibility</option><option value="hidden">Hidden</option><option value="public_ok">Not hidden</option></select></div>
            </div>
            <div className="mt-4 max-h-[720px] space-y-3 overflow-y-auto pr-1">
              {filteredRows.map((row) => <button key={row.key} onClick={() => choose(row)} className={`w-full rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 ${selected?.key === row.key ? "border-pink-500 bg-pink-50 ring-2 ring-pink-100" : row.public_visibility_disabled ? "border-red-200 bg-red-50" : "border-slate-100 bg-white"}`}>
                <div className="flex gap-3"><div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-xl font-black text-pink-600">{row.profile_photo_url || row.image ? <img src={row.profile_photo_url || row.image || ""} alt="Profile" className="h-full w-full object-cover" /> : avatarText(row)}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="truncate text-lg font-black">{row.full_name || row.preferred_name || "Unnamed User"}</h3><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${statusClass(row)}`}>{row.public_visibility_disabled ? "Hidden" : "Visible"}</span></div><p className="truncate text-xs font-bold text-slate-500">{row.email || "No email linked"}</p><div className="mt-2 flex flex-wrap gap-1">{(row.roles.length ? row.roles : [row.role || "general_public"]).slice(0, 3).map((item) => <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{label(item)}</span>)}</div></div></div>
              </button>)}
              {filteredRows.length === 0 && <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">No users found.</div>}
            </div>
          </section>

          <section className="space-y-5">
            {!selected && <div className="rounded-[2rem] bg-white p-8 text-slate-950">Select a user to manage.</div>}
            {selected && <>
              <div className="rounded-[2rem] bg-white p-6 text-slate-950 shadow-xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex gap-4"><div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-3xl font-black text-pink-600">{selected.profile_photo_url || selected.image ? <img src={selected.profile_photo_url || selected.image || ""} alt="Profile" className="h-full w-full object-cover" /> : avatarText(selected)}</div><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Selected User</p><h2 className="text-3xl font-black">{selected.full_name || selected.preferred_name || "Unnamed User"}</h2><p className="text-sm font-bold text-slate-500">{selected.email || "No email linked"}</p><div className="mt-2 flex flex-wrap gap-2">{(selected.roles.length ? selected.roles : [selected.role || "general_public"]).map((item) => <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{label(item)}</span>)}<span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(selected)}`}>{visibilityText(selected)}</span></div></div></div><div className="flex flex-wrap gap-2">{selected.public_visibility_disabled ? <button onClick={() => setVisibilityDisabled(selected, false)} className="rounded-xl bg-green-700 px-4 py-3 text-sm font-black text-white">Restore Public Visibility</button> : <button onClick={() => setVisibilityDisabled(selected, true)} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white">Disable Public Visibility</button>}</div></div>
              </div>

              <div className="grid gap-4 md:grid-cols-5"><div className="rounded-3xl bg-white p-5 text-slate-950"><p className="text-3xl font-black">{stats.total}</p><p className="text-xs font-bold text-slate-500">Total people</p></div><div className="rounded-3xl bg-white p-5 text-slate-950"><p className="text-3xl font-black">{stats.team}</p><p className="text-xs font-bold text-slate-500">Team</p></div><div className="rounded-3xl bg-white p-5 text-slate-950"><p className="text-3xl font-black">{stats.influencers}</p><p className="text-xs font-bold text-slate-500">Influencers</p></div><div className="rounded-3xl bg-white p-5 text-slate-950"><p className="text-3xl font-black">{stats.admins}</p><p className="text-xs font-bold text-slate-500">Admins</p></div><div className="rounded-3xl bg-red-50 p-5 text-red-700"><p className="text-3xl font-black">{stats.hidden}</p><p className="text-xs font-bold">Hidden</p></div></div>

              <div className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-xl"><div className="flex flex-wrap gap-2">{(["profile", "roles", "privacy", "sources"] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-sm font-black ${activeTab === tab ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-700"}`}>{tab === "profile" ? "Profile" : tab === "roles" ? "Roles" : tab === "privacy" ? "Privacy" : "Sources"}</button>)}</div>
                {activeTab === "profile" && <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="font-bold">Full name<input value={editForm.full_name} onChange={(e) => updateEdit("full_name", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Preferred name<input value={editForm.preferred_name} onChange={(e) => updateEdit("preferred_name", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Email<input value={editForm.email} disabled className="mt-1 w-full rounded-xl border bg-slate-100 p-3 font-normal" /></label><label className="font-bold">Phone<input value={editForm.phone} onChange={(e) => updateEdit("phone", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">City<input value={editForm.city} onChange={(e) => updateEdit("city", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">State<input value={editForm.state} onChange={(e) => updateEdit("state", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold md:col-span-2">Photo URL<input value={editForm.profile_photo_url} onChange={(e) => updateEdit("profile_photo_url", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold md:col-span-2">Bio<textarea value={editForm.short_bio} onChange={(e) => updateEdit("short_bio", e.target.value)} className="mt-1 min-h-28 w-full rounded-xl border p-3 font-normal" /></label></div>}
                {activeTab === "roles" && <div className="mt-5 grid gap-4"><label className="font-bold">Base role<select value={editForm.role} onChange={(e) => updateEdit("role", e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal">{roleOptions.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label><div><p className="font-black">Detected roles</p><div className="mt-2 flex flex-wrap gap-2">{(selected.roles.length ? selected.roles : [selected.role || "general_public"]).map((item) => <span key={item} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">{label(item)}</span>)}</div></div><div><p className="font-black">Interests</p><div className="mt-2 flex flex-wrap gap-2">{interestOptions.map((item) => <button key={item} type="button" onClick={() => toggleInterest(item)} className={`rounded-xl px-3 py-2 text-sm font-black ${editForm.interests.includes(item) ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-700"}`}>{item}</button>)}</div></div></div>}
                {activeTab === "privacy" && <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4"><label><input type="checkbox" checked={Boolean(editForm.show_name_publicly)} onChange={(e) => updateEdit("show_name_publicly", e.target.checked)} /> Show name publicly when content is published</label><label><input type="checkbox" checked={Boolean(editForm.allow_social_credit)} onChange={(e) => updateEdit("allow_social_credit", e.target.checked)} /> Allow SDTV social credit</label><label><input type="checkbox" checked={Boolean(editForm.allow_sdtv_contact)} onChange={(e) => updateEdit("allow_sdtv_contact", e.target.checked)} /> Allow SDTV contact</label><label><input type="checkbox" checked={Boolean(editForm.keep_profile_private)} onChange={(e) => updateEdit("keep_profile_private", e.target.checked)} /> Keep profile private by default</label>{selected.visibility_disabled_reason && <div className="rounded-2xl bg-red-100 p-3 font-bold text-red-800">Visibility disabled reason: {selected.visibility_disabled_reason}</div>}</div>}
                {activeTab === "sources" && <div className="mt-5 grid gap-4"><div><p className="font-black">Detected sources</p><div className="mt-2 flex flex-wrap gap-2">{selected.sources.map((source) => <span key={source} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">{source}</span>)}</div></div><div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3"><p><b>User ID:</b> {selected.user_id || "Not linked"}</p><p><b>Phone:</b> {selected.phone || "—"}</p><p><b>Updated:</b> {selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : "—"}</p></div>{selected.short_bio && <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{selected.short_bio}</p>}</div>}
                <button onClick={saveProfile} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Save User Profile</button>
              </div>
            </>}
          </section>
        </div>
      </div>}
    </section>
  </main>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import IdBadgeTools, { type IdBadgeOptions } from "../../components/IdBadgeTools";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
function label(value?: string | null) { return String(value || "general_public").replaceAll("_", " "); }
function norm(value?: string | null) { return String(value || "").trim().toLowerCase(); }
function today() { return new Date().toISOString().slice(0, 10); }
function defaultOptions(profile?: any): IdBadgeOptions {
  return {
    topHeader: "Seattle Desi TV",
    subHeader: "OFFICIAL SDTV ID BADGE",
    highlightLabel: String(profile?.role || "TEAM MEMBER").replaceAll("_", " ").toUpperCase(),
    roleLabelText: "Role:",
    roleValue: "Team Member",
    issuedLabel: "Issued:",
    issueDate: today(),
    website: "www.seattledesitv.com",
    showSocialIcons: true,
  };
}

export default function StudioIdBadgesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [badgeOptions, setBadgeOptions] = useState<IdBadgeOptions>(defaultOptions());
  const canAccess = Boolean(user && isAdminRole(role));
  const selected = profiles.find((p) => p.user_id === selectedId || p.email === selectedId) || null;

  const filtered = useMemo(() => {
    const q = norm(searchText);
    if (!q) return profiles;
    return profiles.filter((p) => norm(`${p.full_name || ""} ${p.email || ""} ${p.role || ""}`).includes(q));
  }, [profiles, searchText]);

  async function loadProfiles() {
    const { data, error } = await supabase.from("user_profiles").select("user_id,email,full_name,role,profile_photo_url,id_badge_url,updated_at,created_at").order("updated_at", { ascending: false, nullsFirst: false }).limit(1000);
    if (error) { setMessage(`Could not load profiles: ${error.message}`); return; }
    setProfiles(data || []);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage ID badges."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("Admin access required."); setLoading(false); return; }
    await loadProfiles();
    setMessage("");
    setLoading(false);
  }

  function selectProfile(profile: any) {
    const key = profile.user_id || profile.email;
    setSelectedId(key);
    setBadgeOptions(defaultOptions(profile));
    setMessage("");
  }

  function updateOption(key: keyof IdBadgeOptions, value: string | boolean) {
    setBadgeOptions((current) => ({ ...current, [key]: value }));
  }

  async function saveBadge(profile: any, badgeUrl: string) {
    if (!profile?.user_id && !profile?.email) return;
    setSaving(true);
    const { error } = await supabase.from("user_profiles").upsert({
      user_id: profile.user_id || null,
      email: profile.email || null,
      full_name: profile.full_name || null,
      role: profile.role || "general_public",
      profile_photo_url: profile.profile_photo_url || null,
      id_badge_url: badgeUrl || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: profile.user_id ? "user_id" : "email" });
    setSaving(false);
    if (error) { setMessage(`Could not save ID badge: ${error.message}`); return; }
    setMessage("ID badge saved.");
    setProfiles((items) => items.map((item) => (item.user_id === profile.user_id || item.email === profile.email) ? { ...item, id_badge_url: badgeUrl } : item));
  }

  useEffect(() => { init(); }, []);

  const fieldClass = "mt-1 w-full rounded-xl border p-3 font-normal";

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="mx-auto max-w-7xl px-6 py-10">
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><a href="/studio" className="font-black text-pink-300">← Back to Studio</a><h1 className="mt-3 text-4xl font-black md:text-5xl">SDTV ID Badges</h1><p className="mt-2 text-slate-300">Generate and save official badge images with editable badge text.</p>{user?.email && <p className="mt-1 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}</div><button onClick={init} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button></div>
    {loading && <div className="rounded-3xl bg-white/10 p-6">{message}</div>}
    {!loading && !canAccess && <div className="rounded-3xl bg-white p-8 text-slate-950">{message}</div>}
    {!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {message && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900 lg:col-span-2">{message}</div>}
      <aside className="rounded-3xl bg-white p-5 text-slate-950"><h2 className="text-2xl font-black">Profiles</h2><input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search name, email, role..." className="mt-4 w-full rounded-xl border p-3 font-bold" /><div className="mt-4 grid max-h-[720px] gap-3 overflow-y-auto pr-1">{filtered.map((profile) => { const key = profile.user_id || profile.email; return <button key={key} onClick={() => selectProfile(profile)} className={`rounded-2xl border p-4 text-left ${selectedId === key ? "border-pink-500 bg-pink-50" : "bg-white"}`}><p className="font-black">{profile.full_name || profile.email || "Unnamed"}</p><p className="truncate text-xs font-bold text-slate-500">{profile.email || "No email"}</p><p className="mt-1 text-xs font-black text-pink-700">{label(profile.role)}</p>{profile.id_badge_url && <p className="mt-1 text-xs font-bold text-green-700">Badge generated</p>}</button>; })}{filtered.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No matching profiles.</p>}</div></aside>
      <section className="space-y-6 text-slate-950">{!selected && <div className="rounded-3xl bg-white p-8 font-bold text-slate-500">Select a profile to generate an ID badge.</div>}{selected && <>
        <div className="rounded-3xl bg-white p-6"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Selected Profile</p><h2 className="text-3xl font-black">{selected.full_name || selected.email}</h2><p className="text-sm font-bold text-slate-500">{selected.email}</p><p className="mt-2 inline-block rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-700">{label(selected.role)}</p></div><div className="h-28 w-28 overflow-hidden rounded-2xl bg-slate-100">{selected.profile_photo_url ? <img src={selected.profile_photo_url} alt="profile" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-4xl font-black text-pink-600">{String(selected.full_name || selected.email || "S").slice(0,1).toUpperCase()}</div>}</div></div></div>

        <div className="rounded-3xl bg-white p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Customize Badge Text</p><h3 className="mt-1 text-2xl font-black">Edit what appears on the image</h3><p className="mt-1 text-sm text-slate-500">These changes affect the generated badge only and do not change the member profile.</p></div><button type="button" onClick={() => setBadgeOptions(defaultOptions(selected))} className="rounded-xl border px-4 py-2 text-sm font-black">Reset</button></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-black">Top Header<input value={badgeOptions.topHeader || ""} onChange={(e) => updateOption("topHeader", e.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-black">Sub Header<input value={badgeOptions.subHeader || ""} onChange={(e) => updateOption("subHeader", e.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-black">Highlight Label<input value={badgeOptions.highlightLabel || ""} onChange={(e) => updateOption("highlightLabel", e.target.value)} placeholder="VOLUNTEER, CREW, MEDIA..." className={fieldClass} /></label>
            <label className="text-sm font-black">Role Value<input value={badgeOptions.roleValue || ""} onChange={(e) => updateOption("roleValue", e.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-black">Role Label<input value={badgeOptions.roleLabelText || ""} onChange={(e) => updateOption("roleLabelText", e.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-black">Issued Label<input value={badgeOptions.issuedLabel || ""} onChange={(e) => updateOption("issuedLabel", e.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-black">Issue Date<input type="date" value={badgeOptions.issueDate || ""} onChange={(e) => updateOption("issueDate", e.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-black">Website<input value={badgeOptions.website || ""} onChange={(e) => updateOption("website", e.target.value)} className={fieldClass} /></label>
          </div>
          <label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black"><input type="checkbox" checked={badgeOptions.showSocialIcons !== false} onChange={(e) => updateOption("showSocialIcons", e.target.checked)} className="h-5 w-5 accent-pink-600" />Show YouTube, Instagram and Facebook icons</label>
          <IdBadgeTools fullName={selected.full_name} roleLabel={selected.role} email={selected.email} profilePhotoUrl={selected.profile_photo_url} idBadgeUrl={selected.id_badge_url} options={badgeOptions} onGenerated={(url) => saveBadge(selected, url)} />
        </div>

        <div className="rounded-3xl bg-white p-6"><h3 className="text-xl font-black">Badge Preview</h3><p className="mt-1 text-sm text-slate-500">Generate the badge again after changing any text to refresh this image.</p>{selected.id_badge_url ? <img src={selected.id_badge_url} alt="SDTV ID badge" className="mt-4 w-full rounded-2xl border bg-slate-50 object-contain" /> : <div className="mt-4 grid min-h-72 place-items-center rounded-2xl bg-slate-50 font-bold text-slate-500">No badge yet.</div>}<button disabled={saving || !selected.id_badge_url} onClick={() => saveBadge(selected, selected.id_badge_url)} className="mt-5 rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Badge URL"}</button></div>
      </>}</section>
    </div>}
  </section></main>;
}

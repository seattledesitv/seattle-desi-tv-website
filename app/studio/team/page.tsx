"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import StudioHeader from "../../components/StudioHeader";
import { firstError, requireText, validateImageFile, validateOptionalUrl } from "../../lib/validation";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", { auth: { storageKey: "sdtv-auth-token-v2", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

type Member = { id: string; name: string; title: string; image: string; user_id?: string | null; email?: string | null; show_on_public_team?: boolean | null; created_at?: string | null; updated_at?: string | null; user_role?: string; profile_photo_url?: string; profile_created_at?: string | null };
type Approved = { user_id: string | null; email: string; role: string; full_name?: string | null; photo_url?: string | null; profile_created_at?: string | null; already_linked?: boolean };

function hasAdmin(role?: string | null) { return String(role || "").toLowerCase().includes("admin"); }
function canTeam(role?: string | null) { const v = String(role || "").toLowerCase(); return v.includes("admin") || v.includes("team_member") || v.includes("team member"); }
function label(v?: string | null) { return v ? v.replaceAll("_", " ") : "Not connected"; }
function clean(v?: string | null) { return String(v || "").trim().toLowerCase(); }
function slug(v?: string | null) { return String(v || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function date(v?: string | null) { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleString(); }
function sid(v?: string | null) { return v ? (v.length > 12 ? `${v.slice(0, 8)}…${v.slice(-4)}` : v) : "—"; }
function emptyForm() { return { name: "", title: "", image: "", show_on_public_team: true }; }
function Thumb({ src, text }: { src?: string | null; text: string }) { return src ? <img src={src} alt={text} className="h-24 w-24 rounded-xl border bg-gray-100 object-cover" /> : <div className="grid h-24 w-24 place-items-center rounded-xl bg-pink-50 px-2 text-center text-xs font-black text-pink-600">No image</div>; }

export default function StudioTeamPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [notice, setNotice] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [approved, setApproved] = useState<Approved[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [linkEmail, setLinkEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canAccess = Boolean(user && hasAdmin(role));
  const selectedUser = approved.find((x) => clean(x.email) === clean(linkEmail)) || null;
  const editingMember = members.find((x) => x.id === editingId) || null;
  const connectedMembers = useMemo(() => members.filter((x) => Boolean(x.user_id || x.email)), [members]);
  const orphanMembers = useMemo(() => members.filter((x) => !x.user_id && !x.email), [members]);
  const readyUsers = useMemo(() => approved.filter((x) => !x.already_linked), [approved]);

  function alreadyHasTeamRow(item: any, rows: Member[]) {
    const itemEmail = clean(item.email);
    const itemId = String(item.user_id || "");
    const itemName = slug(item.full_name || item.email?.split("@")[0] || "");
    return rows.some((m) => (itemEmail && clean(m.email) === itemEmail) || (itemId && m.user_id === itemId) || (itemName && slug(m.name) === itemName));
  }

  async function enrich(rows: Member[]) {
    const emails = Array.from(new Set(rows.map((r) => clean(r.email)).filter(Boolean)));
    const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
    const roleByEmail: Record<string, string> = {}, roleById: Record<string, string> = {}, profileByEmail: Record<string, any> = {}, profileById: Record<string, any> = {};
    if (emails.length || ids.length) {
      const filter = [...emails.map((e) => `email.eq.${e}`), ...ids.map((id) => `user_id.eq.${id}`)].join(",");
      const a = await supabase.from("admins").select("user_id,email,role").or(filter);
      (a.data || []).forEach((x: any) => { if (x.email) roleByEmail[clean(x.email)] = x.role; if (x.user_id) roleById[x.user_id] = x.role; });
      const p = await supabase.from("volunteer_onboarding_submissions").select("user_id,email,photo_url,created_at").or(filter).order("created_at", { ascending: false });
      (p.data || []).forEach((x: any) => { if (x.email && !profileByEmail[clean(x.email)]) profileByEmail[clean(x.email)] = x; if (x.user_id && !profileById[x.user_id]) profileById[x.user_id] = x; });
    }
    return rows.map((m) => { const p = profileById[m.user_id || ""] || profileByEmail[clean(m.email)] || {}; return { ...m, user_role: roleById[m.user_id || ""] || roleByEmail[clean(m.email)] || "", profile_photo_url: p.photo_url || m.image || "", profile_created_at: p.created_at || null }; });
  }

  async function loadData() {
    const team = await supabase.from("team_members").select("id,name,title,image,user_id,email,show_on_public_team,created_at,updated_at").order("created_at", { ascending: false });
    if (team.error) { setNotice(`Could not load team members: ${team.error.message}`); return; }
    const teamRows = await enrich(team.data || []);
    setMembers(teamRows);
    const admins = await supabase.from("admins").select("user_id,email,role,created_at").order("created_at", { ascending: false });
    if (admins.error) { setNotice(`Could not load approved users: ${admins.error.message}`); return; }
    const adminRows = (admins.data || []).filter((x: any) => x.email && canTeam(x.role)).map((x: any) => ({ ...x, email: clean(x.email) }));
    const emails = Array.from(new Set(adminRows.map((x: any) => x.email).filter(Boolean)));
    const ids = Array.from(new Set(adminRows.map((x: any) => x.user_id).filter(Boolean))) as string[];
    const byEmail: Record<string, any> = {}, byId: Record<string, any> = {};
    if (emails.length || ids.length) {
      const filter = [...emails.map((e) => `email.eq.${e}`), ...ids.map((id) => `user_id.eq.${id}`)].join(",");
      const p = await supabase.from("volunteer_onboarding_submissions").select("user_id,email,full_name,photo_url,created_at").or(filter).order("created_at", { ascending: false });
      (p.data || []).forEach((x: any) => { if (x.email && !byEmail[clean(x.email)]) byEmail[clean(x.email)] = x; if (x.user_id && !byId[x.user_id]) byId[x.user_id] = x; });
    }
    const seen = new Set<string>();
    setApproved(adminRows.filter((x: any) => { const key = x.email || x.user_id; if (!key || seen.has(key)) return false; seen.add(key); return true; }).map((x: any) => { const p = byId[x.user_id || ""] || byEmail[x.email] || {}; const row = { user_id: x.user_id || p.user_id || null, email: x.email, role: x.role || "team_member", full_name: p.full_name || x.email?.split("@")[0] || null, photo_url: p.photo_url || null, profile_created_at: p.created_at || null }; return { ...row, already_linked: alreadyHasTeamRow(row, teamRows) }; }));
  }

  async function init() {
    setLoading(true); setNotice("");
    const session = await supabase.auth.getSession();
    const currentUser = session.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access Studio Team."); setLoading(false); return; }
    const admin = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    const nextRole = admin.data?.role || "";
    setRole(nextRole);
    if (!hasAdmin(nextRole)) { setMessage("You are logged in, but this account does not have admin access."); setLoading(false); return; }
    await loadData(); setMessage(""); setLoading(false);
  }

  function startEdit(member: Member) { setEditingId(member.id); setForm({ name: member.name || "", title: member.title || "", image: member.image || "", show_on_public_team: member.show_on_public_team !== false }); setLinkEmail(member.email || ""); setNotice(`Editing ${member.name}`); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function startFromApproved(item: Approved) { setEditingId(null); setLinkEmail(item.email); setForm({ name: item.full_name || item.email, title: "Team Member", image: item.photo_url || "", show_on_public_team: true }); setNotice(`Publishing ${item.full_name || item.email} to Team page`); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function resetForm() { setEditingId(null); setForm(emptyForm()); setLinkEmail(""); setNotice(""); }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const validation = validateImageFile(file, "Team image", 5);
    if (!validation.ok) { setNotice(validation.message || "Please upload a valid image file."); event.target.value = ""; return; }
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) { setNotice("Cloudinary is not configured. Image URL still works."); event.target.value = ""; return; }
    setUploading(true); setNotice("Uploading image...");
    try { const body = new FormData(); body.append("file", file); body.append("upload_preset", CLOUDINARY_UPLOAD_PRESET); body.append("folder", "seattle-desi-tv/team"); const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body }); const out = await res.json(); if (!res.ok || !out.secure_url) throw new Error(out.error?.message || "Cloudinary upload failed."); setForm((c) => ({ ...c, image: out.secure_url })); setNotice("Image uploaded. Save changes to keep it."); } catch (e: any) { setNotice(`Image upload failed: ${e?.message || String(e)}`); } finally { setUploading(false); event.target.value = ""; }
  }

  async function saveMember() {
    const validationError = firstError(requireText(form.name, "Name", 2), validateOptionalUrl(form.image, "Team image URL"));
    if (validationError) { setNotice(validationError); return; }
    const payload: any = { name: form.name.trim(), title: form.title.trim(), image: form.image.trim(), show_on_public_team: form.show_on_public_team, updated_at: new Date().toISOString() };
    if (selectedUser) { if (!selectedUser.user_id) { setNotice("Selected user is missing user_id. Re-approve Team Access and try again."); return; } payload.user_id = selectedUser.user_id; payload.email = selectedUser.email; }
    setSaving(true); setNotice(editingId ? "Updating team member..." : "Publishing team member...");
    const result = editingId ? await supabase.from("team_members").update(payload).eq("id", editingId) : await supabase.from("team_members").insert({ ...payload, created_by: user?.id || null });
    if (result.error) { setNotice(`Save failed: ${result.error.message}`); setSaving(false); return; }
    setNotice(editingId ? "Team member updated." : "Team member published to Team page."); resetForm(); await loadData(); setSaving(false);
  }

  async function toggleVisibility(member: Member) { const nextVisible = member.show_on_public_team === false; const { error } = await supabase.from("team_members").update({ show_on_public_team: nextVisible, updated_at: new Date().toISOString() }).eq("id", member.id); if (error) setNotice(`Visibility update failed: ${error.message}`); else { setNotice(nextVisible ? "Team member is now visible publicly." : "Team member is now hidden publicly."); await loadData(); } }
  async function removeMember(member: Member) { const ok = window.confirm(`Remove team member: ${member.name}? This only removes the public Team page row. It does not remove login or role.`); if (!ok) return; const { error } = await supabase.from("team_members").delete().eq("id", member.id); if (error) setNotice(`Remove failed: ${error.message}`); else { setNotice("Team member removed from public Team page."); await loadData(); } }
  async function logout() { await supabase.auth.signOut({ scope: "global" }); window.location.href = "/login"; }
  useEffect(() => { init(); }, []);

  function MemberCard({ member, orphan = false }: { member: Member; orphan?: boolean }) { return <article className={`flex gap-4 rounded-xl border p-4 ${orphan ? "border-yellow-200 bg-yellow-50" : ""}`}><Thumb src={member.profile_photo_url || member.image} text={member.name} /><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><h3 className="truncate text-lg font-black">{member.name}</h3><p className="text-sm text-gray-600">{member.title || "No title"}</p></div><span className={`h-fit rounded-full px-2 py-1 text-xs font-black ${orphan ? "bg-yellow-100 text-yellow-800" : member.user_role ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>{orphan ? "Orphan" : label(member.user_role)}</span></div><div className="mt-3 grid gap-1 break-words text-xs text-gray-600"><p><b>Email:</b> {member.email || "Not linked"}</p><p><b>User ID:</b> {sid(member.user_id)}</p><p><b>Team row created:</b> {date(member.created_at)}</p><p><b>User profile created:</b> {date(member.profile_created_at)}</p><p><b>Public Team:</b> {member.show_on_public_team === false ? "Hidden" : "Visible"}</p></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => startEdit(member)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Edit / Link</button><button onClick={() => toggleVisibility(member)} className="rounded-lg border border-slate-400 px-3 py-2 text-sm font-bold text-slate-700">{member.show_on_public_team === false ? "Show Publicly" : "Hide Publicly"}</button><button onClick={() => removeMember(member)} className="rounded-lg border border-red-600 px-3 py-2 text-sm font-bold text-red-600">Remove from Team Page</button></div></div></article>; }

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h1 className="mt-3 text-4xl font-black md:text-5xl">Team Management</h1><p className="mt-2 text-slate-300">{user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Studio team"}</p></div><div className="flex flex-wrap gap-3"><button onClick={init} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950">Refresh</button>{user && <button onClick={logout} className="rounded-xl border border-red-400 px-5 py-3 font-bold text-red-300">Logout</button>}</div></div>{loading && <div className="rounded-2xl border border-white/10 bg-white/10 p-6">{message}</div>}{!loading && !canAccess && <div className="max-w-xl rounded-2xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Access Required</h2><p className="mt-3 text-gray-600">{message}</p><a href="/login" className="mt-5 inline-block rounded-xl bg-pink-600 px-5 py-3 font-bold text-white">Go to Login</a></div>}{!loading && canAccess && <div className="space-y-8">{notice && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{notice}</div>}<section className="rounded-2xl bg-white p-6 text-slate-950"><h2 className="mb-4 text-2xl font-black">{editingId ? "Edit Team Member" : "Add / Publish Team Member"}</h2>{!editingMember?.user_id && <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4"><p className="font-black text-yellow-900">Connect this Team record to an approved user</p><p className="mt-1 text-xs text-yellow-800">Use this to link orphan/manual team profiles to the correct approved account.</p><select className="mt-3 w-full rounded-xl border bg-white p-3" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)}><option value="">Manual team profile / no user link</option>{approved.map((x) => <option key={`${x.email}-${x.user_id || "no-id"}`} value={x.email}>{x.full_name ? `${x.full_name} · ` : ""}{x.email} · {label(x.role)}{x.already_linked ? " · already has team row" : ""}</option>)}</select>{selectedUser && <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-3 text-xs text-gray-700"><Thumb src={selectedUser.photo_url} text={selectedUser.full_name || selectedUser.email} /><div><p><b>Selected:</b> {selectedUser.full_name || selectedUser.email}</p><p><b>Email:</b> {selectedUser.email}</p><p><b>User ID:</b> {sid(selectedUser.user_id)}</p><p><b>Role:</b> {label(selectedUser.role)}</p><p><b>Onboarding profile:</b> {date(selectedUser.profile_created_at)}</p></div></div>}</div>}<div className="grid gap-4 md:grid-cols-[1fr_1fr_1.4fr]"><label className="grid gap-2 text-sm font-bold">Name<input className="rounded-lg border p-3 font-normal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Team member name" /></label><label className="grid gap-2 text-sm font-bold">Title / Role Display<input className="rounded-lg border p-3 font-normal" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Founder, Host, Volunteer..." /></label><div className="grid gap-2 text-sm font-bold">Team Page / ID Image<input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} className="rounded-lg border p-3 font-normal" /><input className="rounded-lg border p-3 font-normal" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Or paste image URL" />{form.image && <img src={form.image} alt="Preview" className="h-24 w-24 rounded-xl border object-cover" />}</div></div><label className="mt-4 flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={form.show_on_public_team} onChange={(e) => setForm({ ...form, show_on_public_team: e.target.checked })} /> Show on public Team page</label><div className="mt-5 flex flex-wrap gap-3"><button onClick={saveMember} disabled={saving || uploading} className="rounded-xl bg-pink-600 px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? "Saving..." : editingId ? "Update Member" : "Publish Member"}</button>{editingId && <button onClick={resetForm} className="rounded-xl border border-gray-400 px-5 py-3 font-bold text-gray-700">Cancel Edit</button>}</div></section>{readyUsers.length > 0 && <section className="rounded-2xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Ready to Publish</h2><p className="mt-2 text-gray-600">Approved team members/admins who do not have any Team page record yet.</p><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{readyUsers.map((x) => <article key={x.email} className="flex items-center gap-4 rounded-xl border p-4"><Thumb src={x.photo_url} text={x.full_name || x.email} /><div className="min-w-0 flex-1"><h3 className="truncate font-black">{x.full_name || x.email}</h3><p className="break-words text-xs text-gray-600">{x.email}</p><p className="text-xs text-gray-600">{label(x.role)}</p><button onClick={() => startFromApproved(x)} className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Publish to Team Page</button></div></article>)}</div></section>}<section className="rounded-2xl bg-white p-6 text-slate-950"><div className="mb-4"><h2 className="text-2xl font-black">Team Members</h2><p className="text-sm text-gray-500">Connected public Team page rows. Total: {connectedMembers.length}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{connectedMembers.map((m) => <MemberCard key={m.id} member={m} />)}{connectedMembers.length === 0 && <p className="text-gray-500">No connected team members found.</p>}</div></section>{orphanMembers.length > 0 && <section className="rounded-2xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Orphan Team Records</h2><p className="mt-2 text-gray-600">These Team page rows exist but are not connected to a user/email. Link them to an approved user or remove duplicates.</p><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{orphanMembers.map((m) => <MemberCard key={m.id} member={m} orphan />)}</div></section>}</div>}</div></main>;
}

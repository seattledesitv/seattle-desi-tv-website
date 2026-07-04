"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const defaults = [
  { section_key: "super_admin", title: "Super Admins", subtitle: "Leadership and platform oversight.", display_order: 1, enabled: true },
  { section_key: "pm_admin", title: "PM Admins", subtitle: "Program and project management leadership.", display_order: 2, enabled: true },
  { section_key: "admin", title: "Admins", subtitle: "Studio operations and administrative support.", display_order: 3, enabled: true },
  { section_key: "team_member", title: "Team Members", subtitle: "Community builders, creators, hosts, volunteers, and media team members.", display_order: 4, enabled: true },
  { section_key: "new_team_members", title: "New Team Members", subtitle: "Welcoming the newest members of the SDTV family.", display_order: 5, enabled: true },
];
const defaultText: any = { eyebrow: "Seattle Desi TV", title: "Meet Our Team", subtitle: "The community builders, creators, hosts, volunteers, and media team powering Seattle Desi TV.", spotlightTitle: "Team Spotlight", weeklyTitle: "Event Coverage Last Week" };
function makeKey(v: string) { return v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `section_${Date.now()}`; }

export default function Page() {
  const [user, setUser] = useState<any>(null), [role, setRole] = useState(""), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading...");
  const [members, setMembers] = useState<any[]>([]), [sections, setSections] = useState<any[]>(defaults), [choices, setChoices] = useState<any>({}), [text, setText] = useState<any>(defaultText);
  const [newTitle, setNewTitle] = useState("");
  const canAccess = Boolean(user && isAdminRole(role));

  async function load() {
    setLoading(true); setMessage("Loading...");
    const auth = await supabase.auth.getUser(); const current = auth.data?.user || null; setUser(current);
    const nextRole = current ? await resolveUserRole(supabase, current) : ""; setRole(nextRole);
    if (!current || !isAdminRole(nextRole)) { setMessage("Studio admin access required."); setLoading(false); return; }
    const team = await supabase.from("team_members").select("id,name,title,email,show_on_public_team").eq("show_on_public_team", true).order("created_at", { ascending: true });
    setMembers(team.data || []);
    const sec = await supabase.from("team_page_sections").select("section_key,title,subtitle,display_order,enabled").order("display_order", { ascending: true });
    const pos = await supabase.from("team_page_member_assignments").select("member_id,section_key,display_order");
    const settings = await supabase.from("team_page_settings").select("key,value");
    if (sec.error || pos.error || settings.error) { setMessage("Create tables team_page_settings, team_page_sections and team_page_member_assignments in Supabase first."); setLoading(false); return; }
    if (sec.data?.length) setSections(sec.data);
    const c: any = {}; (pos.data || []).forEach((r: any) => c[r.member_id] = r.section_key); setChoices(c);
    const t: any = { ...defaultText }; (settings.data || []).forEach((r: any) => t[r.key] = r.value || t[r.key]); setText(t);
    setMessage(""); setLoading(false);
  }
  async function seed() { setSaving(true); await supabase.from("team_page_sections").upsert(defaults, { onConflict: "section_key" }); await Promise.all(Object.keys(defaultText).map((key) => supabase.from("team_page_settings").upsert({ key, value: defaultText[key] }, { onConflict: "key" }))); setSaving(false); load(); }
  async function saveText() { setSaving(true); await Promise.all(Object.keys(text).map((key) => supabase.from("team_page_settings").upsert({ key, value: text[key] }, { onConflict: "key" }))); setMessage("Text saved."); setSaving(false); }
  async function saveSection(s: any) { setSaving(true); await supabase.from("team_page_sections").upsert(s, { onConflict: "section_key" }); setMessage("Section saved."); setSaving(false); load(); }
  async function addSection() { if (!newTitle.trim()) return; await saveSection({ section_key: makeKey(newTitle), title: newTitle, subtitle: "", display_order: sections.length + 1, enabled: true }); setNewTitle(""); }
  async function moveMember(id: string, key: string) { if (!key) return; setChoices((c: any) => ({ ...c, [id]: key })); await supabase.from("team_page_member_assignments").upsert({ member_id: id, section_key: key, display_order: 100 }, { onConflict: "member_id,section_key" }); setMessage("Member moved."); }
  useEffect(() => { load(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 flex items-start justify-between gap-4"><div><p className="text-pink-300 text-sm font-black uppercase tracking-[0.25em]">Studio</p><h1 className="mt-2 text-4xl font-black">Team Page Management</h1><p className="mt-3 text-slate-300">Edit team page text, create sections, and move members into the right section.</p></div><a href="/team" target="_blank" className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">View Team Page</a></div>{loading && <div className="rounded-2xl bg-white/10 p-6 font-bold">{message}</div>}{!loading && !canAccess && <div className="rounded-2xl bg-white p-8 font-bold text-slate-950">{message}</div>}{!loading && canAccess && <div className="grid gap-6 lg:grid-cols-2"><section className="space-y-6"><div className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Page Text</h2>{Object.keys(defaultText).map((key) => <label key={key} className="mt-3 grid gap-1 font-black capitalize"><span>{key}</span><textarea value={text[key] || ""} onChange={(e) => setText({ ...text, [key]: e.target.value })} rows={key === "subtitle" ? 3 : 1} className="rounded-xl border p-3 font-normal" /></label>)}<button onClick={saveText} disabled={saving} className="mt-4 rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Save Text</button></div><div className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Sections</h2><div className="mt-4 flex gap-2"><input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New section title" className="min-w-0 flex-1 rounded-xl border p-3" /><button onClick={addSection} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Add</button></div><div className="mt-4 space-y-3">{sections.map((s) => <div key={s.section_key} className="rounded-2xl border bg-slate-50 p-4"><input value={s.title} onChange={(e) => setSections(sections.map((x) => x.section_key === s.section_key ? { ...x, title: e.target.value } : x))} className="w-full rounded-xl border p-3 font-black" /><textarea value={s.subtitle || ""} onChange={(e) => setSections(sections.map((x) => x.section_key === s.section_key ? { ...x, subtitle: e.target.value } : x))} className="mt-2 w-full rounded-xl border p-3" /><div className="mt-2 flex items-center justify-between"><label className="font-bold"><input type="checkbox" checked={s.enabled} onChange={(e) => setSections(sections.map((x) => x.section_key === s.section_key ? { ...x, enabled: e.target.checked } : x))} /> Enabled</label><button onClick={() => saveSection(s)} className="rounded-xl bg-pink-600 px-4 py-2 font-black text-white">Save</button></div></div>)}</div><button onClick={seed} className="mt-4 rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Seed Defaults</button></div></section><section className="space-y-6"><div className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Move Members</h2><div className="mt-4 space-y-3">{members.map((m) => <div key={m.id} className="grid gap-3 rounded-2xl border bg-slate-50 p-4 md:grid-cols-[1fr_220px]"><div><p className="font-black">{m.name}</p><p className="text-sm font-bold text-pink-600">{m.title}</p></div><select value={choices[m.id] || ""} onChange={(e) => moveMember(m.id, e.target.value)} className="rounded-xl border p-3 font-bold"><option value="">Auto group</option>{sections.filter((s) => s.enabled).map((s) => <option key={s.section_key} value={s.section_key}>{s.title}</option>)}</select></div>)}</div></div>{message && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}</section></div>}</div></main>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
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
const defaultText: any = { eyebrow: "Seattle Desi TV", title: "Meet Our Team", subtitle: "The community builders, creators, hosts, volunteers, and media team powering Seattle Desi TV.", spotlightTitle: "Team Spotlight", weeklyTitle: "Event Coverage Last Week", teamOrderMode: "score" };
function makeKey(v: string) { return v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `section_${Date.now()}`; }

export default function Page() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading...");
  const [members, setMembers] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>(defaults);
  const [choices, setChoices] = useState<any>({});
  const [orders, setOrders] = useState<any>({});
  const [text, setText] = useState<any>(defaultText);
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const canAccess = Boolean(user && isAdminRole(role));

  const visibleSections = useMemo(() => sections.filter((s) => s.enabled !== false).sort((a, b) => Number(a.display_order || 100) - Number(b.display_order || 100)), [sections]);
  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter((member) => {
      const assigned = choices[member.id] || "auto";
      const matchesGroup = groupFilter === "all" || groupFilter === assigned;
      const textBlob = `${member.name || ""} ${member.title || ""} ${member.email || ""}`.toLowerCase();
      return matchesGroup && (!term || textBlob.includes(term));
    });
  }, [members, choices, search, groupFilter]);

  async function callSave(body: any, success: string) {
    setSaving(true); setMessage("Saving...");
    try {
      const session = await supabase.auth.getSession();
      const token = session.data?.session?.access_token || "";
      const response = await fetch("/api/studio/team-page-save", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" }, body: JSON.stringify(body) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.error) throw new Error(json.error || "Save failed.");
      setMessage(json.message || success); return true;
    } catch (error: any) { setMessage(`Could not save: ${error?.message || "Save failed."}`); return false; }
    finally { setSaving(false); }
  }

  async function load() {
    setLoading(true); setMessage("Loading...");
    const auth = await supabase.auth.getUser(); const current = auth.data?.user || null; setUser(current);
    const nextRole = current ? await resolveUserRole(supabase, current) : ""; setRole(nextRole);
    if (!current || !isAdminRole(nextRole)) { setMessage("Studio admin access required."); setLoading(false); return; }
    const team = await supabase.from("team_members").select("id,name,title,email,show_on_public_team").eq("show_on_public_team", true).order("created_at", { ascending: true });
    if (team.error) { setMessage(team.error.message); setLoading(false); return; }
    setMembers(team.data || []);
    const sec = await supabase.from("team_page_sections").select("section_key,title,subtitle,display_order,enabled").order("display_order", { ascending: true });
    const pos = await supabase.from("team_page_member_assignments").select("member_id,section_key,display_order");
    const settings = await supabase.from("team_page_settings").select("key,value");
    if (sec.error || pos.error || settings.error) { setMessage("Team page tables are not ready yet in Supabase."); setLoading(false); return; }
    setSections(sec.data?.length ? sec.data : defaults);
    const nextChoices: any = {}; const nextOrders: any = {};
    (pos.data || []).forEach((row: any) => { nextChoices[row.member_id] = row.section_key; nextOrders[row.member_id] = row.display_order ?? 100; });
    setChoices(nextChoices); setOrders(nextOrders);
    const nextText: any = { ...defaultText };
    (settings.data || []).forEach((row: any) => { nextText[row.key] = row.value || nextText[row.key]; });
    setText(nextText); setMessage(""); setLoading(false);
  }

  async function seed() { const ok = await callSave({ action: "seedDefaults", sections: defaults, text: defaultText }, "Default sections and text saved."); if (ok) load(); }
  async function saveText() { await callSave({ action: "text", text }, "Text saved."); }
  async function saveSection(section: any) { const ok = await callSave({ action: "section", section: { ...section, display_order: Number(section.display_order || 100) } }, "Section saved."); if (ok) load(); }
  async function addSection() { const title = newTitle.trim(); if (!title) return; const ok = await callSave({ action: "section", section: { section_key: makeKey(title), title, subtitle: "", display_order: sections.length + 1, enabled: true } }, "Section added."); if (ok) { setNewTitle(""); load(); } }
  async function moveMember(id: string, key: string, orderValue?: any) {
    const previous = choices[id] || ""; const previousOrder = orders[id] ?? 100;
    const nextOrder = Number(orderValue ?? previousOrder ?? 100);
    setChoices((c: any) => ({ ...c, [id]: key })); setOrders((o: any) => ({ ...o, [id]: nextOrder }));
    const ok = await callSave({ action: "member", memberId: id, sectionKey: key, displayOrder: nextOrder }, key ? "Member moved / order saved." : "Member returned to auto group.");
    if (!ok) { setChoices((c: any) => ({ ...c, [id]: previous })); setOrders((o: any) => ({ ...o, [id]: previousOrder })); }
  }
  useEffect(() => { load(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-pink-300 text-sm font-black uppercase tracking-[0.25em]">Studio</p><h1 className="mt-2 text-4xl font-black">Team Page Management</h1><p className="mt-3 max-w-3xl text-slate-300">Edit only the public Team page text and grouping. These groups and manual order are used only on the public Team page.</p></div><div className="flex gap-3"><button onClick={load} className="rounded-xl bg-white/10 px-5 py-3 font-black text-white">Refresh</button><a href="/team" target="_blank" className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">View Team Page</a></div></div>{loading && <div className="rounded-2xl bg-white/10 p-6 font-bold">{message}</div>}{!loading && !canAccess && <div className="rounded-2xl bg-white p-8 font-bold text-slate-950">{message}</div>}{!loading && canAccess && <div className="grid gap-6 lg:grid-cols-2"><section className="space-y-6"><div className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Page Text & Sort Mode</h2>{Object.keys(defaultText).filter((key) => key !== "teamOrderMode").map((key) => <label key={key} className="mt-3 grid gap-1 font-black capitalize"><span>{key}</span><textarea value={text[key] || ""} onChange={(e) => setText({ ...text, [key]: e.target.value })} rows={key === "subtitle" ? 3 : 1} className="rounded-xl border p-3 font-normal" /></label>)}<label className="mt-3 grid gap-1 font-black"><span>Team member order</span><select value={text.teamOrderMode || "score"} onChange={(e) => setText({ ...text, teamOrderMode: e.target.value })} className="rounded-xl border p-3 font-normal"><option value="score">Default: points / score first</option><option value="override">Use admin override order first</option></select></label><button onClick={saveText} disabled={saving} className="mt-4 rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-50">{saving ? "Saving..." : "Save Text / Sort Mode"}</button></div><div className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Team Page Sections</h2><p className="mt-1 text-sm font-semibold text-slate-600">Create, rename, hide, and order sections for the public Team page only.</p><div className="mt-4 flex gap-2"><input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New section title" className="min-w-0 flex-1 rounded-xl border p-3" /><button onClick={addSection} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50">Add</button></div><div className="mt-4 space-y-3">{sections.map((section) => <div key={section.section_key} className="rounded-2xl border bg-slate-50 p-4"><input value={section.title} onChange={(e) => setSections(sections.map((x) => x.section_key === section.section_key ? { ...x, title: e.target.value } : x))} className="w-full rounded-xl border p-3 font-black" /><textarea value={section.subtitle || ""} onChange={(e) => setSections(sections.map((x) => x.section_key === section.section_key ? { ...x, subtitle: e.target.value } : x))} className="mt-2 w-full rounded-xl border p-3" /><input type="number" value={section.display_order || 100} onChange={(e) => setSections(sections.map((x) => x.section_key === section.section_key ? { ...x, display_order: Number(e.target.value) } : x))} className="mt-2 w-full rounded-xl border p-3" /><div className="mt-2 flex items-center justify-between"><label className="font-bold"><input type="checkbox" checked={section.enabled !== false} onChange={(e) => setSections(sections.map((x) => x.section_key === section.section_key ? { ...x, enabled: e.target.checked } : x))} /> Enabled</label><button onClick={() => saveSection(section)} disabled={saving} className="rounded-xl bg-pink-600 px-4 py-2 font-black text-white disabled:opacity-50">Save</button></div></div>)}</div><button onClick={seed} disabled={saving} className="mt-4 rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50">Seed Defaults</button></div></section><section className="space-y-6"><div className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Move & Order Members</h2><p className="mt-1 text-sm font-semibold text-slate-600">Search by name/title/email, filter by section, and set an override order number. Lower number appears first when override mode is enabled.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="rounded-xl border p-3" /><select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="rounded-xl border p-3 font-bold"><option value="all">All sections</option><option value="auto">Auto group</option>{visibleSections.map((section) => <option key={section.section_key} value={section.section_key}>{section.title}</option>)}</select></div><p className="mt-3 text-xs font-black uppercase text-slate-500">Showing {filteredMembers.length} of {members.length}</p><div className="mt-4 max-h-[760px] space-y-3 overflow-y-auto pr-1">{filteredMembers.map((member) => <div key={member.id} className="grid gap-3 rounded-2xl border bg-slate-50 p-4 md:grid-cols-[1fr_150px_110px]"><div><p className="font-black">{member.name}</p><p className="text-sm font-bold text-pink-600">{member.title}</p><p className="text-xs text-slate-500">{member.email}</p></div><select value={choices[member.id] || ""} onChange={(e) => moveMember(member.id, e.target.value, orders[member.id] ?? 100)} disabled={saving} className="rounded-xl border p-3 font-bold"><option value="">Auto group</option>{visibleSections.map((section) => <option key={section.section_key} value={section.section_key}>{section.title}</option>)}</select><input type="number" value={orders[member.id] ?? 100} onChange={(e) => setOrders((o: any) => ({ ...o, [member.id]: Number(e.target.value) }))} onBlur={(e) => moveMember(member.id, choices[member.id] || "", Number(e.target.value))} disabled={saving} title="Override order" className="rounded-xl border p-3 font-bold" /></div>)}{filteredMembers.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-slate-600">No members match this filter.</p>}</div></div>{message && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}</section></div>}</div></main>;
}

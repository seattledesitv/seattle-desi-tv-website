"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import SafeImage from "../components/SafeImage";
import { isPubliclyHidden, loadHiddenUsers } from "../lib/publicVisibility";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

type TeamMember = { id: string; name: string; title: string; image: string; email?: string | null; user_id?: string | null; profile_photo_url?: string | null; id_badge_url?: string | null; admin_role?: string | null; coverage_score?: number; managed_section?: string | null; managed_order?: number | null };
type Spotlight = { key: string; name: string; email: string; count: number; photo?: string };
type CoverageThanks = { key: string; name: string; email: string; eventTitles: string[]; count: number; photo?: string };
type SectionRow = { section_key: string; title: string; subtitle?: string | null; display_order?: number | null; enabled?: boolean | null };

const defaultSettings: any = { eyebrow: "Seattle Desi TV", title: "Meet Our Team", subtitle: "The community builders, creators, hosts, volunteers, and media team powering Seattle Desi TV.", spotlightTitle: "Team Spotlight", weeklyTitle: "Event Coverage Last Week" };
const defaultSections: SectionRow[] = [
  { section_key: "super_admin", title: "Super Admins", subtitle: "Leadership and platform oversight.", display_order: 1, enabled: true },
  { section_key: "pm_admin", title: "PM Admins", subtitle: "Program and project management leadership.", display_order: 2, enabled: true },
  { section_key: "admin", title: "Admins", subtitle: "Studio operations and administrative support.", display_order: 3, enabled: true },
  { section_key: "team_member", title: "Team Members", subtitle: "Community builders, creators, hosts, volunteers, and media team members.", display_order: 4, enabled: true },
];

function startOfWeekMonday(date = new Date()) { const d = new Date(date); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; d.setDate(d.getDate() + diff); d.setHours(0, 0, 0, 0); return d; }
function previousWeekRange() { const thisMonday = startOfWeekMonday(new Date()); const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7); const lastSundayEnd = new Date(thisMonday); lastSundayEnd.setMilliseconds(-1); return { start: lastMonday, end: lastSundayEnd }; }
function displayName(row: any, profilesByEmail: Record<string, any>) { const email = row.user_email || row.email || ""; return profilesByEmail[email]?.full_name || row.user_name || email || "SDTV Volunteer"; }
function normalizeRole(value?: string | null) { return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_"); }
function normalizeText(value?: string | null) { return String(value || "").trim().toLowerCase(); }
function inferredRole(member: TeamMember) { const explicit = normalizeRole(member.admin_role); if (explicit) return explicit; const title = normalizeText(member.title); if (/founder|co-founder|cofounder|president|chair|board/.test(title)) return "super_admin"; if (/program manager|project manager|pm admin|pm_admin|pm\b|operations manager/.test(title)) return "pm_admin"; if (/admin|director|lead|manager/.test(title)) return "admin"; return "team_member"; }
function groupKey(member: TeamMember) { if (member.managed_section) return member.managed_section; const role = inferredRole(member); if (role === "super_admin" || role === "superadmin") return "super_admin"; if (["pm_admin", "program_manager_admin", "project_manager_admin"].includes(role)) return "pm_admin"; if (role.includes("admin")) return "admin"; return "team_member"; }
function memberCoverageScore(member: TeamMember, scoreByEmail: Record<string, number>, scoreByUser: Record<string, number>) { const email = String(member.email || "").toLowerCase(); const userId = String(member.user_id || ""); return Number(scoreByEmail[email] || 0) + Number(scoreByUser[userId] || 0); }

export default function PublicTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [topVolunteers, setTopVolunteers] = useState<Spotlight[]>([]);
  const [weeklyThanks, setWeeklyThanks] = useState<CoverageThanks[]>([]);
  const [sections, setSections] = useState<SectionRow[]>(defaultSections);
  const [pageText, setPageText] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeam() {
      setError("");
      const [teamResult, assignmentsResult, volunteerProfilesResult, userProfilesResult, adminsResult, hidden, pageSettingsResult, pageSectionsResult, pageAssignmentsResult] = await Promise.all([
        supabase.from("team_members").select("id,name,title,image,email,user_id,show_on_public_team").eq("show_on_public_team", true).order("created_at", { ascending: true }),
        supabase.from("event_crew_assignments").select("id,user_id,user_email,event_title,coverage_completed,completed_at,status").eq("coverage_completed", true).order("completed_at", { ascending: false }).limit(500),
        supabase.from("volunteer_onboarding_submissions").select("user_id,email,full_name,photo_url"),
        supabase.from("user_profiles").select("user_id,email,full_name,profile_photo_url,id_badge_url"),
        supabase.from("admins").select("user_id,email,role,name"),
        loadHiddenUsers(supabase),
        supabase.from("team_page_settings").select("key,value"),
        supabase.from("team_page_sections").select("section_key,title,subtitle,display_order,enabled").order("display_order", { ascending: true }),
        supabase.from("team_page_member_assignments").select("member_id,section_key,display_order"),
      ]);

      if (!pageSettingsResult.error && pageSettingsResult.data) { const next: any = { ...defaultSettings }; pageSettingsResult.data.forEach((row: any) => { if (row.key in next) next[row.key] = row.value || next[row.key]; }); setPageText(next); }
      if (!pageSectionsResult.error && pageSectionsResult.data?.length) setSections(pageSectionsResult.data.filter((row: any) => row.enabled !== false));
      const managedByMember: Record<string, any> = {}; if (!pageAssignmentsResult.error) (pageAssignmentsResult.data || []).forEach((row: any) => { managedByMember[row.member_id] = row; });

      const completedRows = assignmentsResult.error ? [] : (assignmentsResult.data || []).filter((row: any) => !isPubliclyHidden(row, hidden));
      const scoreByEmail: Record<string, number> = {}; const scoreByUser: Record<string, number> = {};
      completedRows.forEach((row: any) => { const email = String(row.user_email || "").toLowerCase(); const userId = String(row.user_id || ""); if (email) scoreByEmail[email] = (scoreByEmail[email] || 0) + 1; if (userId) scoreByUser[userId] = (scoreByUser[userId] || 0) + 1; });

      const volunteerByEmail: Record<string, any> = {}; const userProfileByEmail: Record<string, any> = {}; const userProfileByUserId: Record<string, any> = {}; const adminByEmail: Record<string, any> = {}; const adminByUserId: Record<string, any> = {};
      (volunteerProfilesResult.data || []).forEach((profile: any) => { if (profile.email) volunteerByEmail[String(profile.email).toLowerCase()] = profile; });
      (userProfilesResult.data || []).forEach((profile: any) => { if (profile.email) userProfileByEmail[String(profile.email).toLowerCase()] = profile; if (profile.user_id) userProfileByUserId[profile.user_id] = profile; });
      (adminsResult.data || []).forEach((admin: any) => { if (admin.email) adminByEmail[String(admin.email).toLowerCase()] = admin; if (admin.user_id) adminByUserId[admin.user_id] = admin; });

      function enrich(member: any) {
        const email = String(member.email || "").toLowerCase();
        const userId = member.user_id || "";
        const baseProfile = userProfileByUserId[userId] || userProfileByEmail[email] || {};
        const volunteerProfile = volunteerByEmail[email] || {};
        const admin = adminByUserId[userId] || adminByEmail[email] || {};
        const managed = managedByMember[member.id] || {};
        const enriched: TeamMember = { ...member, profile_photo_url: baseProfile.profile_photo_url || volunteerProfile.photo_url || null, id_badge_url: baseProfile.id_badge_url || null, admin_role: admin.role || null, managed_section: managed.section_key || null, managed_order: managed.display_order ?? null };
        enriched.coverage_score = memberCoverageScore(enriched, scoreByEmail, scoreByUser);
        return enriched;
      }

      if (teamResult.error) { setError(teamResult.error.message); } else setMembers((teamResult.data || []).filter((member: any) => !isPubliclyHidden(member, hidden)).map(enrich));

      const profilesByEmail: Record<string, any> = {}; (volunteerProfilesResult.data || []).forEach((profile: any) => { if (profile.email) profilesByEmail[profile.email] = profile; });
      const topMap: Record<string, Spotlight> = {}; completedRows.forEach((row: any) => { const key = row.user_email || row.user_id || row.id; const profile = profilesByEmail[row.user_email || ""] || {}; if (!topMap[key]) topMap[key] = { key, name: displayName(row, profilesByEmail), email: row.user_email || "", count: 0, photo: profile.photo_url }; topMap[key].count += 1; }); setTopVolunteers(Object.values(topMap).sort((a, b) => b.count - a.count).slice(0, 3));
      const { start, end } = previousWeekRange(); const thanksMap: Record<string, CoverageThanks> = {}; completedRows.filter((row: any) => { if (!row.completed_at) return false; const completed = new Date(row.completed_at); return completed >= start && completed <= end; }).forEach((row: any) => { const key = row.user_email || row.user_id || row.id; const profile = profilesByEmail[row.user_email || ""] || {}; if (!thanksMap[key]) thanksMap[key] = { key, name: displayName(row, profilesByEmail), email: row.user_email || "", eventTitles: [], count: 0, photo: profile.photo_url }; thanksMap[key].count += 1; if (row.event_title && !thanksMap[key].eventTitles.includes(row.event_title)) thanksMap[key].eventTitles.push(row.event_title); }); setWeeklyThanks(Object.values(thanksMap).sort((a, b) => b.count - a.count)); setLoading(false);
    }
    loadTeam();
  }, []);

  const { start, end } = previousWeekRange();
  const groupedMembers = useMemo(() => {
    const sectionMap: Record<string, SectionRow> = {}; sections.forEach((s) => sectionMap[s.section_key] = s);
    const buckets: Record<string, TeamMember[]> = {}; members.forEach((member) => { const key = groupKey(member); if (!buckets[key]) buckets[key] = []; buckets[key].push(member); if (!sectionMap[key]) sectionMap[key] = { section_key: key, title: key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()), subtitle: "", display_order: 100, enabled: true }; });
    return Object.keys(buckets).map((key) => ({ section: sectionMap[key], members: buckets[key].sort((a, b) => Number(a.managed_order ?? 999) - Number(b.managed_order ?? 999) || Number(b.coverage_score || 0) - Number(a.coverage_score || 0) || String(a.name || "").localeCompare(String(b.name || ""))) })).sort((a, b) => Number(a.section.display_order || 999) - Number(b.section.display_order || 999));
  }, [members, sections]);

  return <main className="min-h-screen bg-slate-950 text-white"><SiteHeader /><section className="px-6 py-12"><div className="max-w-7xl mx-auto"><div className="mb-10 text-center"><p className="text-pink-300 font-black uppercase tracking-[0.3em]">{pageText.eyebrow}</p><h1 className="text-4xl md:text-6xl font-black mt-3">{pageText.title}</h1><p className="text-slate-300 max-w-2xl mx-auto mt-4">{pageText.subtitle}</p></div>{loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">Loading team...</div>}{error && <div className="bg-red-100 text-red-800 rounded-2xl p-6 mb-8">{error}</div>}{!loading && <div className="space-y-12"><section className="bg-white/10 border border-white/10 rounded-3xl p-6 md:p-8"><div className="mb-6"><p className="text-pink-300 font-black uppercase tracking-wide">Team Spotlight</p><h2 className="text-3xl md:text-4xl font-black mt-2">{pageText.spotlightTitle}</h2><p className="text-slate-300 mt-2">Recognizing volunteers based on completed SDTV event coverage.</p></div><div className="grid md:grid-cols-3 gap-5">{topVolunteers.map((volunteer, index) => <article key={volunteer.key} className="bg-white text-slate-950 rounded-2xl p-5 shadow-xl"><div className="flex items-center gap-4"><SafeImage src={volunteer.photo} alt={volunteer.name} className="w-16 h-16 rounded-2xl object-cover" fallbackClassName="w-16 h-16 rounded-2xl bg-pink-50 grid place-items-center text-pink-600 font-black" fallbackLabel={`#${index + 1}`} /><div><p className="text-xs font-black uppercase text-pink-600">#{index + 1} Volunteer</p><h3 className="text-xl font-black">{volunteer.name}</h3><p className="text-gray-600 text-sm">{volunteer.count} completed coverage item(s)</p></div></div></article>)}{topVolunteers.length === 0 && <p className="text-slate-300">No completed coverage stats yet.</p>}</div></section><section className="bg-white text-slate-950 rounded-3xl p-6 md:p-8"><p className="text-pink-600 font-black uppercase tracking-wide">Thank You</p><h2 className="text-3xl md:text-4xl font-black mt-2">{pageText.weeklyTitle}</h2><p className="text-gray-600 mt-2">Coverage completed from {start.toLocaleDateString()} to {end.toLocaleDateString()}.</p><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">{weeklyThanks.map((person) => <article key={person.key} className="border rounded-2xl p-5 bg-slate-50"><div className="flex gap-4 items-start"><SafeImage src={person.photo} alt={person.name} className="w-14 h-14 rounded-2xl object-cover" fallbackClassName="w-14 h-14 rounded-2xl bg-white grid place-items-center text-pink-600 font-black" fallbackLabel="SDTV" /><div><h3 className="text-xl font-black">{person.name}</h3><p className="text-gray-600 text-sm">Covered {person.count} event(s)</p></div></div>{person.eventTitles.length > 0 && <ul className="list-disc ml-5 mt-4 text-sm text-gray-700 space-y-1">{person.eventTitles.slice(0, 4).map((title) => <li key={title}>{title}</li>)}</ul>}</article>)}{weeklyThanks.length === 0 && <p className="text-gray-600">No completed coverage was marked for last week yet.</p>}</div></section>{!error && <section><h2 className="text-3xl font-black mb-5">Team Members</h2><div className="space-y-10">{groupedMembers.map((group) => <div key={group.section.section_key} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 md:p-7"><div className="mb-5"><p className="text-pink-300 font-black uppercase tracking-wide">{group.members.length} profile{group.members.length === 1 ? "" : "s"}</p><h3 className="text-2xl md:text-3xl font-black mt-1">{group.section.title}</h3>{group.section.subtitle && <p className="text-slate-300 mt-2">{group.section.subtitle}</p>}</div><div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{group.members.map((member) => { const displayImage = member.id_badge_url || member.image || member.profile_photo_url || ""; return <article key={member.id} className="bg-white text-slate-950 rounded-2xl overflow-hidden shadow-xl"><SafeImage src={displayImage} alt={member.name} className="w-full h-72 object-cover" fallbackClassName="w-full h-72 bg-pink-50 grid place-items-center text-pink-600 font-black" fallbackLabel="SDTV" /><div className="p-5"><h2 className="text-xl font-black">{member.name}</h2><p className="text-pink-600 font-bold mt-1">{member.title}</p>{Number(member.coverage_score || 0) > 0 && <p className="mt-2 text-xs font-black uppercase text-slate-500">{member.coverage_score} completed coverage item(s)</p>}{member.id_badge_url && <p className="mt-2 text-xs font-black uppercase text-slate-500">SDTV ID Badge</p>}</div></article>; })}</div></div>)}{members.length === 0 && <p className="text-slate-300">No team members found.</p>}</div></section>}</div>}</div></section><SiteFooter /></main>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const whatsappGroupUrl = "https://chat.whatsapp.com/FOP04oZJWEOLgTMJVJPiVt";
const PAGE_SIZE = 6;

type TeamMember = { key: string; name: string; email: string; photo?: string; events: string[]; count: number; role: string; selected: boolean };

function lastWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diffToMonday);
  thisMonday.setHours(0, 0, 0, 0);
  const start = new Date(thisMonday);
  start.setDate(thisMonday.getDate() - 7);
  const end = new Date(thisMonday);
  end.setMilliseconds(-1);
  return { start, end };
}
function toInputDate(date: Date) { return date.toISOString().slice(0, 10); }
function dateFromInput(value: string, endOfDay = false) { const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`); return date; }
function fmt(date: Date) { return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function shortFmt(date: Date) { return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }).replace(",", ""); }
function safeName(email: string, fallback: string) { return fallback && fallback !== email ? fallback : email ? email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "SDTV Team Member"; }
function cleanHandle(value: string) { const v = value.trim(); return v ? v.startsWith("@") ? v : `@${v}` : ""; }
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number, align: CanvasTextAlign = "left") { ctx.textAlign = align; const words = text.split(" "); let line = ""; let lines = 0; for (const word of words) { const test = `${line}${word} `; if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line.trim(), x, y); line = `${word} `; y += lineHeight; lines++; if (lines >= maxLines) return; } else line = test; } if (line && lines < maxLines) ctx.fillText(line.trim(), x, y); }
function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve) => { const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => resolve(img); img.onerror = () => resolve(img); img.src = src; }); }
function drawImageContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, maxW: number, maxH: number) { if (!img.complete || !img.naturalWidth || !img.naturalHeight) return; const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight); const w = img.naturalWidth * ratio; const h = img.naturalHeight * ratio; ctx.drawImage(img, x + (maxW - w) / 2, y + (maxH - h) / 2, w, h); }

export default function StudioRecognitionPage() {
  const defaultRange = useMemo(() => lastWeekRange(), []);
  const [startDate, setStartDate] = useState(toInputDate(defaultRange.start));
  const [endDate, setEndDate] = useState(toInputDate(defaultRange.end));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Checking Studio access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [handlesText, setHandlesText] = useState("");
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);
  const [studioText, setStudioText] = useState("S E A T T L E   D E S I   T V");
  const [scriptText, setScriptText] = useState("Thank You");
  const [headlineText, setHeadlineText] = useState("OUR TEAM!");
  const [dateBoxTitle, setDateBoxTitle] = useState("COVERAGE");
  const [dateBoxSubtitle, setDateBoxSubtitle] = useState("RECOGNITION");
  const [thankMessage, setThankMessage] = useState("Huge thank you to our amazing SDTV team members for covering community stories. Your time, energy, and passion help us celebrate the people and events that bring our community together.");
  const [impactText, setImpactText] = useState("YOU MADE A DIFFERENCE!");
  const [emptyStateText, setEmptyStateText] = useState("No completed coverage found for this date range yet.");
  const [taglineText, setTaglineText] = useState("Together, we tell our community's story.");
  const [footerText, setFooterText] = useState("seattledesitv.com   |   @seattledesitv");
  const [hashtagText, setHashtagText] = useState("#SeattleDesiTV  #SDTVTeam  #CommunityStories");
  const [extraNote, setExtraNote] = useState("");

  const canAccess = Boolean(user && isAdminRole(role));
  const start = useMemo(() => dateFromInput(startDate), [startDate]);
  const end = useMemo(() => dateFromInput(endDate, true), [endDate]);
  const selected = members.filter((v) => v.selected);
  const pages = useMemo(() => { const chunks: TeamMember[][] = []; for (let i = 0; i < selected.length; i += PAGE_SIZE) chunks.push(selected.slice(i, i + PAGE_SIZE)); return chunks.length ? chunks : [[]]; }, [selected]);
  const handleList = useMemo(() => handlesText.split(/[\n,]/).map(cleanHandle).filter(Boolean), [handlesText]);

  const caption = useMemo(() => {
    const names = selected.map((v) => v.name).join(", ");
    const events = Array.from(new Set(selected.flatMap((v) => v.events))).slice(0, 12);
    return ["✨ SDTV Team Recognition", "", thankMessage, extraNote, "", names ? `Recognizing: ${names}` : "Recognizing our amazing SDTV team members.", events.length ? `Covered during ${fmt(start)} - ${fmt(end)}: ${events.join(" • ")}` : `Thank you for supporting SDTV coverage during ${fmt(start)} - ${fmt(end)}.`, pages.length > 1 ? `\nThis recognition has ${pages.length} image pages for Instagram/WhatsApp.` : "", handleList.length ? `\n${handleList.join(" ")}` : "", "", "#SeattleDesiTV #SDTVTeam #SeattleEvents #DesiCommunity #CommunityStories #PNWDesi"].filter(Boolean).join("\n");
  }, [selected, thankMessage, extraNote, handleList, start, end, pages.length]);

  function markDirty() { setImageDataUrls([]); }
  async function loadData() {
    setLoading(true); setMessage("Checking Studio access..."); setImageDataUrls([]);
    const auth = await supabase.auth.getUser();
    const currentUser = auth.data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setRole(""); setMessage("Please login as a Studio admin."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage(`Studio admin access required. Current role: ${nextRole}`); setLoading(false); return; }
    if (!startDate || !endDate || start > end) { setMessage("Please choose a valid start and end date."); setLoading(false); return; }
    const [assignments, profiles] = await Promise.all([
      supabase.from("event_crew_assignments").select("id,user_id,user_email,event_title,assignment_type,completed_at,coverage_completed").eq("coverage_completed", true).gte("completed_at", start.toISOString()).lte("completed_at", end.toISOString()).order("completed_at", { ascending: false }).limit(1000),
      supabase.from("volunteer_onboarding_submissions").select("user_id,email,full_name,photo_url"),
    ]);
    if (assignments.error) { setMessage(`Could not load coverage: ${assignments.error.message}`); setMembers([]); setLoading(false); return; }
    const byEmail: Record<string, any> = {}; const byUser: Record<string, any> = {};
    (profiles.data || []).forEach((p: any) => { if (p.email) byEmail[String(p.email).toLowerCase()] = p; if (p.user_id) byUser[String(p.user_id)] = p; });
    const map: Record<string, TeamMember> = {};
    (assignments.data || []).forEach((row: any) => {
      const p = byUser[String(row.user_id || "")] || byEmail[String(row.user_email || "").toLowerCase()] || {};
      const email = p.email || row.user_email || ""; const key = email || row.user_id || row.id;
      const roleLabel = row.assignment_type ? String(row.assignment_type).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Team Member";
      if (!map[key]) map[key] = { key, email, name: safeName(email, p.full_name || email), photo: p.photo_url || "", events: [], count: 0, role: roleLabel, selected: true };
      map[key].count += 1; if (row.event_title && !map[key].events.includes(row.event_title)) map[key].events.push(row.event_title);
    });
    setMembers(Object.values(map).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)));
    setMessage(""); setLoading(false);
  }
  function toggleMember(key: string) { setMembers((items) => items.map((v) => v.key === key ? { ...v, selected: !v.selected } : v)); setImageDataUrls([]); }
  async function copyCaption() { await navigator.clipboard.writeText(caption); setMessage("Instagram caption copied."); }

  async function drawPage(pageMembers: TeamMember[], pageIndex: number, totalPages: number, logo: HTMLImageElement) {
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Could not create image.");
    const bg = ctx.createLinearGradient(0, 0, 1080, 1350); bg.addColorStop(0, "#020617"); bg.addColorStop(0.45, "#111827"); bg.addColorStop(1, "#090014"); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
    for (let i = 0; i < 110; i++) { ctx.fillStyle = `rgba(245,158,11,${Math.random() * 0.35})`; ctx.beginPath(); ctx.arc(Math.random() * 1080, Math.random() * 1100, Math.random() * 3 + 1, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(245,158,11,0.18)"; ctx.beginPath(); ctx.arc(95, 95, 140, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(970, 880, 220, 0, Math.PI * 2); ctx.fill();
    drawImageContain(ctx, logo, 62, 54, 120, 90);
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#facc15"; ctx.font = "800 26px Arial"; ctx.fillText(studioText, 540, 110);
    ctx.fillStyle = "#ffffff"; ctx.font = "italic 86px Georgia"; ctx.fillText(scriptText, 540, 230);
    const gold = ctx.createLinearGradient(260, 280, 830, 380); gold.addColorStop(0, "#f59e0b"); gold.addColorStop(0.5, "#fde68a"); gold.addColorStop(1, "#f59e0b"); ctx.fillStyle = gold; ctx.font = headlineText.length > 10 ? "900 82px Arial" : "900 96px Arial"; ctx.fillText(headlineText, 540, 350);
    ctx.fillStyle = "#fbbf24"; roundRect(ctx, 810, 0, 235, 210, 0); ctx.fill();
    ctx.fillStyle = "#111827"; ctx.textAlign = "center"; ctx.font = "900 24px Arial"; ctx.fillText(dateBoxTitle, 928, 50); ctx.fillText(dateBoxSubtitle, 928, 82); ctx.font = "800 17px Arial"; ctx.fillText(`${shortFmt(start)} - ${shortFmt(end)}`, 928, 119); ctx.fillText(String(end.getFullYear()), 928, 148); if (totalPages > 1) { ctx.font = "900 17px Arial"; ctx.fillText(`PAGE ${pageIndex + 1} OF ${totalPages}`, 928, 180); }
    ctx.fillStyle = "#ffffff"; ctx.font = "800 30px Arial"; wrapText(ctx, thankMessage, 120, 435, 840, 42, 4, "left");
    ctx.textAlign = "center"; ctx.fillStyle = "#facc15"; ctx.font = "900 32px Arial"; ctx.fillText(impactText, 540, 610);
    const startX = 140; const gap = 160;
    for (let i = 0; i < pageMembers.length; i++) {
      const p = pageMembers[i]; const cx = startX + i * gap; const cy = 735;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 56, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
      if (p.photo) { const img = await loadImage(p.photo); if (img.complete && img.naturalWidth) ctx.drawImage(img, cx - 56, cy - 56, 112, 112); else { ctx.fillStyle = "#fdf2f8"; ctx.fillRect(cx - 56, cy - 56, 112, 112); } }
      else { ctx.fillStyle = "#fdf2f8"; ctx.fillRect(cx - 56, cy - 56, 112, 112); ctx.fillStyle = "#be185d"; ctx.font = "900 34px Arial"; ctx.textAlign = "center"; ctx.fillText(p.name.slice(0, 1), cx, cy + 12); }
      ctx.restore(); ctx.strokeStyle = "#facc15"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 58, 0, Math.PI * 2); ctx.stroke();
      ctx.textAlign = "center"; ctx.fillStyle = "#ffffff"; ctx.font = "900 22px Arial"; ctx.fillText(p.name.length > 12 ? `${p.name.slice(0, 11)}…` : p.name, cx, 835); ctx.fillStyle = "#e5e7eb"; ctx.font = "700 18px Arial"; ctx.fillText(p.role.length > 15 ? `${p.role.slice(0, 14)}…` : p.role, cx, 862);
    }
    if (!pageMembers.length) { ctx.fillStyle = "#ffffff"; ctx.font = "800 34px Arial"; wrapText(ctx, emptyStateText, 540, 735, 820, 42, 2, "center"); }
    ctx.textAlign = "center"; ctx.fillStyle = "#facc15"; ctx.font = "italic 42px Georgia"; ctx.fillText(taglineText, 540, 960); ctx.fillStyle = "#ec4899"; ctx.font = "italic 54px Georgia"; ctx.fillText("♡", 875, 970);
    const footer = ctx.createLinearGradient(0, 1115, 1080, 1115); footer.addColorStop(0, "#9d174d"); footer.addColorStop(1, "#db2777"); ctx.fillStyle = footer; ctx.fillRect(0, 1115, 1080, 115);
    ctx.fillStyle = "#ffffff"; ctx.font = "900 27px Arial"; ctx.fillText(footerText, 540, 1185); ctx.font = "800 25px Arial"; ctx.fillText(hashtagText, 540, 1285);
    return canvas.toDataURL("image/png");
  }

  async function generateImages() {
    setBusy(true); setMessage("");
    try {
      const logo = await loadImage("/sdtv-logo.png");
      const urls: string[] = [];
      for (let i = 0; i < pages.length; i++) urls.push(await drawPage(pages[i], i, pages.length, logo));
      setImageDataUrls(urls);
      setMessage(`Generated ${urls.length} recognition image page(s) for Instagram and WhatsApp.`);
    } catch (error: any) { setMessage(error?.message || "Could not generate image."); } finally { setBusy(false); }
  }
  useEffect(() => { loadData(); }, []);

  return <main className="min-h-screen bg-[#030712] text-white"><StudioHeader /><div className="mx-auto max-w-7xl px-6 py-8"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">Studio › Recognition</p><h1 className="mt-2 text-4xl font-black md:text-5xl">⭐ Team Member Recognition Post</h1><p className="mt-3 max-w-3xl text-slate-300">Choose any date range, generate one or more editable images, and post them to Instagram/WhatsApp.</p></div><button onClick={loadData} className="rounded-xl border border-white/15 bg-white/10 px-5 py-3 font-black text-white hover:bg-white/15">↻ Refresh Data</button></div>{loading && <div className="rounded-2xl bg-white/10 p-6 font-bold">{message || "Loading..."}</div>}{!loading && !canAccess && <div className="max-w-xl rounded-2xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Studio Access</h2><p className="mt-3 text-gray-600">{message}</p><a href="/login" className="mt-5 inline-block rounded-xl bg-pink-600 px-5 py-3 font-bold text-white">Go to Login</a></div>}{!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[0.95fr_1.15fr]"><section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"><div className="border-b border-white/10 pb-5"><p className="font-black text-yellow-300">1. Coverage Date Range</p><div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><label className="grid gap-1 text-sm font-bold text-slate-300">Start Date<input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); markDirty(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" /></label><label className="grid gap-1 text-sm font-bold text-slate-300">End Date<input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); markDirty(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" /></label><button onClick={loadData} className="self-end rounded-xl bg-green-600 px-5 py-3 font-black text-white">Load Coverage</button></div><p className="mt-3 text-sm text-slate-300">👥 {members.length} team member(s) completed coverage · {selected.length} selected · {pages.length} image page(s)</p></div><div className="mt-5"><p className="font-black text-yellow-300">2. Team Members Who Completed Coverage</p><p className="mt-2 text-sm text-slate-300">If more than {PAGE_SIZE} are selected, the tool automatically generates multiple image pages.</p><div className="mt-4 space-y-3">{members.map((person) => <label key={person.key} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/5 p-3 hover:bg-white/10"><input type="checkbox" checked={person.selected} onChange={() => toggleMember(person.key)} className="h-5 w-5 accent-pink-600" />{person.photo ? <img src={person.photo} alt={person.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-pink-600 font-black">{person.name.slice(0, 1)}</div>}<div className="min-w-0 flex-1"><p className="font-black">{person.name}</p><p className="truncate text-xs text-slate-400">{person.events.slice(0, 2).join(" • ") || person.email}</p></div><span className="rounded-full bg-pink-500/20 px-3 py-1 text-xs font-black text-pink-200">{person.role}</span></label>)}{!members.length && <div className="rounded-2xl bg-white/5 p-4 text-slate-300">No completed coverage found for this date range yet.</div>}</div></div><div className="mt-6 border-t border-white/10 pt-5"><p className="font-black text-yellow-300">3. Editable Image Text</p><div className="mt-3 grid gap-3 md:grid-cols-2"><input value={studioText} onChange={(e) => { setStudioText(e.target.value); markDirty(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Studio line" /><input value={scriptText} onChange={(e) => { setScriptText(e.target.value); markDirty(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Script text" /><input value={headlineText} onChange={(e) => { setHeadlineText(e.target.value); markDirty(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Headline" /><input value={impactText} onChange={(e) => { setImpactText(e.target.value); markDirty(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Impact text" /><input value={dateBoxTitle} onChange={(e) => { setDateBoxTitle(e.target.value); markDirty(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Date box title" /><input value={dateBoxSubtitle} onChange={(e) => { setDateBoxSubtitle(e.target.value); markDirty(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Date box subtitle" /></div><label className="mt-4 grid gap-2"><span className="font-black text-yellow-300">Thank You Message</span><textarea value={thankMessage} onChange={(e) => { setThankMessage(e.target.value); markDirty(); }} rows={5} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pink-500" /></label><div className="mt-3 grid gap-3"><input value={emptyStateText} onChange={(e) => { setEmptyStateText(e.target.value); markDirty(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="No records message" /><input value={taglineText} onChange={(e) => { setTaglineText(e.target.value); markDirty(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Tagline" /><input value={footerText} onChange={(e) => { setFooterText(e.target.value); markDirty(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Footer text" /><input value={hashtagText} onChange={(e) => { setHashtagText(e.target.value); markDirty(); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Footer hashtags" /></div><label className="mt-4 grid gap-2"><span className="font-black text-yellow-300">Additional Note for Caption</span><textarea value={extraNote} onChange={(e) => { setExtraNote(e.target.value); markDirty(); }} rows={3} placeholder="Optional message to include in caption" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pink-500" /></label><label className="mt-4 grid gap-2"><span className="text-sm font-black uppercase tracking-wide text-slate-300">Instagram handles to tag</span><textarea value={handlesText} onChange={(e) => setHandlesText(e.target.value)} rows={2} placeholder="@member1, @member2 or one per line" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pink-500" /></label><button onClick={generateImages} disabled={busy} className="mt-5 w-full rounded-xl bg-pink-600 px-5 py-4 text-lg font-black text-white disabled:opacity-60">🖼️ {busy ? "Generating..." : `Generate ${pages.length} Recognition Image${pages.length > 1 ? "s" : ""}`}</button><p className="mt-3 text-center text-sm text-slate-400">More than {PAGE_SIZE} selected team members will create multiple pages.</p>{message && <div className="mt-4 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}</div></section><aside className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"><h2 className="text-2xl font-black">Preview – Recognition Images</h2><p className="mt-1 text-slate-300">{imageDataUrls.length || pages.length} image page(s) for Instagram post & WhatsApp group</p><div className="mt-5 space-y-5">{imageDataUrls.length ? imageDataUrls.map((url, index) => <div key={index} className="overflow-hidden rounded-2xl border border-white/10 bg-black/40"><p className="bg-white/10 px-4 py-2 text-sm font-black">Page {index + 1} of {imageDataUrls.length}</p><img src={url} alt={`Recognition preview page ${index + 1}`} className="w-full" /></div>) : <div className="grid aspect-[4/5] place-items-center rounded-2xl border border-white/10 bg-black/40 p-8 text-center text-slate-400"><div><p className="text-5xl">⭐</p><p className="mt-4 font-bold">Generate recognition images to preview them here.</p></div></div>}</div><div className="mt-5 grid gap-3"><button onClick={copyCaption} className="rounded-xl bg-pink-600 px-5 py-4 text-center font-black text-white">📋 Copy Instagram Caption</button>{imageDataUrls.map((url, index) => <a key={index} href={url} download={`sdtv-team-recognition-page-${index + 1}-${startDate}-to-${endDate}.png`} className="rounded-xl bg-slate-900 px-5 py-4 text-center font-black text-white">⬇️ Download Page {index + 1}</a>)}<a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="rounded-xl bg-pink-600 px-5 py-4 text-center font-black text-white">📸 Post to Instagram</a><a href={whatsappGroupUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-green-600 px-5 py-4 text-center font-black text-white">🟢 Share to WhatsApp Group</a></div><div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4"><p className="font-black">Instagram Caption</p><textarea value={caption} readOnly rows={10} className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" /></div></aside></div>}</div></main>;
}

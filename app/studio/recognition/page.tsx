"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const whatsappGroupUrl = "https://chat.whatsapp.com/FOP04oZJWEOLgTMJVJPiVt";

type Volunteer = { key: string; name: string; email: string; photo?: string; events: string[]; count: number; role: string; selected: boolean };

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
function fmt(date: Date) { return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function shortFmt(date: Date) { return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }).replace(",", ""); }
function safeName(email: string, fallback: string) { return fallback && fallback !== email ? fallback : email ? email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "SDTV Volunteer"; }
function cleanHandle(value: string) { const v = value.trim(); return v ? v.startsWith("@") ? v : `@${v}` : ""; }
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(" "); let line = ""; let lines = 0;
  for (const word of words) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, y);
      line = `${word} `;
      y += lineHeight;
      lines++;
      if (lines >= maxLines) return;
    } else line = test;
  }
  if (line && lines < maxLines) ctx.fillText(line.trim(), x, y);
}
function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve) => { const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => resolve(img); img.onerror = () => resolve(img); img.src = src; }); }
function drawImageContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, maxW: number, maxH: number) {
  if (!img.complete || !img.naturalWidth || !img.naturalHeight) return;
  const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = img.naturalWidth * ratio;
  const h = img.naturalHeight * ratio;
  ctx.drawImage(img, x + (maxW - w) / 2, y + (maxH - h) / 2, w, h);
}

export default function StudioRecognitionPage() {
  const { start, end } = useMemo(() => lastWeekRange(), []);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Checking Studio access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [handlesText, setHandlesText] = useState("");
  const [thankMessage, setThankMessage] = useState("Huge thank you to our amazing SDTV volunteers for covering community stories last week. Your time, energy, and passion help us celebrate the people and events that bring our community together.");
  const [extraNote, setExtraNote] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const canAccess = Boolean(user && isAdminRole(role));
  const selected = volunteers.filter((v) => v.selected);
  const handleList = useMemo(() => handlesText.split(/[\n,]/).map(cleanHandle).filter(Boolean), [handlesText]);

  const caption = useMemo(() => {
    const names = selected.map((v) => v.name).join(", ");
    const events = Array.from(new Set(selected.flatMap((v) => v.events))).slice(0, 8);
    return ["✨ SDTV Volunteer Recognition", "", thankMessage, extraNote, "", names ? `Recognizing: ${names}` : "Recognizing our SDTV volunteer team.", events.length ? `Covered last week: ${events.join(" • ")}` : "Thank you for supporting SDTV coverage last week.", handleList.length ? `\n${handleList.join(" ")}` : "", "", "#SeattleDesiTV #SDTVVolunteers #SeattleEvents #DesiCommunity #CommunityStories #PNWDesi"].filter(Boolean).join("\n");
  }, [selected, thankMessage, extraNote, handleList]);

  async function loadData() {
    setLoading(true); setMessage("Checking Studio access..."); setImageDataUrl("");
    const auth = await supabase.auth.getUser();
    const currentUser = auth.data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setRole(""); setMessage("Please login as a Studio admin."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage(`Studio admin access required. Current role: ${nextRole}`); setLoading(false); return; }
    const [assignments, profiles] = await Promise.all([
      supabase.from("event_crew_assignments").select("id,user_id,user_email,event_title,assignment_type,completed_at,coverage_completed").eq("coverage_completed", true).gte("completed_at", start.toISOString()).lte("completed_at", end.toISOString()).order("completed_at", { ascending: false }).limit(500),
      supabase.from("volunteer_onboarding_submissions").select("user_id,email,full_name,photo_url"),
    ]);
    if (assignments.error) { setMessage(`Could not load last week coverage: ${assignments.error.message}`); setVolunteers([]); setLoading(false); return; }
    const byEmail: Record<string, any> = {}; const byUser: Record<string, any> = {};
    (profiles.data || []).forEach((p: any) => { if (p.email) byEmail[String(p.email).toLowerCase()] = p; if (p.user_id) byUser[String(p.user_id)] = p; });
    const map: Record<string, Volunteer> = {};
    (assignments.data || []).forEach((row: any) => {
      const p = byUser[String(row.user_id || "")] || byEmail[String(row.user_email || "").toLowerCase()] || {};
      const email = p.email || row.user_email || ""; const key = email || row.user_id || row.id;
      const roleLabel = row.assignment_type ? String(row.assignment_type).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Volunteer";
      if (!map[key]) map[key] = { key, email, name: safeName(email, p.full_name || email), photo: p.photo_url || "", events: [], count: 0, role: roleLabel, selected: true };
      map[key].count += 1; if (row.event_title && !map[key].events.includes(row.event_title)) map[key].events.push(row.event_title);
    });
    setVolunteers(Object.values(map).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)));
    setMessage(""); setLoading(false);
  }
  function toggleVolunteer(key: string) { setVolunteers((items) => items.map((v) => v.key === key ? { ...v, selected: !v.selected } : v)); setImageDataUrl(""); }
  async function copyCaption() { await navigator.clipboard.writeText(caption); setMessage("Instagram caption copied."); }

  async function generateImage() {
    setBusy(true); setMessage("");
    try {
      const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Could not create image.");
      const bg = ctx.createLinearGradient(0, 0, 1080, 1350); bg.addColorStop(0, "#020617"); bg.addColorStop(0.45, "#111827"); bg.addColorStop(1, "#090014"); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
      for (let i = 0; i < 110; i++) { ctx.fillStyle = `rgba(245,158,11,${Math.random() * 0.35})`; ctx.beginPath(); ctx.arc(Math.random() * 1080, Math.random() * 1100, Math.random() * 3 + 1, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "rgba(245,158,11,0.18)"; ctx.beginPath(); ctx.arc(95, 95, 140, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(970, 880, 220, 0, Math.PI * 2); ctx.fill();

      const logo = await loadImage("/sdtv-logo.png");
      drawImageContain(ctx, logo, 62, 54, 120, 90);

      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#facc15"; ctx.font = "800 26px Arial"; ctx.fillText("S E A T T L E   D E S I   T V", 540, 110);
      ctx.fillStyle = "#ffffff"; ctx.font = "italic 86px Georgia"; ctx.fillText("Thank You", 540, 230);
      const gold = ctx.createLinearGradient(260, 280, 830, 380); gold.addColorStop(0, "#f59e0b"); gold.addColorStop(0.5, "#fde68a"); gold.addColorStop(1, "#f59e0b"); ctx.fillStyle = gold; ctx.font = "900 96px Arial"; ctx.fillText("VOLUNTEERS!", 540, 350);

      ctx.fillStyle = "#fbbf24"; roundRect(ctx, 820, 0, 220, 205, 0); ctx.fill();
      ctx.fillStyle = "#111827"; ctx.textAlign = "center";
      ctx.font = "900 25px Arial"; ctx.fillText("LAST WEEK", 930, 52); ctx.fillText("COVERAGE", 930, 84);
      ctx.font = "800 18px Arial"; ctx.fillText(`${shortFmt(start)} - ${shortFmt(end)}`, 930, 120); ctx.fillText(String(end.getFullYear()), 930, 148);

      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff"; ctx.font = "800 30px Arial"; wrapText(ctx, thankMessage, 120, 435, 840, 42, 4);
      ctx.textAlign = "center";
      ctx.fillStyle = "#facc15"; ctx.font = "900 32px Arial"; ctx.fillText("YOU MADE A DIFFERENCE!", 540, 610);

      const people = selected.slice(0, 6); const startX = 140; const gap = 160;
      for (let i = 0; i < people.length; i++) {
        const p = people[i]; const cx = startX + i * gap; const cy = 735;
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 56, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        if (p.photo) { const img = await loadImage(p.photo); if (img.complete && img.naturalWidth) ctx.drawImage(img, cx - 56, cy - 56, 112, 112); else { ctx.fillStyle = "#fdf2f8"; ctx.fillRect(cx - 56, cy - 56, 112, 112); } }
        else { ctx.fillStyle = "#fdf2f8"; ctx.fillRect(cx - 56, cy - 56, 112, 112); ctx.fillStyle = "#be185d"; ctx.font = "900 34px Arial"; ctx.textAlign = "center"; ctx.fillText(p.name.slice(0, 1), cx, cy + 12); }
        ctx.restore(); ctx.strokeStyle = "#facc15"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 58, 0, Math.PI * 2); ctx.stroke();
        ctx.textAlign = "center"; ctx.fillStyle = "#ffffff"; ctx.font = "900 22px Arial"; ctx.fillText(p.name.length > 12 ? `${p.name.slice(0, 11)}…` : p.name, cx, 835); ctx.fillStyle = "#e5e7eb"; ctx.font = "700 18px Arial"; ctx.fillText(p.role.length > 15 ? `${p.role.slice(0, 14)}…` : p.role, cx, 862);
      }
      if (!people.length) { ctx.textAlign = "center"; ctx.fillStyle = "#ffffff"; ctx.font = "800 34px Arial"; wrapText(ctx, "No completed coverage found for last week yet.", 540, 735, 820, 42, 2); }

      ctx.textAlign = "center"; ctx.fillStyle = "#facc15"; ctx.font = "italic 42px Georgia"; ctx.fillText("Together, we tell our community's story.", 540, 960); ctx.fillStyle = "#ec4899"; ctx.font = "italic 54px Georgia"; ctx.fillText("♡", 875, 970);
      const footer = ctx.createLinearGradient(0, 1115, 1080, 1115); footer.addColorStop(0, "#9d174d"); footer.addColorStop(1, "#db2777"); ctx.fillStyle = footer; ctx.fillRect(0, 1115, 1080, 115);
      ctx.fillStyle = "#ffffff"; ctx.font = "900 27px Arial"; ctx.fillText("seattledesitv.com   |   @seattledesitv", 540, 1185); ctx.font = "800 25px Arial"; ctx.fillText("#SeattleDesiTV  #SDTVVolunteers  #CommunityStories", 540, 1285);
      const url = canvas.toDataURL("image/png"); setImageDataUrl(url); setMessage("Recognition image generated for Instagram and WhatsApp.");
    } catch (error: any) { setMessage(error?.message || "Could not generate image."); } finally { setBusy(false); }
  }
  useEffect(() => { loadData(); }, []);

  return <main className="min-h-screen bg-[#030712] text-white"><StudioHeader /><div className="mx-auto max-w-7xl px-6 py-8"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">Studio › Recognition</p><h1 className="mt-2 text-4xl font-black md:text-5xl">⭐ Volunteer Recognition Post</h1><p className="mt-3 max-w-3xl text-slate-300">Generate one beautiful image to post on Instagram and share in the WhatsApp group.</p></div><button onClick={loadData} className="rounded-xl border border-white/15 bg-white/10 px-5 py-3 font-black text-white hover:bg-white/15">↻ Refresh Data</button></div>{loading && <div className="rounded-2xl bg-white/10 p-6 font-bold">{message || "Loading..."}</div>}{!loading && !canAccess && <div className="max-w-xl rounded-2xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Studio Access</h2><p className="mt-3 text-gray-600">{message}</p><a href="/login" className="mt-5 inline-block rounded-xl bg-pink-600 px-5 py-3 font-bold text-white">Go to Login</a></div>}{!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[0.95fr_1.15fr]"><section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"><div className="border-b border-white/10 pb-5"><p className="font-black text-yellow-300">1. Last Week Coverage</p><div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-black">📅 {fmt(start)} – {fmt(end)}</h2><p className="mt-2 text-sm text-slate-300">👥 {volunteers.length} volunteer(s) completed coverage</p></div><button onClick={loadData} className="rounded-xl bg-green-600 px-5 py-3 font-black text-white">↻ Refresh</button></div></div><div className="mt-5"><p className="font-black text-yellow-300">2. Volunteers Who Completed Coverage</p><p className="mt-2 text-sm text-slate-300">Select volunteers to include in the post.</p><div className="mt-4 space-y-3">{volunteers.map((person) => <label key={person.key} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/5 p-3 hover:bg-white/10"><input type="checkbox" checked={person.selected} onChange={() => toggleVolunteer(person.key)} className="h-5 w-5 accent-pink-600" />{person.photo ? <img src={person.photo} alt={person.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-pink-600 font-black">{person.name.slice(0, 1)}</div>}<div className="min-w-0 flex-1"><p className="font-black">{person.name}</p><p className="truncate text-xs text-slate-400">{person.events.slice(0, 2).join(" • ") || person.email}</p></div><span className="rounded-full bg-pink-500/20 px-3 py-1 text-xs font-black text-pink-200">{person.role}</span></label>)}{!volunteers.length && <div className="rounded-2xl bg-white/5 p-4 text-slate-300">No completed coverage found for last week yet.</div>}</div><p className="mt-3 text-sm font-bold text-green-400">{selected.length} of {volunteers.length} selected</p></div><div className="mt-6 border-t border-white/10 pt-5"><label className="grid gap-2"><span className="font-black text-yellow-300">3. Thank You Message</span><textarea value={thankMessage} onChange={(e) => { setThankMessage(e.target.value); setImageDataUrl(""); }} rows={5} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pink-500" /></label><label className="mt-4 grid gap-2"><span className="font-black text-yellow-300">4. Additional Note / Instagram Handles</span><textarea value={extraNote} onChange={(e) => { setExtraNote(e.target.value); setImageDataUrl(""); }} rows={3} placeholder="Optional message to include in caption" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pink-500" /></label><label className="mt-4 grid gap-2"><span className="text-sm font-black uppercase tracking-wide text-slate-300">Instagram handles to tag</span><textarea value={handlesText} onChange={(e) => setHandlesText(e.target.value)} rows={2} placeholder="@volunteer1, @volunteer2 or one per line" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pink-500" /></label><button onClick={generateImage} disabled={busy} className="mt-5 w-full rounded-xl bg-pink-600 px-5 py-4 text-lg font-black text-white disabled:opacity-60">🖼️ {busy ? "Generating..." : "Generate Recognition Image"}</button><p className="mt-3 text-center text-sm text-slate-400">One image for both Instagram & WhatsApp.</p>{message && <div className="mt-4 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}</div></section><aside className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"><h2 className="text-2xl font-black">Preview – Recognition Image</h2><p className="mt-1 text-slate-300">One image for Instagram post & WhatsApp group</p><div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/40">{imageDataUrl ? <img src={imageDataUrl} alt="Recognition preview" className="w-full" /> : <div className="grid aspect-[4/5] place-items-center p-8 text-center text-slate-400"><div><p className="text-5xl">⭐</p><p className="mt-4 font-bold">Generate the recognition image to preview it here.</p></div></div>}</div><div className="mt-5 grid gap-3"><button onClick={copyCaption} className="rounded-xl bg-pink-600 px-5 py-4 text-center font-black text-white">📋 Copy Instagram Caption</button>{imageDataUrl && <a href={imageDataUrl} download={`sdtv-volunteer-recognition-${fmt(start).replace(/\s/g, "-")}.png`} className="rounded-xl bg-slate-900 px-5 py-4 text-center font-black text-white">⬇️ Download Image</a>}<a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="rounded-xl bg-pink-600 px-5 py-4 text-center font-black text-white">📸 Post to Instagram</a><a href={whatsappGroupUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-green-600 px-5 py-4 text-center font-black text-white">🟢 Share to WhatsApp Group</a></div><div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4"><p className="font-black">Instagram Caption</p><textarea value={caption} readOnly rows={9} className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" /></div></aside></div>}</div></main>;
}

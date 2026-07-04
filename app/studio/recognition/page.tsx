"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const whatsappGroupUrl = "https://chat.whatsapp.com/FOP04oZJWEOLgTMJVJPiVt";

type Volunteer = {
  key: string;
  name: string;
  email: string;
  photo?: string;
  events: string[];
  count: number;
  handle?: string;
};

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

function fmt(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function cleanHandle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function safeName(email: string, fallback: string) {
  if (fallback && fallback !== email) return fallback;
  return email ? email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "SDTV Volunteer";
}

export default function StudioRecognitionPage() {
  const { start, end } = useMemo(() => lastWeekRange(), []);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Checking Studio access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [handlesText, setHandlesText] = useState("");
  const [thankMessage, setThankMessage] = useState("Huge thank you to our amazing SDTV volunteers for covering community stories last week. Your time, energy, and passion help us celebrate the people and events that bring our community together.");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const canAccess = Boolean(user && isAdminRole(role));

  const handleList = useMemo(() => handlesText.split(/[\n,]/).map(cleanHandle).filter(Boolean), [handlesText]);

  const caption = useMemo(() => {
    const names = volunteers.map((v) => v.name).join(", ");
    const events = Array.from(new Set(volunteers.flatMap((v) => v.events))).slice(0, 8);
    return [
      "✨ SDTV Volunteer Recognition",
      "",
      thankMessage,
      "",
      names ? `Recognizing: ${names}` : "Recognizing our SDTV volunteer team.",
      events.length ? `Covered last week: ${events.join(" • ")}` : "Thank you for supporting SDTV coverage last week.",
      handleList.length ? `\n${handleList.join(" ")}` : "",
      "",
      "#SeattleDesiTV #SDTVVolunteers #SeattleEvents #DesiCommunity #CommunityStories #PNWDesi",
    ].filter(Boolean).join("\n");
  }, [volunteers, thankMessage, handleList]);

  async function loadData() {
    setLoading(true);
    setMessage("Checking Studio access...");
    const auth = await supabase.auth.getUser();
    const currentUser = auth.data?.user || null;
    setUser(currentUser);
    if (!currentUser) {
      setRole("");
      setMessage("Please login as a Studio admin.");
      setLoading(false);
      return;
    }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) {
      setMessage(`Studio admin access required. Current role: ${nextRole}`);
      setLoading(false);
      return;
    }

    const [assignments, profiles] = await Promise.all([
      supabase
        .from("event_crew_assignments")
        .select("id,user_id,user_email,event_title,completed_at,coverage_completed")
        .eq("coverage_completed", true)
        .gte("completed_at", start.toISOString())
        .lte("completed_at", end.toISOString())
        .order("completed_at", { ascending: false })
        .limit(500),
      supabase.from("volunteer_onboarding_submissions").select("user_id,email,full_name,photo_url"),
    ]);

    if (assignments.error) {
      setMessage(`Could not load last week coverage: ${assignments.error.message}`);
      setVolunteers([]);
      setLoading(false);
      return;
    }

    const byEmail: Record<string, any> = {};
    const byUser: Record<string, any> = {};
    (profiles.data || []).forEach((profile: any) => {
      if (profile.email) byEmail[String(profile.email).toLowerCase()] = profile;
      if (profile.user_id) byUser[String(profile.user_id)] = profile;
    });

    const map: Record<string, Volunteer> = {};
    (assignments.data || []).forEach((row: any) => {
      const profile = byUser[String(row.user_id || "")] || byEmail[String(row.user_email || "").toLowerCase()] || {};
      const email = profile.email || row.user_email || "";
      const key = email || row.user_id || row.id;
      if (!map[key]) map[key] = { key, email, name: safeName(email, profile.full_name || email), photo: profile.photo_url || "", events: [], count: 0 };
      map[key].count += 1;
      if (row.event_title && !map[key].events.includes(row.event_title)) map[key].events.push(row.event_title);
    });

    setVolunteers(Object.values(map).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)));
    setMessage("");
    setLoading(false);
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setMessage("Instagram caption copied.");
  }

  async function generateImage() {
    setBusy(true);
    setMessage("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create image.");

      const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
      gradient.addColorStop(0, "#0f172a");
      gradient.addColorStop(0.45, "#3b0a2a");
      gradient.addColorStop(1, "#020617");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1350);

      ctx.fillStyle = "rgba(245,158,11,0.22)";
      ctx.beginPath();
      ctx.arc(920, 120, 260, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(110, 1260, 300, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f9a8d4";
      ctx.font = "900 34px Arial";
      ctx.textAlign = "center";
      ctx.fillText("SEATTLE DESI TV", 540, 105);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 72px Arial";
      ctx.fillText("Volunteer Recognition", 540, 190);
      ctx.fillStyle = "#fde68a";
      ctx.font = "700 34px Arial";
      ctx.fillText(`${fmt(start)} - ${fmt(end)}`, 540, 245);

      ctx.fillStyle = "rgba(255,255,255,0.94)";
      roundRect(ctx, 80, 310, 920, 735, 38);
      ctx.fill();

      ctx.textAlign = "left";
      ctx.fillStyle = "#0f172a";
      ctx.font = "900 42px Arial";
      ctx.fillText("Thank you for covering our community stories", 125, 385);
      ctx.fillStyle = "#475569";
      ctx.font = "500 27px Arial";
      wrapText(ctx, thankMessage, 125, 438, 830, 38, 4);

      const people = volunteers.slice(0, 8);
      let y = 610;
      people.forEach((v, index) => {
        ctx.fillStyle = index < 3 ? "#fdf2f8" : "#f8fafc";
        roundRect(ctx, 125, y - 34, 830, 78, 24);
        ctx.fill();
        ctx.fillStyle = index < 3 ? "#be185d" : "#334155";
        ctx.font = "900 34px Arial";
        ctx.fillText(`#${index + 1}`, 155, y + 14);
        ctx.fillStyle = "#0f172a";
        ctx.font = "900 32px Arial";
        ctx.fillText(v.name, 235, y + 2);
        ctx.fillStyle = "#64748b";
        ctx.font = "700 22px Arial";
        const eventText = v.events.slice(0, 2).join(" • ") || `${v.count} coverage item(s)`;
        ctx.fillText(eventText.length > 58 ? `${eventText.slice(0, 55)}...` : eventText, 235, y + 31);
        y += 88;
      });

      if (!people.length) {
        ctx.fillStyle = "#475569";
        ctx.font = "700 34px Arial";
        ctx.fillText("No completed coverage found for last week yet.", 125, 650);
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 38px Arial";
      ctx.fillText("Thank you, SDTV Volunteers!", 540, 1130);
      ctx.fillStyle = "#f9a8d4";
      ctx.font = "700 28px Arial";
      ctx.fillText("@seattledesitv  •  seattledesitv.com", 540, 1182);
      ctx.fillStyle = "#fde68a";
      ctx.font = "900 30px Arial";
      ctx.fillText("#SeattleDesiTV #SDTVVolunteers #CommunityStories", 540, 1242);

      const url = canvas.toDataURL("image/png");
      setImageDataUrl(url);
      setMessage("Recognition image generated. Download it and share in WhatsApp.");
    } catch (error: any) {
      setMessage(error?.message || "Could not generate image.");
    } finally {
      setBusy(false);
    }
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
    const words = text.split(" ");
    let line = "";
    let lines = 0;
    for (const word of words) {
      const testLine = `${line}${word} `;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line.trim(), x, y);
        line = `${word} `;
        y += lineHeight;
        lines += 1;
        if (lines >= maxLines) return;
      } else {
        line = testLine;
      }
    }
    if (line && lines < maxLines) ctx.fillText(line.trim(), x, y);
  }

  useEffect(() => { loadData(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">Studio Recognition</p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">Volunteer Recognition Post</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Create an Instagram thank-you caption and WhatsApp-ready image for volunteers who completed coverage last week.</p>
          </div>
          <button onClick={loadData} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button>
        </div>

        {loading && <div className="rounded-2xl bg-white/10 p-6 font-bold">{message || "Loading..."}</div>}
        {!loading && !canAccess && <div className="max-w-xl rounded-2xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Studio Access</h2><p className="mt-3 text-gray-600">{message}</p><a href="/login" className="mt-5 inline-block rounded-xl bg-pink-600 px-5 py-3 font-bold text-white">Go to Login</a></div>}

        {!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-black uppercase tracking-wide text-pink-600">Last week coverage</p>
                <h2 className="mt-2 text-3xl font-black">{fmt(start)} - {fmt(end)}</h2>
                <p className="mt-2 text-gray-600">{volunteers.length} volunteer(s) found from completed coverage records.</p>
              </div>
              <a href={whatsappGroupUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-green-600 px-5 py-3 text-center font-black text-white">Open WhatsApp Group</a>
            </div>

            <div ref={cardRef} className="mt-6 rounded-3xl bg-gradient-to-br from-slate-950 via-pink-950 to-slate-900 p-6 text-white">
              <p className="font-black uppercase tracking-[0.25em] text-pink-200">Seattle Desi TV</p>
              <h3 className="mt-2 text-3xl font-black">Thank You, Volunteers!</h3>
              <p className="mt-3 text-slate-200">{thankMessage}</p>
              <div className="mt-5 grid gap-3">
                {volunteers.map((person, index) => <div key={person.key} className="rounded-2xl bg-white/95 p-4 text-slate-950">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-pink-600">#{index + 1} · {person.count} coverage item(s)</p>
                      <h4 className="text-xl font-black">{person.name}</h4>
                      <p className="text-sm font-bold text-gray-600">{person.events.slice(0, 3).join(" • ") || person.email}</p>
                    </div>
                  </div>
                </div>)}
                {!volunteers.length && <div className="rounded-2xl bg-white/95 p-5 text-slate-950">No completed coverage found for last week yet.</div>}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-gray-600">Thank-you message</span>
                <textarea value={thankMessage} onChange={(event) => setThankMessage(event.target.value)} rows={4} className="rounded-xl border px-4 py-3 outline-none focus:border-pink-500" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-gray-600">Instagram handles to tag</span>
                <textarea value={handlesText} onChange={(event) => setHandlesText(event.target.value)} rows={3} placeholder="@volunteer1, @volunteer2 or one per line" className="rounded-xl border px-4 py-3 outline-none focus:border-pink-500" />
              </label>
              <div className="flex flex-wrap gap-3">
                <button onClick={copyCaption} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Copy Instagram Caption</button>
                <button onClick={generateImage} disabled={busy} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">{busy ? "Generating..." : "Generate WhatsApp Image"}</button>
              </div>
              {message && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <h3 className="text-2xl font-black">Instagram Caption</h3>
              <textarea value={caption} readOnly rows={15} className="mt-4 w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm font-semibold leading-6" />
              <button onClick={copyCaption} className="mt-3 w-full rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Copy Caption</button>
            </section>

            <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <h3 className="text-2xl font-black">WhatsApp Image</h3>
              <p className="mt-2 text-sm text-gray-600">Generate the image, download it, then upload it in the SDTV WhatsApp group.</p>
              {imageDataUrl ? <div className="mt-4 space-y-3"><img src={imageDataUrl} alt="Volunteer recognition share image" className="rounded-2xl border" /><a href={imageDataUrl} download={`sdtv-volunteer-recognition-${fmt(start).replace(/\s/g, "-")}.png`} className="block rounded-xl bg-pink-600 px-5 py-3 text-center font-black text-white">Download Image</a><a href={whatsappGroupUrl} target="_blank" rel="noreferrer" className="block rounded-xl bg-green-600 px-5 py-3 text-center font-black text-white">Open WhatsApp Group</a></div> : <button onClick={generateImage} disabled={busy} className="mt-4 w-full rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">Generate Image</button>}
            </section>
          </aside>
        </div>}
      </div>
    </main>
  );
}

"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || "production").toLowerCase();

type Box = { x: number; y: number; w: number; h: number };

function normalizeHandle(value: string) { const v = value.trim(); return v ? v.startsWith("@") ? v : `@${v}` : ""; }
function parseHandles(value: string) { return value.split(/[\n,]/).map(normalizeHandle).filter(Boolean); }
function humanizeFileName(name: string) { return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim(); }
function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => resolve(img); img.onerror = () => reject(new Error("Could not load image.")); img.src = src; }); }
function parseMaybeJsonText(value: any) { try { return JSON.parse(String(value || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()); } catch { const m = String(value || "").match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]); } catch { return null; } } }
function buildPostCaption(data: any, handles: string[]) {
  const details = data?.eventDetails || data?.event || {};
  const orgs = (Array.isArray(data?.detectedOrganizations) ? data.detectedOrganizations : data?.detectedOrganizations ? [data.detectedOrganizations] : []).filter((x: string) => !/seattle desi tv/i.test(String(x)));
  const title = details.title || details.eventTitle || details.eventName || data?.title || "Community Event";
  const date = details.date ? `📅 ${details.date}` : "";
  const time = details.time ? `⏰ ${details.time}` : "";
  const place = details.venue || details.location ? `📍 ${[details.venue, details.location].filter(Boolean).join(", ")}` : "";
  const status = details.status ? `🎥 ${details.status}` : "";
  return [`✨ ${title}`, "", `Seattle Desi TV is proud to support ${orgs.length ? orgs.join(", ") : "this community moment"}. Watch and celebrate the energy, talent, and unforgettable moments from this special event.`, "", date, time, place, status, handles.length ? `With: ${handles.join(" ")}` : "", "", "Follow @seattledesitv for more community stories, events, and local highlights."].filter(Boolean).join("\n");
}
function captionFromResponse(data: any, handles: string[]) {
  let caption = String(data?.suggestedCaption || data?.caption || "").trim();
  if (caption.startsWith("{") || caption.includes('"suggestedCaption"')) { const parsed = parseMaybeJsonText(caption); if (parsed) caption = String(parsed.suggestedCaption || parsed.caption || "").trim(); }
  if (!caption || caption.length < 80 || caption.startsWith("{") || caption.includes('"extractedText"') || /proud to be a\s*$/i.test(caption)) caption = buildPostCaption(data, handles);
  const tags = Array.isArray(data?.suggestedHashtags) ? data.suggestedHashtags.join(" ") : "";
  return `${caption}${tags ? `\n\n${tags}` : ""}`.trim();
}
function scoreBox(ctx: CanvasRenderingContext2D, box: Box) {
  const sampleW = 80;
  const sampleH = Math.max(40, Math.round(sampleW * box.h / box.w));
  const data = ctx.getImageData(box.x, box.y, box.w, box.h);
  let contrast = 0, dark = 0, light = 0, sat = 0, count = 0;
  const stepX = Math.max(1, Math.floor(box.w / sampleW));
  const stepY = Math.max(1, Math.floor(box.h / sampleH));
  for (let y = 0; y < box.h; y += stepY) for (let x = 0; x < box.w; x += stepX) {
    const i = (y * box.w + x) * 4; const r = data.data[i], g = data.data[i + 1], b = data.data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b; const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (lum < 80) dark++; if (lum > 235) light++; sat += mx - mn; count++;
    if (x + stepX < box.w) { const j = (y * box.w + x + stepX) * 4; contrast += Math.abs(lum - (0.299 * data.data[j] + 0.587 * data.data[j + 1] + 0.114 * data.data[j + 2])); }
    if (y + stepY < box.h) { const j = ((y + stepY) * box.w + x) * 4; contrast += Math.abs(lum - (0.299 * data.data[j] + 0.587 * data.data[j + 1] + 0.114 * data.data[j + 2])); }
  }
  const noise = contrast / Math.max(1, count) + sat / Math.max(1, count);
  const edgePenalty = box.y < ctx.canvas.height * 0.12 ? 25 : 0;
  const textPenalty = dark / Math.max(1, count) * 100 + light / Math.max(1, count) * 20;
  return noise + textPenalty + edgePenalty;
}
function findBestLogoBox(ctx: CanvasRenderingContext2D, badgeW: number, badgeH: number): Box {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const margin = Math.round(Math.min(cw, ch) * 0.025);
  const candidates: Box[] = [];
  const cols = 5, rows = 8;
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = margin + Math.round(col * (cw - badgeW - margin * 2) / Math.max(1, cols - 1));
    const y = margin + Math.round(row * (ch - badgeH - margin * 2) / Math.max(1, rows - 1));
    candidates.push({ x, y, w: badgeW, h: badgeH });
  }
  candidates.push({ x: cw - badgeW - margin, y: margin, w: badgeW, h: badgeH }, { x: margin, y: margin, w: badgeW, h: badgeH }, { x: cw - badgeW - margin, y: ch - badgeH - margin, w: badgeW, h: badgeH }, { x: margin, y: ch - badgeH - margin, w: badgeW, h: badgeH });
  return candidates.sort((a, b) => scoreBox(ctx, a) - scoreBox(ctx, b))[0];
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export default function InstagramPublisherPage() {
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [publishing, setPublishing] = useState(false);
  const [user, setUser] = useState<any>(null), [role, setRole] = useState("general_public"), [imageUrl, setImageUrl] = useState(""), [imageFileName, setImageFileName] = useState(""), [postContext, setPostContext] = useState(""), [collaborators, setCollaborators] = useState(""), [caption, setCaption] = useState("Seattle Desi TV test post. #SeattleDesiTV #SeattleDesiCommunity"), [message, setMessage] = useState("Loading...");
  const [confirmed, setConfirmed] = useState(false), [result, setResult] = useState<any>(null), [analysis, setAnalysis] = useState<any>(null);
  const handles = useMemo(() => parseHandles(collaborators), [collaborators]);
  const canAccess = Boolean(user && isAdminRole(role));
  const canUpload = Boolean(cloudName && uploadPreset);

  async function init() { setLoading(true); const { data } = await supabase.auth.getUser(); const u = data?.user || null; setUser(u); if (!u) { setMessage("Please login as a Studio admin."); setLoading(false); return; } const r = await resolveUserRole(supabase, u); setRole(r); if (!isAdminRole(r)) { setMessage(`Instagram publishing requires admin access. Current role: ${r}`); setLoading(false); return; } setMessage(""); setLoading(false); }
  async function uploadToCloudinary(file: File | Blob, name: string) { if (!canUpload) throw new Error("Cloudinary upload is not configured in Vercel."); const fd = new FormData(); fd.append("file", file, name); fd.append("upload_preset", uploadPreset); fd.append("folder", appEnv === "staging" ? "sdtv/staging/instagram" : "sdtv/instagram"); const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd }); const json = await res.json().catch(() => ({})); if (!res.ok || !json.secure_url) throw new Error(json?.error?.message || "Cloudinary upload failed."); return json.secure_url as string; }
  async function uploadImage(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; setResult(null); setAnalysis(null); setMessage(""); setImageFileName(file.name); if (!file.type.startsWith("image/")) { setMessage("Please choose an image file."); return; } setUploading(true); try { setImageUrl(await uploadToCloudinary(file, file.name)); setMessage("Image uploaded. Click AI Parse Flyer + Caption."); } catch (e: any) { setMessage(e?.message || "Image upload failed."); } finally { setUploading(false); } }
  async function analyzeFlyer() { if (!imageUrl.trim()) { setMessage("Upload an image or paste an image URL first."); return; } setBusy(true); setMessage(""); setResult(null); try { const { data } = await supabase.auth.getSession(); const token = data?.session?.access_token || ""; const res = await fetch("/api/instagram/analyze-image", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" }, body: JSON.stringify({ imageUrl: imageUrl.trim(), postContext: postContext.trim(), collaborators: handles }) }); const json = await res.json().catch(() => ({})); if (!res.ok || json.error) throw new Error(json.error || "AI flyer analysis failed."); const normalized = { ...json, suggestedCaption: captionFromResponse(json, handles) }; setAnalysis(normalized); setCaption(normalized.suggestedCaption); setMessage("AI generated a post-ready caption. Review and publish."); } catch (e: any) { setMessage(e?.message || "AI flyer analysis failed."); } finally { setBusy(false); } }
  function basicDraft() { const subject = postContext.trim() || humanizeFileName(imageFileName) || "this community moment"; setCaption([`✨ ${subject}`, "", "Seattle Desi TV is proud to spotlight the people, stories, and moments that bring our community together.", handles.length ? `With: ${handles.join(" ")}` : "", "", "Follow @seattledesitv for more community stories, events, and local highlights.", "", "#SeattleDesiTV #SeattleDesiCommunity #SeattleEvents #DesiCommunity #PNWDesi"].filter(Boolean).join("\n")); setMessage("Basic caption draft generated."); }
  async function addLogo() {
    if (!imageUrl.trim()) { setMessage("Upload an image first."); return; }
    if (analysis?.sdtvLogoDetected) { setMessage("SDTV logo already appears to be on this flyer, so no logo was added."); return; }
    setBusy(true); setMessage("");
    try {
      const [base, logo] = await Promise.all([loadImage(imageUrl), loadImage("/sdtv-logo.png")]);
      const canvas = document.createElement("canvas"); canvas.width = base.naturalWidth || base.width; canvas.height = base.naturalHeight || base.height;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Could not prepare image.");
      ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
      const logoW = Math.round(canvas.width * 0.14); const logoH = Math.round(logoW * (logo.naturalHeight / logo.naturalWidth));
      const pad = Math.round(canvas.width * 0.014); const labelH = Math.round(canvas.width * 0.035);
      const badgeW = logoW + pad * 2; const badgeH = logoH + pad * 2 + labelH;
      const box = findBestLogoBox(ctx, badgeW, badgeH);
      const radius = Math.round(badgeW * 0.12);
      ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.18)"; ctx.shadowBlur = Math.round(canvas.width * 0.012); ctx.shadowOffsetY = Math.round(canvas.width * 0.004);
      roundRect(ctx, box.x, box.y, badgeW, badgeH, radius); ctx.fillStyle = "rgba(255,255,255,0.72)"; ctx.fill(); ctx.restore();
      ctx.strokeStyle = "rgba(245,158,11,0.85)"; ctx.lineWidth = Math.max(1, Math.round(canvas.width * 0.003)); roundRect(ctx, box.x, box.y, badgeW, badgeH, radius); ctx.stroke();
      ctx.globalAlpha = 0.88; ctx.drawImage(logo, box.x + pad, box.y + pad, logoW, logoH); ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(15,23,42,0.92)"; ctx.font = `800 ${Math.max(10, Math.round(canvas.width * 0.022))}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("MEDIA PARTNER", box.x + badgeW / 2, box.y + logoH + pad * 2 + labelH / 2);
      const blob: Blob = await new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Could not export image.")), "image/png"));
      setImageUrl(await uploadToCloudinary(blob, "sdtv-media-partner-smart-logo.png"));
      setMessage("SDTV media partner logo added in the cleanest available space. Please review before publishing.");
    } catch (e: any) { setMessage(e?.message || "Could not add SDTV logo."); } finally { setBusy(false); }
  }
  async function publish() { setResult(null); setMessage(""); if (!imageUrl.trim()) return setMessage("Add a public HTTPS image URL or upload an image first."); if (!caption.trim()) return setMessage("Add a caption first."); if (!confirmed) return setMessage("Please check the confirmation box before publishing live to Instagram."); setPublishing(true); try { const { data } = await supabase.auth.getSession(); const token = data?.session?.access_token || ""; const res = await fetch("/api/instagram/publish", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" }, body: JSON.stringify({ imageUrl: imageUrl.trim(), caption: caption.trim(), collaborators: handles, postContext: postContext.trim() }) }); const json = await res.json().catch(() => ({})); if (!res.ok || json.error) throw new Error(json.error || "Instagram publish failed."); setResult(json); setMessage("Published to Instagram successfully."); } catch (e: any) { setMessage(e?.message || "Instagram publish failed."); } finally { setPublishing(false); } }
  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="mx-auto max-w-6xl px-6 py-10"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">Instagram Publishing</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Instagram Publisher</h1><p className="mt-3 max-w-3xl text-slate-300">Upload a flyer, let AI read it, generate a post-ready caption, add collaborator mentions, and optionally add the SDTV media partner logo.</p>{user?.email && <p className="mt-2 text-sm text-slate-400">Logged in as {user.email} · Role: {role} · Env: {appEnv}</p>}</div><a href="/studio/social-diagnostics" className="rounded-xl bg-white/10 px-5 py-3 text-center font-black text-white hover:bg-white/20">Open Diagnostics</a></div>{loading && <div className="rounded-2xl bg-white/10 p-6 font-bold">{message}</div>}{!loading && !canAccess && <div className="rounded-2xl bg-white p-8 font-bold text-slate-950">{message}</div>}{!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"><section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl"><div className="mb-6"><h2 className="text-3xl font-black">Create one image post</h2><p className="mt-2 text-sm leading-6 text-slate-600">AI parsing uses the configured Gemini key.</p></div><div className="grid gap-5"><label className="grid gap-2"><span className="text-sm font-black uppercase tracking-wide text-slate-600">Upload image</span><input type="file" accept="image/*" onChange={uploadImage} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" /><span className="text-xs font-bold text-slate-500">{canUpload ? "Image uploads use Cloudinary." : "Cloudinary env vars are missing; paste an image URL instead."}</span></label><label className="grid gap-2"><span className="text-sm font-black uppercase tracking-wide text-slate-600">Image URL</span><input value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setAnalysis(null); }} placeholder="https://.../image.jpg" className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" /></label>{imageUrl && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><img src={imageUrl} alt="Instagram post preview" className="max-h-[520px] w-full object-contain" /></div>}<label className="grid gap-2"><span className="text-sm font-black uppercase tracking-wide text-slate-600">Optional post context / prompt</span><textarea value={postContext} onChange={(e) => setPostContext(e.target.value)} rows={3} placeholder="Example: Post-event recap reel for this performance..." className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" /></label><label className="grid gap-2"><span className="text-sm font-black uppercase tracking-wide text-slate-600">Collaborators / handles to mention</span><textarea value={collaborators} onChange={(e) => setCollaborators(e.target.value)} rows={3} placeholder="@handle1, @handle2 or one per line" className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" /><span className="text-xs font-bold text-slate-500">This adds handles into the caption.</span></label><div className="flex flex-wrap gap-3"><button type="button" onClick={analyzeFlyer} disabled={busy || uploading} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-800 disabled:opacity-60">{busy ? "Working..." : "AI Parse Flyer + Caption"}</button><button type="button" onClick={basicDraft} className="rounded-xl bg-slate-100 px-5 py-3 font-black text-slate-950 hover:bg-slate-200">Basic Draft</button><button type="button" onClick={addLogo} disabled={busy || uploading || !imageUrl} className="rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60">Smart Add SDTV Logo</button>{handles.length > 0 && <div className="rounded-xl bg-pink-50 px-4 py-3 text-sm font-black text-pink-800">Mentions: {handles.join(" ")}</div>}</div><label className="grid gap-2"><span className="text-sm font-black uppercase tracking-wide text-slate-600">Caption</span><textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={11} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" /></label><label className="flex items-start gap-3 rounded-2xl bg-yellow-50 p-4 text-sm font-bold text-yellow-900"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-4 w-4" /><span>I understand this will publish live to the connected Instagram account.</span></label>{message && <div className={`${result?.ok ? "bg-green-100 text-green-900" : "bg-yellow-100 text-yellow-900"} rounded-2xl p-4 text-sm font-bold`}>{message}</div>}<button onClick={publish} disabled={publishing || uploading || busy} className="rounded-xl bg-pink-600 px-5 py-4 text-lg font-black text-white shadow-lg shadow-pink-900/20 disabled:cursor-not-allowed disabled:opacity-60">{uploading ? "Uploading..." : publishing ? "Publishing..." : "Publish to Instagram"}</button></div></section><aside className="space-y-6"><section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6"><h3 className="text-2xl font-black">Workflow</h3><div className="mt-4 space-y-3 text-sm leading-6 text-slate-300"><p>1. Upload flyer.</p><p>2. Click AI Parse Flyer + Caption.</p><p>3. Use Smart Add SDTV Logo only if missing.</p><p>4. Review and publish.</p></div></section>{analysis && <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl"><h3 className="text-2xl font-black">AI Flyer Readout</h3><div className="mt-4 grid gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">SDTV Logo Detected</p><p className="font-bold">{analysis.sdtvLogoDetected ? "Yes" : "Not sure / No"}</p></div>{analysis.extractedText && <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Extracted Flyer Text</p><p className="whitespace-pre-wrap font-bold">{Array.isArray(analysis.extractedText) ? analysis.extractedText.join("\n") : analysis.extractedText}</p></div>}</div></section>}<section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6"><h3 className="text-2xl font-black">Logo note</h3><p className="mt-4 text-sm leading-6 text-slate-300">Smart logo placement checks if AI already detected the logo, then places a smaller transparent SDTV media partner badge in the cleanest available area.</p></section>{result && <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl"><h3 className="text-2xl font-black">Publish Result</h3><div className="mt-4 grid gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Source</p><p className="break-words font-bold">{result.source || "—"}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Media ID</p><p className="break-words font-bold">{result.mediaId || "—"}</p></div>{result.permalink && <a href={result.permalink} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-950 px-4 py-3 text-center font-black text-white">Open Instagram Post</a>}</div></section>}</aside></div>}</div></main>;
}

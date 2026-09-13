"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || "production").toLowerCase();

function normalizeHandle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function parseHandles(value: string) {
  return value.split(/[\n,]/).map(normalizeHandle).filter(Boolean);
}

function humanizeFileName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function parseMaybeJsonText(value: any) {
  const text = String(value || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

function buildPostCaption(data: any, handles: string[]) {
  const details = data?.eventDetails || data?.event || {};
  const orgs = (Array.isArray(data?.detectedOrganizations) ? data.detectedOrganizations : data?.detectedOrganizations ? [data.detectedOrganizations] : []).filter((x: string) => !/seattle desi tv/i.test(String(x)));
  const title = details.title || details.eventTitle || details.eventName || data?.title || "Community Event";
  const date = details.date ? `📅 ${details.date}` : "";
  const time = details.time ? `⏰ ${details.time}` : "";
  const place = details.venue || details.location ? `📍 ${[details.venue, details.location].filter(Boolean).join(", ")}` : "";
  const status = details.status ? `🎥 ${details.status}` : "";
  return [
    `✨ ${title}`,
    "",
    `Seattle Desi TV is proud to support ${orgs.length ? orgs.join(", ") : "this community moment"}. Watch and celebrate the energy, talent, and unforgettable moments from this special event.`,
    "",
    date,
    time,
    place,
    status,
    handles.length ? `With: ${handles.join(" ")}` : "",
    "",
    "Follow @seattledesitv for more community stories, events, and local highlights.",
  ].filter(Boolean).join("\n");
}

function captionFromResponse(data: any, handles: string[]) {
  let caption = String(data?.suggestedCaption || data?.caption || "").trim();
  if (caption.startsWith("{") || caption.includes('"suggestedCaption"')) {
    const parsed = parseMaybeJsonText(caption);
    if (parsed) caption = String(parsed.suggestedCaption || parsed.caption || "").trim();
  }
  if (!caption || caption.length < 80 || caption.startsWith("{") || caption.includes('"extractedText"') || /proud to be a\s*$/i.test(caption)) {
    caption = buildPostCaption(data, handles);
  }
  const tags = Array.isArray(data?.suggestedHashtags) ? data.suggestedHashtags.join(" ") : "";
  return `${caption}${tags ? `\n\n${tags}` : ""}`.trim();
}

export default function InstagramPublisherPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [videoDeleteToken, setVideoDeleteToken] = useState("");
  const [postContext, setPostContext] = useState("");
  const [collaborators, setCollaborators] = useState("");
  const [caption, setCaption] = useState("Seattle Desi TV test post. #SeattleDesiTV #SeattleDesiCommunity");
  const [message, setMessage] = useState("Loading...");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  const handles = useMemo(() => parseHandles(collaborators), [collaborators]);
  const canAccess = Boolean(user && isAdminRole(role));
  const canUpload = Boolean(cloudName && uploadPreset);

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) {
      setMessage("Please login as a Studio admin.");
      setLoading(false);
      return;
    }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) {
      setMessage(`Instagram publishing requires admin access. Current role: ${nextRole}`);
      setLoading(false);
      return;
    }
    setMessage("");
    setLoading(false);
  }

  async function uploadToCloudinary(file: File | Blob, name: string, resourceType: "image" | "video") {
    if (!canUpload) throw new Error("Cloudinary upload is not configured in Vercel.");
    const formData = new FormData();
    formData.append("file", file, name);
    formData.append("upload_preset", uploadPreset);
    const baseFolder = appEnv === "staging" ? "sdtv/staging" : "sdtv";
    formData.append("folder", resourceType === "video" ? `${baseFolder}/instagram-temp` : `${baseFolder}/instagram`);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: "POST", body: formData });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.secure_url) throw new Error(json?.error?.message || "Cloudinary upload failed.");
    return {
      secureUrl: json.secure_url as string,
      deleteToken: String(json.delete_token || ""),
    };
  }

  async function deleteTemporaryCloudinaryVideo(deleteToken: string) {
    const response = await fetch("https://api.cloudinary.com/v1_1/delete_by_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: deleteToken }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json?.result !== "ok") throw new Error(json?.error?.message || "Cloudinary temporary-video cleanup failed.");
  }

  async function uploadMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setResult(null);
    setAnalysis(null);
    setMessage("");
    setImageFileName(file.name);
    setVideoDeleteToken("");
    const expectedPrefix = mediaType === "video" ? "video/" : "image/";
    if (!file.type.startsWith(expectedPrefix)) {
      setMessage(`Please choose a ${mediaType} file.`);
      return;
    }
    setUploading(true);
    try {
      const upload = await uploadToCloudinary(file, file.name, mediaType);
      setImageUrl(upload.secureUrl);
      if (mediaType === "video") setVideoDeleteToken(upload.deleteToken);
      setMessage(mediaType === "image"
        ? "Image uploaded. Click AI Parse Flyer + Caption."
        : upload.deleteToken
          ? "Video uploaded temporarily. It will be removed from Cloudinary after Instagram confirms the Reel was published."
          : "Video uploaded. Enable Return deletion token in the Cloudinary unsigned upload preset to remove it automatically after publishing.");
    } catch (error: any) {
      setMessage(error?.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function analyzeFlyer() {
    if (mediaType === "video") {
      setMessage("AI flyer parsing is available for images only. Use Basic Draft or write the Reel caption directly.");
      return;
    }
    if (!imageUrl.trim()) {
      setMessage("Upload an image or paste an image URL first.");
      return;
    }
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || "";
      const response = await fetch("/api/instagram/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ imageUrl: imageUrl.trim(), postContext: postContext.trim(), collaborators: handles }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.error) throw new Error(json.error || "AI flyer analysis failed.");
      const normalized = { ...json, suggestedCaption: captionFromResponse(json, handles) };
      setAnalysis(normalized);
      setCaption(normalized.suggestedCaption);
      setMessage("AI generated a post-ready caption. Review and publish.");
    } catch (error: any) {
      setMessage(error?.message || "AI flyer analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  function basicDraft() {
    const subject = postContext.trim() || humanizeFileName(imageFileName) || "this community moment";
    setCaption([
      `✨ ${subject}`,
      "",
      "Seattle Desi TV is proud to spotlight the people, stories, and moments that bring our community together.",
      handles.length ? `With: ${handles.join(" ")}` : "",
      "",
      "Follow @seattledesitv for more community stories, events, and local highlights.",
      "",
      "#SeattleDesiTV #SeattleDesiCommunity #SeattleEvents #DesiCommunity #PNWDesi",
    ].filter(Boolean).join("\n"));
    setMessage("Basic caption draft generated.");
  }

  async function publish() {
    setResult(null);
    setMessage("");
    if (!imageUrl.trim()) return setMessage(`Add a public HTTPS ${mediaType} URL or upload a ${mediaType} first.`);
    if (!caption.trim()) return setMessage("Add a caption first.");
    if (!confirmed) return setMessage("Please check the confirmation box before publishing live to Instagram.");
    setPublishing(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || "";
      const response = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify(mediaType === "video" ? { mediaType, videoUrl: imageUrl.trim(), caption: caption.trim(), collaborators: handles, postContext: postContext.trim() } : { mediaType, imageUrl: imageUrl.trim(), caption: caption.trim(), collaborators: handles, postContext: postContext.trim() }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.error) throw new Error(json.error || "Instagram publish failed.");
      if (mediaType === "video" && videoDeleteToken) {
        try {
          await deleteTemporaryCloudinaryVideo(videoDeleteToken);
          setResult({ ...json, temporaryVideoCleanup: "deleted" });
          setVideoDeleteToken("");
          setMessage("Published to Instagram as a Reel successfully. The temporary Cloudinary video was deleted.");
        } catch (cleanupError: any) {
          setResult({ ...json, temporaryVideoCleanup: "failed", cleanupError: cleanupError?.message || "Cleanup failed." });
          setMessage("The Reel was published, but the temporary Cloudinary video could not be deleted. You can remove it from the instagram-temp folder.");
        }
      } else {
        setResult({ ...json, ...(mediaType === "video" ? { temporaryVideoCleanup: "not_configured" } : {}) });
        setMessage(mediaType === "video"
          ? "Published to Instagram as a Reel successfully. Automatic Cloudinary cleanup is not configured for this upload."
          : "Published to Instagram successfully.");
      }
    } catch (error: any) {
      setMessage(error?.message || "Instagram publish failed.");
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">Instagram Publishing</p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">Instagram Publisher</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Publish an image post or upload a video and publish it as a Reel.</p>
            {user?.email && <p className="mt-2 text-sm text-slate-400">Logged in as {user.email} · Role: {role} · Env: {appEnv}</p>}
          </div>
          <a href="/studio/social-diagnostics" className="rounded-xl bg-white/10 px-5 py-3 text-center font-black text-white hover:bg-white/20">Open Diagnostics</a>
        </div>

        {loading && <div className="rounded-2xl bg-white/10 p-6 font-bold">{message}</div>}
        {!loading && !canAccess && <div className="rounded-2xl bg-white p-8 font-bold text-slate-950">{message}</div>}

        {!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-3xl font-black">Create an Instagram post</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Images support AI flyer parsing. Videos publish as Reels.</p>
            </div>

            <div className="grid gap-5">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
                <button type="button" onClick={() => { setMediaType("image"); setImageUrl(""); setImageFileName(""); setVideoDeleteToken(""); setAnalysis(null); setResult(null); setConfirmed(false); }} className={`rounded-xl px-4 py-3 font-black ${mediaType === "image" ? "bg-white text-pink-700 shadow" : "text-slate-600"}`}>Photo</button>
                <button type="button" onClick={() => { setMediaType("video"); setImageUrl(""); setImageFileName(""); setVideoDeleteToken(""); setAnalysis(null); setResult(null); setConfirmed(false); }} className={`rounded-xl px-4 py-3 font-black ${mediaType === "video" ? "bg-white text-pink-700 shadow" : "text-slate-600"}`}>Video / Reel</button>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-slate-600">Upload {mediaType}</span>
                <input key={mediaType} type="file" accept={mediaType === "video" ? "video/mp4,video/quicktime,.mp4,.mov" : "image/*"} onChange={uploadMedia} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" />
                <span className="text-xs font-bold text-slate-500">{canUpload
                  ? mediaType === "video"
                    ? "Use an MP4 with H.264 video and AAC audio for the most reliable Reel processing. Cloudinary provides Instagram with a public HTTPS URL."
                    : "Image uploads use Cloudinary and provide Instagram with a public HTTPS URL."
                  : `Cloudinary env vars are missing; paste a public ${mediaType} URL instead.`}</span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-slate-600">{mediaType === "video" ? "Video" : "Image"} URL</span>
                <input value={imageUrl} onChange={(event) => { setImageUrl(event.target.value); setVideoDeleteToken(""); setAnalysis(null); }} placeholder={mediaType === "video" ? "https://.../video.mp4" : "https://.../image.jpg"} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" />
              </label>

              {imageUrl && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">{mediaType === "video" ? <video src={imageUrl} controls playsInline className="max-h-[520px] w-full object-contain">Your browser cannot preview this video.</video> : <img src={imageUrl} alt="Instagram post preview" className="max-h-[520px] w-full object-contain" />}</div>}

              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-slate-600">Optional post context / prompt</span>
                <textarea value={postContext} onChange={(event) => setPostContext(event.target.value)} rows={3} placeholder="Example: Post-event recap reel for this performance..." className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-slate-600">Collaborators / handles to mention</span>
                <textarea value={collaborators} onChange={(event) => setCollaborators(event.target.value)} rows={3} placeholder="@handle1, @handle2 or one per line" className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" />
                <span className="text-xs font-bold text-slate-500">This adds handles into the caption.</span>
              </label>

              <div className="flex flex-wrap gap-3">
                {mediaType === "image" && <button type="button" onClick={analyzeFlyer} disabled={busy || uploading} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-800 disabled:opacity-60">{busy ? "Working..." : "AI Parse Flyer + Caption"}</button>}
                <button type="button" onClick={basicDraft} className="rounded-xl bg-slate-100 px-5 py-3 font-black text-slate-950 hover:bg-slate-200">Basic Draft</button>
                {handles.length > 0 && <div className="rounded-xl bg-pink-50 px-4 py-3 text-sm font-black text-pink-800">Mentions: {handles.join(" ")}</div>}
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-slate-600">Caption</span>
                <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={11} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" />
              </label>

              <label className="flex items-start gap-3 rounded-2xl bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4" />
                <span>I understand this will publish live to the connected Instagram account.</span>
              </label>

              {message && <div className={`${result?.ok ? "bg-green-100 text-green-900" : "bg-yellow-100 text-yellow-900"} rounded-2xl p-4 text-sm font-bold`}>{message}</div>}

              <button onClick={publish} disabled={publishing || uploading || busy} className="rounded-xl bg-pink-600 px-5 py-4 text-lg font-black text-white shadow-lg shadow-pink-900/20 disabled:cursor-not-allowed disabled:opacity-60">{uploading ? "Uploading..." : publishing ? mediaType === "video" ? "Processing & Publishing Reel..." : "Publishing..." : mediaType === "video" ? "Publish Reel to Instagram" : "Publish Photo to Instagram"}</button>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
              <h3 className="text-2xl font-black">Workflow</h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <p>1. Choose Photo or Video / Reel.</p>
                <p>2. Upload the media and prepare the caption.</p>
                <p>3. Review the generated caption.</p>
                <p>4. Confirm and publish.</p>
              </div>
            </section>

            {analysis && <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <h3 className="text-2xl font-black">AI Flyer Readout</h3>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">SDTV Logo Detected</p><p className="font-bold">{analysis.sdtvLogoDetected ? "Yes" : "Not sure / No"}</p></div>
                {analysis.extractedText && <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Extracted Flyer Text</p><p className="whitespace-pre-wrap font-bold">{Array.isArray(analysis.extractedText) ? analysis.extractedText.join("\n") : analysis.extractedText}</p></div>}
              </div>
            </section>}

            {result && <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <h3 className="text-2xl font-black">Publish Result</h3>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Source</p><p className="break-words font-bold">{result.source || "—"}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Media ID</p><p className="break-words font-bold">{result.mediaId || "—"}</p></div>
                {result.permalink && <a href={result.permalink} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-950 px-4 py-3 text-center font-black text-white">Open Instagram Post</a>}
              </div>
            </section>}
          </aside>
        </div>}
      </div>
    </main>
  );
}

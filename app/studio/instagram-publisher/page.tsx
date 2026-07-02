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
  return value
    .split(/[\n,]/)
    .map(normalizeHandle)
    .filter(Boolean);
}

function humanizeFileName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function InstagramPublisherPage() {
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [postContext, setPostContext] = useState("");
  const [collaborators, setCollaborators] = useState("");
  const [caption, setCaption] = useState("Seattle Desi TV test post. #SeattleDesiTV #SeattleDesiCommunity");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("Loading...");
  const [result, setResult] = useState<any>(null);

  const canAccess = Boolean(user && isAdminRole(role));
  const collaboratorHandles = useMemo(() => parseHandles(collaborators), [collaborators]);
  const canUpload = Boolean(cloudName && uploadPreset);

  async function init() {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user || null;
    setUser(currentUser);
    if (!currentUser) {
      setMessage("Please login as a Studio admin to test Instagram publishing.");
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

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setResult(null);
    setMessage("");
    setImageFileName(file.name);

    if (!canUpload) {
      setMessage("Cloudinary upload is not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in Vercel.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", appEnv === "staging" ? "sdtv/staging/instagram" : "sdtv/instagram");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.secure_url) throw new Error(data?.error?.message || "Cloudinary upload failed.");
      setImageUrl(data.secure_url);
      setMessage("Image uploaded. Review or generate the caption before publishing.");
    } catch (error: any) {
      setMessage(error?.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function generateCaptionDraft() {
    const titleFromFile = humanizeFileName(imageFileName);
    const context = postContext.trim();
    const handles = collaboratorHandles.join(" ");
    const subject = context || titleFromFile || "this community moment";

    const draft = [
      `✨ ${subject}`,
      "",
      "Seattle Desi TV is proud to spotlight the people, stories, and moments that bring our community together.",
      handles ? `With: ${handles}` : "",
      "",
      "Follow @seattledesitv for more community stories, events, and local highlights.",
      "",
      "#SeattleDesiTV #SeattleDesiCommunity #SeattleEvents #DesiCommunity #PNWDesi",
    ].filter(Boolean).join("\n");

    setCaption(draft);
    setMessage("Caption draft generated. Please review before publishing.");
  }

  async function publish() {
    setResult(null);
    setMessage("");

    if (!imageUrl.trim()) {
      setMessage("Add a public HTTPS image URL or upload an image first.");
      return;
    }
    if (!caption.trim()) {
      setMessage("Add a caption first.");
      return;
    }
    if (!confirmed) {
      setMessage("Please check the confirmation box before publishing live to Instagram.");
      return;
    }

    setPublishing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || "";
      const response = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          imageUrl: imageUrl.trim(),
          caption: caption.trim(),
          collaborators: collaboratorHandles,
          postContext: postContext.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) throw new Error(data.error || "Instagram publish failed.");
      setResult(data);
      setMessage("Published to Instagram successfully.");
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
            <p className="mt-3 max-w-3xl text-slate-300">Admin-only page for preparing and publishing one image post to the connected SDTV Instagram account. Upload an image, generate a caption draft, add collaborators to mention, then publish.</p>
            {user?.email && <p className="mt-2 text-sm text-slate-400">Logged in as {user.email} · Role: {role} · Env: {appEnv}</p>}
          </div>
          <a href="/studio/social-diagnostics" className="rounded-xl bg-white/10 px-5 py-3 text-center font-black text-white hover:bg-white/20">Open Diagnostics</a>
        </div>

        {loading && <div className="rounded-2xl bg-white/10 p-6 font-bold">{message}</div>}
        {!loading && !canAccess && <div className="rounded-2xl bg-white p-8 font-bold text-slate-950">{message}</div>}

        {!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-3xl font-black">Create one image post</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Upload to Cloudinary or paste a public HTTPS image URL. Instagram requires a publicly reachable image URL.</p>
            </div>

            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-slate-600">Upload image</span>
                <input type="file" accept="image/*" onChange={uploadImage} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" />
                <span className="text-xs font-bold text-slate-500">{canUpload ? "Image uploads use the configured Cloudinary preset." : "Cloudinary upload env vars are missing; paste an image URL instead."}</span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-slate-600">Image URL</span>
                <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://.../image.jpg" className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" />
              </label>

              {imageUrl && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img src={imageUrl} alt="Instagram post preview" className="max-h-[520px] w-full object-contain" />
              </div>}

              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-slate-600">Post context / prompt</span>
                <textarea value={postContext} onChange={(event) => setPostContext(event.target.value)} rows={3} placeholder="Example: Sekhar Master and Vinni exclusive Seattle performance thumbnail, energetic Tollywood dance moment..." className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-slate-600">Collaborators / handles to mention</span>
                <textarea value={collaborators} onChange={(event) => setCollaborators(event.target.value)} rows={3} placeholder="@handle1, @handle2 or one per line" className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" />
                <span className="text-xs font-bold text-slate-500">This v1 adds collaborator handles into the caption. True Instagram collab invitations can be added later if supported by your API permissions.</span>
              </label>

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={generateCaptionDraft} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-800">Generate Caption Draft</button>
                {collaboratorHandles.length > 0 && <div className="rounded-xl bg-pink-50 px-4 py-3 text-sm font-black text-pink-800">Mentions: {collaboratorHandles.join(" ")}</div>}
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-slate-600">Caption</span>
                <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={10} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" />
              </label>

              <label className="flex items-start gap-3 rounded-2xl bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4" />
                <span>I understand this will publish live to the connected Instagram account.</span>
              </label>

              {message && <div className={`${result?.ok ? "bg-green-100 text-green-900" : "bg-yellow-100 text-yellow-900"} rounded-2xl p-4 text-sm font-bold`}>{message}</div>}

              <button onClick={publish} disabled={publishing || uploading} className="rounded-xl bg-pink-600 px-5 py-4 text-lg font-black text-white shadow-lg shadow-pink-900/20 disabled:cursor-not-allowed disabled:opacity-60">
                {uploading ? "Uploading..." : publishing ? "Publishing..." : "Publish to Instagram"}
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
              <h3 className="text-2xl font-black">Before publishing</h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <p>1. Use a simple JPG or PNG image.</p>
                <p>2. Review the generated caption before publishing.</p>
                <p>3. Add collaborator handles if you want to mention partners in the caption.</p>
                <p>4. Confirm the checkbox because this posts live.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
              <h3 className="text-2xl font-black">Caption helper</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">The helper uses your image filename, post context, and collaborator handles to draft text. It does not replace human review.</p>
            </section>

            {result && <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <h3 className="text-2xl font-black">Publish Result</h3>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Source</p><p className="break-words font-bold">{result.source || "—"}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Creation ID</p><p className="break-words font-bold">{result.creationId || "—"}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Media ID</p><p className="break-words font-bold">{result.mediaId || "—"}</p></div>
                {result.collaborators?.length > 0 && <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Collaborators Mentioned</p><p className="break-words font-bold">{result.collaborators.join(" ")}</p></div>}
                {result.permalink && <a href={result.permalink} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-950 px-4 py-3 text-center font-black text-white">Open Instagram Post</a>}
              </div>
            </section>}
          </aside>
        </div>}
      </div>
    </main>
  );
}

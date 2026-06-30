"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

export default function InstagramPublisherPage() {
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("Seattle Desi TV test post. #SeattleDesiTV #SeattleDesiCommunity");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("Loading...");
  const [result, setResult] = useState<any>(null);

  const canAccess = Boolean(user && isAdminRole(role));

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

  async function publish() {
    setResult(null);
    setMessage("");

    if (!imageUrl.trim()) {
      setMessage("Add a public HTTPS image URL first.");
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
        body: JSON.stringify({ imageUrl: imageUrl.trim(), caption: caption.trim() }),
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
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">Instagram Test</p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">Instagram Publisher</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Admin-only test page for publishing one image post directly to the SDTV Instagram account. This first version does not save anything to the database.</p>
            {user?.email && <p className="mt-2 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}
          </div>
          <a href="/studio/social-diagnostics" className="rounded-xl bg-white/10 px-5 py-3 text-center font-black text-white hover:bg-white/20">Open Diagnostics</a>
        </div>

        {loading && <div className="rounded-2xl bg-white/10 p-6 font-bold">{message}</div>}
        {!loading && !canAccess && <div className="rounded-2xl bg-white p-8 font-bold text-slate-950">{message}</div>}

        {!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-3xl font-black">Publish one image</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Use a publicly reachable HTTPS image URL. For this test, upload an image somewhere public first, then paste the image URL here.</p>
            </div>

            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-slate-600">Image URL</span>
                <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://.../image.jpg" className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-slate-600">Caption</span>
                <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={8} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-pink-500" />
              </label>

              <label className="flex items-start gap-3 rounded-2xl bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4" />
                <span>I understand this will publish live to the connected Instagram account.</span>
              </label>

              {message && <div className={`${result?.ok ? "bg-green-100 text-green-900" : "bg-yellow-100 text-yellow-900"} rounded-2xl p-4 text-sm font-bold`}>{message}</div>}

              <button onClick={publish} disabled={publishing} className="rounded-xl bg-pink-600 px-5 py-4 text-lg font-black text-white shadow-lg shadow-pink-900/20 disabled:cursor-not-allowed disabled:opacity-60">
                {publishing ? "Publishing..." : "Publish to Instagram"}
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
              <h3 className="text-2xl font-black">Before testing</h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <p>1. Use a simple JPG or PNG image URL.</p>
                <p>2. Make sure the URL opens without login.</p>
                <p>3. Keep this as a test post until the API flow is confirmed.</p>
              </div>
            </section>

            {result && <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <h3 className="text-2xl font-black">Publish Result</h3>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Source</p><p className="break-words font-bold">{result.source || "—"}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Creation ID</p><p className="break-words font-bold">{result.creationId || "—"}</p></div>
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

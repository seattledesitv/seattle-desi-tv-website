"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

const defaultSocialRows = [
  { platform: "YouTube", followers: 0, views: 0, videos: 0, href: "https://www.youtube.com/@SeattleDesiTV" },
  { platform: "Instagram", followers: 0, views: 0, videos: 0, href: "https://instagram.com/seattledesitv" },
  { platform: "Facebook", followers: 0, views: 0, videos: 0, href: "https://facebook.com/seattledesitv" },
  { platform: "TikTok", followers: 0, views: 0, videos: 0, href: "" },
];

function formatDate(value?: string | null) {
  if (!value) return "Not updated yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not updated yet" : date.toLocaleString();
}

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString();
}

export default function StudioSocialStatsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading social stats...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [rows, setRows] = useState<any[]>([]);
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadRows() {
    const { data, error } = await supabase
      .from("social_media_stats")
      .select("platform,followers,views,videos,href,updated_at")
      .order("platform", { ascending: true });

    if (error) {
      setRows(defaultSocialRows);
      setActionMessage(`Could not load social_media_stats: ${error.message}`);
      return;
    }

    setRows(Array.isArray(data) && data.length > 0 ? data : defaultSocialRows);
  }

  async function init() {
    setLoading(true);
    setActionMessage("");
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) {
      setMessage("Please login to manage social media stats.");
      setLoading(false);
      return;
    }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) {
      setMessage(`Social stats management requires admin access. Current role: ${nextRole}`);
      setLoading(false);
      return;
    }
    await loadRows();
    setMessage("");
    setLoading(false);
  }

  function updateRow(index: number, field: string, value: any) {
    setRows((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }

  function addRow() {
    setRows((current) => [...current, { platform: "", followers: 0, views: 0, videos: 0, href: "" }]);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_row, i) => i !== index));
  }

  async function seedDefaults() {
    setActionMessage("Creating default social stat rows...");
    const { error } = await supabase.from("social_media_stats").upsert(defaultSocialRows, { onConflict: "platform" });
    if (error) {
      setActionMessage(`Could not seed defaults: ${error.message}`);
      return;
    }
    await loadRows();
    setActionMessage("Default social stat rows created/updated.");
  }

  async function saveRows() {
    setActionMessage("Saving social media stats...");
    const payload = rows
      .filter((row) => String(row.platform || "").trim())
      .map((row) => ({
        platform: String(row.platform || "").trim(),
        followers: Number(row.followers || 0),
        views: Number(row.views || 0),
        videos: Number(row.videos || 0),
        href: String(row.href || "").trim() || null,
        updated_at: new Date().toISOString(),
      }));

    const { error } = await supabase.from("social_media_stats").upsert(payload, { onConflict: "platform" });
    if (error) {
      setActionMessage(`Could not save social stats: ${error.message}`);
      return;
    }
    await loadRows();
    setActionMessage("Social media stats saved. Refresh the homepage to see the latest numbers.");
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-black uppercase tracking-wide text-pink-300">Website</p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">Social Media Stats</h1>
            <p className="mt-2 max-w-3xl text-slate-300">Update the follower, view, video, and link numbers shown in the homepage Social Reach section.</p>
            {user?.email && <p className="mt-2 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={init} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button>
            <a href="/" target="_blank" rel="noreferrer" className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Preview Homepage</a>
          </div>
        </div>

        {loading && <div className="rounded-2xl bg-white/10 p-6">{message}</div>}
        {!loading && !canAccess && <div className="rounded-2xl bg-white p-8 text-slate-950">{message}</div>}
        {!loading && canAccess && <div className="space-y-6">
          {actionMessage && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-white/10 p-5"><p className="text-3xl font-black">{rows.length}</p><p className="text-xs font-bold text-slate-300">Platforms</p></div>
            <div className="rounded-3xl bg-white/10 p-5"><p className="text-3xl font-black">{formatNumber(rows.reduce((sum, row) => sum + Number(row.followers || 0), 0))}</p><p className="text-xs font-bold text-slate-300">Total followers</p></div>
            <div className="rounded-3xl bg-white/10 p-5"><p className="text-3xl font-black">{formatNumber(rows.reduce((sum, row) => sum + Number(row.views || 0), 0))}</p><p className="text-xs font-bold text-slate-300">Total views</p></div>
            <div className="rounded-3xl bg-white/10 p-5"><p className="text-3xl font-black">{formatNumber(rows.reduce((sum, row) => sum + Number(row.videos || 0), 0))}</p><p className="text-xs font-bold text-slate-300">Total videos</p></div>
          </div>

          <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black">Stats Table</h2>
                <p className="mt-1 text-sm text-slate-600">These values are stored in the <b>social_media_stats</b> table and used by the homepage Social Reach cards.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={addRow} className="rounded-xl border px-4 py-2 font-black">Add Platform</button>
                <button onClick={seedDefaults} className="rounded-xl border px-4 py-2 font-black">Seed Defaults</button>
                <button onClick={saveRows} className="rounded-xl bg-pink-600 px-4 py-2 font-black text-white">Save Social Stats</button>
              </div>
            </div>

            <div className="grid gap-4">
              {rows.map((row, index) => (
                <article key={`${row.platform}-${index}`} className="rounded-2xl border p-4">
                  <div className="grid gap-3 lg:grid-cols-[150px_1fr_1fr_1fr_2fr_auto] lg:items-center">
                    <input className="rounded-xl border p-3 font-bold" placeholder="Platform" value={row.platform || ""} onChange={(event) => updateRow(index, "platform", event.target.value)} />
                    <input className="rounded-xl border p-3" type="number" placeholder="Followers" value={row.followers || 0} onChange={(event) => updateRow(index, "followers", event.target.value)} />
                    <input className="rounded-xl border p-3" type="number" placeholder="Views" value={row.views || 0} onChange={(event) => updateRow(index, "views", event.target.value)} />
                    <input className="rounded-xl border p-3" type="number" placeholder="Videos" value={row.videos || 0} onChange={(event) => updateRow(index, "videos", event.target.value)} />
                    <input className="rounded-xl border p-3" placeholder="URL" value={row.href || ""} onChange={(event) => updateRow(index, "href", event.target.value)} />
                    <button onClick={() => removeRow(index)} className="rounded-xl bg-red-50 px-4 py-3 font-black text-red-700">Remove</button>
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500">Last updated: {formatDate(row.updated_at)}</p>
                </article>
              ))}
            </div>
          </section>
        </div>}
      </section>
    </main>
  );
}

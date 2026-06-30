"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

const TABLES = [
  "admins",
  "community_groups",
  "community_organizations",
  "contact_requests",
  "crew_availability",
  "event_coverage_sources",
  "event_crew_assignments",
  "event_crew_media_submissions",
  "event_deliverables",
  "event_influencer_intents",
  "event_video_notifications",
  "event_video_revisions",
  "event_video_workflows",
  "events",
  "featured_social_content",
  "festival_hero_assets",
  "hero_analytics",
  "homepage_hero_banners",
  "homepage_settings",
  "homepage_sponsors",
  "homepage_testimonials",
  "influencer_profiles",
  "local_businesses",
  "newsletter_campaigns",
  "newsletter_settings",
  "newsletter_subscribers",
  "notifications",
  "public_content_requests",
  "public_visibility_controls",
  "radio_team_members",
  "social_media_stats",
  "sponsors",
  "team_members",
  "user_profiles",
  "user_role_requests",
  "volunteer_onboarding_submissions",
];

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatTableName(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DatabaseBackupPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [message, setMessage] = useState("Checking access...");
  const [selectedTables, setSelectedTables] = useState<string[]>(TABLES);
  const [lastBackup, setLastBackup] = useState<any>(null);

  const canAccess = Boolean(user && isAdminRole(role));
  const selectedCount = selectedTables.length;
  const allSelected = selectedTables.length === TABLES.length;

  const rowTotal = useMemo(() => {
    if (!lastBackup?.summary) return null;
    return lastBackup.summary.reduce((total: number, item: any) => total + Number(item.count || 0), 0);
  }, [lastBackup]);

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) {
      setMessage("Please login as a Studio admin to use database backup.");
      setLoading(false);
      return;
    }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) {
      setMessage(`Database backup requires admin access. Current role: ${nextRole}`);
      setLoading(false);
      return;
    }
    setMessage("");
    setLoading(false);
  }

  function toggleTable(table: string) {
    setSelectedTables((current) => current.includes(table) ? current.filter((item) => item !== table) : [...current, table]);
  }

  function selectGroup(prefixes: string[]) {
    setSelectedTables(TABLES.filter((table) => prefixes.some((prefix) => table === prefix || table.startsWith(prefix))));
  }

  async function runBackup() {
    if (!selectedTables.length) {
      setMessage("Select at least one table to export.");
      return;
    }
    setExporting(true);
    setMessage("Preparing database backup...");
    setLastBackup(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || "";
      const params = new URLSearchParams({ tables: selectedTables.join(",") });
      const response = await fetch(`/api/studio/database-backup?${params.toString()}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || "Database backup failed.");
      setLastBackup(result.backup);
      downloadJson(result.filename || "sdtv-db-backup.json", result.backup);
      setMessage("Backup downloaded successfully.");
    } catch (error: any) {
      setMessage(error?.message || "Database backup failed.");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">System Administration</p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">Database Backup</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Export SDTV application records from Supabase into a timestamped JSON backup. Images remain in Cloudinary; this export includes the Cloudinary URLs referenced by your records.</p>
            {user?.email && <p className="mt-2 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}
          </div>
          <a href="/studio" className="rounded-xl bg-white/10 px-5 py-3 text-center font-black text-white hover:bg-white/20">Back to Studio</a>
        </div>

        {loading && <div className="rounded-2xl bg-white/10 p-6 font-bold">{message}</div>}
        {!loading && !canAccess && <div className="rounded-2xl bg-white p-8 font-bold text-slate-950">{message}</div>}

        {!loading && canAccess && <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-black">Choose tables</h2>
                <p className="mt-1 text-sm text-slate-600">Selected {selectedCount} of {TABLES.length} tables.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedTables(TABLES)} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Select All</button>
                <button onClick={() => setSelectedTables([])} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-950">Clear</button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => selectGroup(["events", "event_"])} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold hover:bg-slate-200">Events + Video</button>
              <button onClick={() => selectGroup(["homepage", "featured_social", "festival", "hero", "sponsors", "social_media"])} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold hover:bg-slate-200">Homepage CMS</button>
              <button onClick={() => selectGroup(["team", "radio", "user", "volunteer", "influencer", "admins"])} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold hover:bg-slate-200">People + Roles</button>
              <button onClick={() => selectGroup(["newsletter"])} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold hover:bg-slate-200">Newsletter</button>
              <button onClick={() => selectGroup(["local_businesses", "community", "contact", "public_content", "public_visibility"])} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold hover:bg-slate-200">Community</button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {TABLES.map((table) => <label key={table} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${selectedTables.includes(table) ? "border-pink-300 bg-pink-50" : "border-slate-200 bg-white"}`}>
                <input type="checkbox" checked={selectedTables.includes(table)} onChange={() => toggleTable(table)} className="mt-1 h-4 w-4" />
                <span>
                  <span className="block font-black text-slate-950">{formatTableName(table)}</span>
                  <span className="block text-xs font-mono text-slate-500">{table}</span>
                </span>
              </label>)}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
              <h3 className="text-2xl font-black">Backup now</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">This creates a local download in your browser. It does not write anything back to Supabase.</p>
              <button onClick={runBackup} disabled={exporting || !selectedTables.length} className="mt-5 w-full rounded-xl bg-pink-600 px-5 py-4 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-60">{exporting ? "Creating Backup..." : allSelected ? "Backup Everything" : "Backup Selected"}</button>
              {message && <div className="mt-4 rounded-2xl bg-yellow-100 p-4 text-sm font-bold text-yellow-900">{message}</div>}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
              <h3 className="text-2xl font-black">What is included?</h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <p>✓ Public application table records</p>
                <p>✓ Row counts and export summary</p>
                <p>✓ Cloudinary URL references</p>
                <p>✕ Image files are not downloaded</p>
                <p>✕ Supabase Auth passwords are never exported</p>
              </div>
            </section>

            {lastBackup && <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <h3 className="text-2xl font-black">Latest Export</h3>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Generated</p><p className="font-bold">{lastBackup.meta?.generated_at || "—"}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Rows</p><p className="font-bold">{rowTotal ?? "—"}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Cloudinary URLs</p><p className="font-bold">{lastBackup.cloudinary_references?.length || 0}</p></div>
              </div>
            </section>}
          </aside>
        </div>}
      </div>
    </main>
  );
}

"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const APP_ENV = (process.env.NEXT_PUBLIC_APP_ENV || "production").toLowerCase();
const IS_STAGING = APP_ENV === "staging" || APP_ENV === "preview" || APP_ENV === "development";

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

function formatTableName(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getBackupData(payload: any) {
  if (payload?.data && typeof payload.data === "object") return payload.data;
  if (payload?.backup?.data && typeof payload.backup.data === "object") return payload.backup.data;
  return null;
}

export default function DatabaseImportPage() {
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [message, setMessage] = useState("Checking access...");
  const [backup, setBackup] = useState<any>(null);
  const [fileName, setFileName] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>(TABLES);
  const [mode, setMode] = useState<"dry_run" | "insert_missing">("dry_run");
  const [result, setResult] = useState<any>(null);

  const canAccess = Boolean(user && isAdminRole(role));
  const backupData = useMemo(() => getBackupData(backup), [backup]);
  const tableSummary = useMemo(() => {
    if (!backupData) return [];
    return TABLES.map((table) => ({ table, count: Array.isArray(backupData[table]) ? backupData[table].length : 0 }));
  }, [backupData]);
  const selectedRowCount = useMemo(() => tableSummary.filter((item) => selectedTables.includes(item.table)).reduce((total, item) => total + item.count, 0), [tableSummary, selectedTables]);

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) {
      setMessage("Please login as a Studio admin to use database import.");
      setLoading(false);
      return;
    }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) {
      setMessage(`Database import requires admin access. Current role: ${nextRole}`);
      setLoading(false);
      return;
    }
    setMessage("");
    setLoading(false);
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setResult(null);
    setBackup(null);
    setFileName(file?.name || "");
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = getBackupData(parsed);
      if (!data) throw new Error("Invalid backup JSON. Expected a backup.data object.");
      setBackup(parsed);
      setMessage("Backup file loaded. Review the summary before importing.");
    } catch (error: any) {
      setMessage(error?.message || "Could not read backup file.");
    }
  }

  function toggleTable(table: string) {
    setSelectedTables((current) => current.includes(table) ? current.filter((item) => item !== table) : [...current, table]);
  }

  async function runImport() {
    if (!backupData) {
      setMessage("Upload a valid backup JSON file first.");
      return;
    }
    if (!selectedTables.length) {
      setMessage("Select at least one table to import.");
      return;
    }

    const warning = mode === "dry_run"
      ? "You are about to run a DRY RUN import preview. No data will be written. Import is intended only for staging. Continue?"
      : "WARNING: You are about to import backup records. This import is intended ONLY for staging. If this deployment is production, the server will block it. Continue?";

    if (!window.confirm(warning)) return;

    setImporting(true);
    setResult(null);
    setMessage(mode === "dry_run" ? "Running dry run..." : "Importing missing records...");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || "";
      const response = await fetch("/api/studio/database-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ backup, tables: selectedTables, mode }),
      });
      const payload = await response.json().catch(() => ({}));
      setResult(payload);
      if (!response.ok || !payload.success) throw new Error(payload.error || "Database import failed.");
      setMessage(mode === "dry_run" ? `Dry run completed. ${payload.would_insert || 0} rows would be inserted.` : `Import completed. ${payload.inserted || 0} rows inserted.`);
    } catch (error: any) {
      setMessage(error?.message || "Database import failed.");
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-300">System Administration</p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">Database Import</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Import records from an SDTV database backup JSON. This tool is visible to admins, but actual import execution is blocked unless the deployment is configured as staging.</p>
            {user?.email && <p className="mt-2 text-sm text-slate-400">Logged in as {user.email} · Role: {role} · App env: {APP_ENV || "unknown"}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/studio/database-backup" className="rounded-xl bg-white/10 px-5 py-3 text-center font-black text-white hover:bg-white/20">Database Backup</a>
            <a href="/studio" className="rounded-xl bg-white/10 px-5 py-3 text-center font-black text-white hover:bg-white/20">Back to Studio</a>
          </div>
        </div>

        <div className={`mb-6 rounded-3xl border p-6 ${IS_STAGING ? "border-orange-300 bg-orange-100 text-orange-950" : "border-red-300 bg-red-100 text-red-950"}`}>
          <h2 className="text-2xl font-black">{IS_STAGING ? "Staging import mode" : "Production import blocked"}</h2>
          <p className="mt-2 font-bold">{IS_STAGING ? "This deployment is marked as staging/preview/development. Imports can run after confirmation." : "You are in production or an unknown environment. The server will refuse to execute imports here."}</p>
        </div>

        {loading && <div className="rounded-2xl bg-white/10 p-6 font-bold">{message}</div>}
        {!loading && !canAccess && <div className="rounded-2xl bg-white p-8 font-bold text-slate-950">{message}</div>}

        {!loading && canAccess && <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <h2 className="text-3xl font-black">Upload backup JSON</h2>
            <p className="mt-2 text-sm text-slate-600">Use a JSON file downloaded from Studio → Database Backup.</p>
            <input type="file" accept="application/json,.json" onChange={onFileChange} className="mt-5 w-full rounded-2xl border border-slate-300 p-4 font-bold" />
            {fileName && <p className="mt-3 text-sm font-bold text-slate-600">Selected file: {fileName}</p>}

            {backupData && <div className="mt-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-black">Tables in backup</h3>
                  <p className="mt-1 text-sm text-slate-600">Selected {selectedTables.length} tables · {selectedRowCount} rows.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedTables(TABLES)} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Select All</button>
                  <button onClick={() => setSelectedTables([])} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-950">Clear</button>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {tableSummary.map((item) => <label key={item.table} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${selectedTables.includes(item.table) ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white"}`}>
                  <input type="checkbox" checked={selectedTables.includes(item.table)} onChange={() => toggleTable(item.table)} className="mt-1 h-4 w-4" />
                  <span>
                    <span className="block font-black text-slate-950">{formatTableName(item.table)}</span>
                    <span className="block text-xs font-mono text-slate-500">{item.table} · {item.count} rows</span>
                  </span>
                </label>)}
              </div>
            </div>}
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
              <h3 className="text-2xl font-black">Import controls</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">Start with dry run. Insert mode imports only missing primary-key records and skips records that already exist.</p>
              <div className="mt-5 grid gap-3">
                <label className="rounded-2xl bg-white/10 p-4 font-bold"><input type="radio" checked={mode === "dry_run"} onChange={() => setMode("dry_run")} className="mr-3" />Dry run only</label>
                <label className="rounded-2xl bg-white/10 p-4 font-bold"><input type="radio" checked={mode === "insert_missing"} onChange={() => setMode("insert_missing")} className="mr-3" />Insert missing records</label>
              </div>
              <button onClick={runImport} disabled={importing || !backupData || !selectedTables.length} className="mt-5 w-full rounded-xl bg-orange-600 px-5 py-4 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-60">{importing ? "Working..." : mode === "dry_run" ? "Run Dry Run" : "Import Missing Records"}</button>
              {message && <div className="mt-4 rounded-2xl bg-yellow-100 p-4 text-sm font-bold text-yellow-900">{message}</div>}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
              <h3 className="text-2xl font-black">Safety rules</h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <p>✓ Admin login required</p>
                <p>✓ Confirmation popup before execution</p>
                <p>✓ Server blocks production imports</p>
                <p>✓ Dry run supported</p>
                <p>✓ Insert mode only adds missing records</p>
              </div>
            </section>

            {result && <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <h3 className="text-2xl font-black">Latest Result</h3>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Mode</p><p className="font-bold">{result.mode || "—"}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Would Insert</p><p className="font-bold">{result.would_insert ?? "—"}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Inserted</p><p className="font-bold">{result.inserted ?? "—"}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-black text-slate-500">Failed Tables</p><p className="font-bold">{result.failed_table_count ?? "—"}</p></div>
              </div>
            </section>}
          </aside>
        </div>}
      </div>
    </main>
  );
}

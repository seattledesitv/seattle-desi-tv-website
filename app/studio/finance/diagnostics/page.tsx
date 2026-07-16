"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../../lib/supabaseBrowser";
import { cleanRole, resolveUserRole } from "../../../lib/roles";

const supabase = getSupabaseBrowserClient();

function isSuperAdmin(role?: string | null) {
  return cleanRole(role) === "super_admin";
}

function projectHost() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").host || "Not available";
  } catch {
    return "Invalid NEXT_PUBLIC_SUPABASE_URL";
  }
}

export default function FinanceDiagnosticsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [role, setRole] = useState("");
  const [month, setMonth] = useState("2026-07");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<number | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [raw, setRaw] = useState<any>(null);
  const [requestedUrl, setRequestedUrl] = useState("");
  const [lastChecked, setLastChecked] = useState("");
  const [userEmail, setUserEmail] = useState("");

  async function authHeader() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  }

  async function runDiagnostics() {
    setLoading(true);
    setMessage("Calling Finance Expenses API...");
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (category && category !== "all") params.set("category", category);
    const url = `/api/studio/finance/expenses?${params.toString()}`;
    setRequestedUrl(url);

    const headers = await authHeader();
    const response = await fetch(url, { headers, cache: "no-store" });
    const result = await response.json().catch(() => ({}));

    setStatus(response.status);
    setRaw(result);
    setRows(Array.isArray(result.rows) ? result.rows : []);
    setLastChecked(new Date().toLocaleString());
    setMessage(response.ok ? "Diagnostics complete." : result.error || "Finance API request failed.");
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user || null;
      if (!user) {
        setMessage("Please log in first.");
        setLoading(false);
        return;
      }
      setUserEmail(user.email || "");
      const resolvedRole = await resolveUserRole(supabase, user);
      setRole(resolvedRole);
      if (!isSuperAdmin(resolvedRole)) {
        setMessage(`Super admin access required. Current role: ${resolvedRole}`);
        setLoading(false);
        return;
      }
      await runDiagnostics();
    })();
  }, []);

  const kebabRows = rows.filter((row) => String(row.vendor_name || "").toLowerCase().includes("kebab"));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-pink-300">Finance · Temporary Diagnostics</p>
            <h1 className="mt-2 text-4xl font-black">Expense Loading Diagnostics</h1>
            <p className="mt-2 max-w-3xl text-slate-300">This page only reads the existing Finance Expenses API. It does not change expenses, receipts, statuses, or any other site functionality.</p>
          </div>
          <a href="/studio/finance" className="rounded-xl bg-white px-5 py-3 text-center font-black text-slate-950">Back to Finance</a>
        </div>

        <section className="mt-8 grid gap-4 rounded-3xl bg-white p-6 text-slate-950 md:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-xs font-black uppercase text-slate-500">Supabase project host</p><p className="mt-1 break-all font-bold">{projectHost()}</p></div>
          <div><p className="text-xs font-black uppercase text-slate-500">Logged in</p><p className="mt-1 break-all font-bold">{userEmail || "—"}</p></div>
          <div><p className="text-xs font-black uppercase text-slate-500">Resolved role</p><p className="mt-1 font-bold">{role || "—"}</p></div>
          <div><p className="text-xs font-black uppercase text-slate-500">Last checked</p><p className="mt-1 font-bold">{lastChecked || "—"}</p></div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 text-slate-950">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-1 text-sm font-black">Month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border p-3 font-normal" /></label>
            <label className="grid gap-1 text-sm font-black">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border p-3 font-normal"><option value="all">All</option><option value="food">Food</option><option value="event">Event</option><option value="mileage">Mileage</option><option value="media">Media</option><option value="equipment">Equipment</option><option value="venue">Venue</option><option value="travel">Travel</option><option value="marketing">Marketing</option><option value="software">Software</option><option value="legal">Legal</option><option value="other">Other</option></select></label>
            <button onClick={runDiagnostics} disabled={loading || !isSuperAdmin(role)} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-40">{loading ? "Checking..." : "Run Check"}</button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">HTTP status</p><p className="mt-1 text-2xl font-black">{status ?? "—"}</p></div>
            <div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">API rows</p><p className="mt-1 text-2xl font-black">{rows.length}</p></div>
            <div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">Kebab House matches</p><p className="mt-1 text-2xl font-black">{kebabRows.length}</p></div>
            <div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">Requested URL</p><p className="mt-1 break-all text-sm font-bold">{requestedUrl || "—"}</p></div>
          </div>

          <p className={`mt-5 rounded-xl p-4 font-bold ${status && status >= 400 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{message}</p>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 text-slate-950">
          <h2 className="text-2xl font-black">Rows returned by the API</h2>
          {rows.length === 0 ? <p className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center font-bold text-slate-500">No rows were returned for this filter.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b"><th className="p-3">Date</th><th className="p-3">Vendor</th><th className="p-3">Category</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Receipt path</th><th className="p-3">ID</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b align-top"><td className="p-3">{row.expense_date || "—"}</td><td className="p-3 font-black">{row.vendor_name || "—"}</td><td className="p-3">{row.category || "—"}</td><td className="p-3">{row.amount || "—"}</td><td className="p-3">{row.reimbursement_status || "—"}</td><td className="max-w-xs break-all p-3">{row.bill_file_path || "—"}</td><td className="break-all p-3 text-xs">{row.id || "—"}</td></tr>)}</tbody></table></div>}
        </section>

        <details className="mt-6 rounded-3xl bg-white p-6 text-slate-950">
          <summary className="cursor-pointer text-lg font-black">Raw API response</summary>
          <pre className="mt-4 max-h-[480px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(raw, null, 2)}</pre>
        </details>
      </section>
    </main>
  );
}

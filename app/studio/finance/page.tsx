"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { cleanRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const CATEGORIES = ["event", "food", "media", "equipment", "venue", "travel", "marketing", "software", "legal", "other"];
const PAYMENT_METHODS = ["", "cash", "credit_card", "debit_card", "bank_transfer", "zelle", "check", "reimbursement", "other"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function today() { return new Date().toISOString().slice(0, 10); }
function monthNow() { return new Date().toISOString().slice(0, 7); }
function label(value?: string | null) { return String(value || "").replaceAll("_", " ") || "—"; }
function money(value: any) { const n = Number(value || 0); return n.toLocaleString(undefined, { style: "currency", currency: "USD" }); }
function dateText(value?: string | null) { if (!value) return "—"; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
function isSuperAdmin(role?: string | null) { return cleanRole(role) === "super_admin"; }

export default function StudioFinancePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking finance access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [monthFilter, setMonthFilter] = useState(monthNow());
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ expense_date: today(), vendor_name: "", category: "event", amount: "", payment_method: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const canAccess = Boolean(user && isSuperAdmin(role));

  async function authHeader() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  }

  async function loadRows() {
    setActionMessage("");
    const headers = await authHeader();
    const params = new URLSearchParams();
    if (monthFilter) params.set("month", monthFilter);
    if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
    const response = await fetch(`/api/studio/finance/expenses?${params.toString()}`, { headers });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setRows([]); setActionMessage(result.error || "Could not load expenses."); return; }
    setRows(result.rows || []);
  }

  async function init() {
    setLoading(true); setActionMessage("");
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access Finance Management."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isSuperAdmin(nextRole)) { setMessage(`Super admin access required. Current role: ${nextRole}`); setLoading(false); return; }
    setMessage(""); setLoading(false);
  }

  async function submitExpense(event: FormEvent) {
    event.preventDefault();
    if (!canAccess) return;
    if (file && file.size > MAX_FILE_SIZE) { setActionMessage("Bill file must be 5 MB or smaller."); return; }
    setSubmitting(true); setActionMessage("Saving expense...");
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    if (file) payload.append("bill_file", file);
    const headers = await authHeader();
    const response = await fetch("/api/studio/finance/expenses", { method: "POST", headers, body: payload });
    const result = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) { setActionMessage(result.error || "Could not save expense."); return; }
    setActionMessage("Expense saved privately.");
    setForm({ expense_date: today(), vendor_name: "", category: "event", amount: "", payment_method: "", description: "" });
    setFile(null);
    const input = document.getElementById("finance-bill-file") as HTMLInputElement | null;
    if (input) input.value = "";
    await loadRows();
  }

  async function openReceipt(row: any) {
    if (!row.bill_file_path) { setActionMessage("No bill uploaded for this expense."); return; }
    setActionMessage("Creating private receipt link...");
    const headers = await authHeader();
    const response = await fetch("/api/studio/finance/receipt-url", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ expense_id: row.id }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setActionMessage(result.error || "Could not open receipt."); return; }
    setActionMessage("Private receipt link created. It expires in 10 minutes.");
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  useEffect(() => { init(); }, []);
  useEffect(() => { if (canAccess) loadRows(); }, [canAccess, monthFilter, categoryFilter]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.vendor_name || ""} ${row.category || ""} ${row.payment_method || ""} ${row.description || ""} ${row.created_by_email || ""}`.toLowerCase().includes(q));
  }, [rows, search]);
  const total = visibleRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const withBills = visibleRows.filter((row) => row.bill_file_path).length;
  const byCategory = CATEGORIES.map((category) => ({ category, amount: visibleRows.filter((row) => row.category === category).reduce((sum, row) => sum + Number(row.amount || 0), 0) })).filter((item) => item.amount > 0);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="mx-auto max-w-7xl px-4 py-8 md:px-6"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-black uppercase tracking-wide text-pink-300">Studio · Super Admin</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Finance Management</h1><p className="mt-2 text-slate-300">Track SDTV expenses and store bills privately in Cloudflare R2.</p>{user?.email && <p className="mt-1 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}</div><button onClick={loadRows} disabled={!canAccess} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950 disabled:opacity-40">Refresh</button></div>{loading && <div className="rounded-2xl border border-white/10 bg-white/10 p-6">{message}</div>}{!loading && !canAccess && <div className="max-w-xl rounded-2xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Access Required</h2><p className="mt-3 text-slate-600">{message}</p></div>}{!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[390px_1fr]">{actionMessage && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900 lg:col-span-2">{actionMessage}</div>}<section className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Add Expense</h2><p className="mt-1 text-sm text-slate-500">Bills are stored in the private R2 bucket. No public URL is saved.</p><form onSubmit={submitExpense} className="mt-5 grid gap-4"><label className="grid gap-1 text-sm font-black">Expense date<input required type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">Vendor<input required value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} className="rounded-xl border p-3 font-normal" placeholder="Vendor or payee" /></label><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-black">Amount<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-xl border p-3 font-normal" placeholder="0.00" /></label><label className="grid gap-1 text-sm font-black">Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border p-3 font-normal">{CATEGORIES.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></label></div><label className="grid gap-1 text-sm font-black">Payment method<select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="rounded-xl border p-3 font-normal">{PAYMENT_METHODS.map((method) => <option key={method || "blank"} value={method}>{method ? label(method) : "Select method"}</option>)}</select></label><label className="grid gap-1 text-sm font-black">Bill / receipt<input id="finance-bill-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded-xl border p-3 font-normal" /><span className="text-xs font-normal text-slate-500">PDF, JPG, PNG, or WebP. Max 5 MB.</span></label><label className="grid gap-1 text-sm font-black">Notes<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-28 rounded-xl border p-3 font-normal" placeholder="Purpose, event, reimbursement notes, etc." /></label><button disabled={submitting} className="rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-50">{submitting ? "Saving..." : "Save Expense"}</button></form></section><section className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-3xl bg-white p-5 text-slate-950"><p className="text-sm font-black uppercase text-slate-500">Visible total</p><p className="mt-2 text-4xl font-black text-pink-600">{money(total)}</p></div><div className="rounded-3xl bg-white p-5 text-slate-950"><p className="text-sm font-black uppercase text-slate-500">Expense rows</p><p className="mt-2 text-4xl font-black text-pink-600">{visibleRows.length}</p></div><div className="rounded-3xl bg-white p-5 text-slate-950"><p className="text-sm font-black uppercase text-slate-500">Bills stored</p><p className="mt-2 text-4xl font-black text-pink-600">{withBills}</p></div></div><div className="rounded-3xl bg-white p-5 text-slate-950"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-2xl font-black">Expenses</h2><p className="text-sm text-slate-500">Signed receipt links expire after 10 minutes.</p></div><div className="flex flex-col gap-2 md:flex-row"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, notes..." className="rounded-xl border p-3 text-sm md:w-64" /><input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="rounded-xl border p-3 text-sm" /><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border p-3 text-sm"><option value="all">All categories</option>{CATEGORIES.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></div></div>{byCategory.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{byCategory.map((item) => <span key={item.category} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{label(item.category)} · {money(item.amount)}</span>)}</div>}<div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-3">Date</th><th>Vendor</th><th>Category</th><th>Amount</th><th>Payment</th><th>Bill</th><th>Notes</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="py-3">{dateText(row.expense_date)}</td><td className="font-black">{row.vendor_name}</td><td>{label(row.category)}</td><td className="font-black">{money(row.amount)}</td><td>{label(row.payment_method)}</td><td>{row.bill_file_path ? <button onClick={() => openReceipt(row)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">Open bill</button> : <span className="text-slate-400">No bill</span>}</td><td className="max-w-xs truncate" title={row.description || ""}>{row.description || "—"}</td></tr>)}{visibleRows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-500">No expenses found.</td></tr>}</tbody></table></div></div></section></div>}</section></main>;
}

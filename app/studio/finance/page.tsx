"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { cleanRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const CATEGORIES = ["event", "mileage", "food", "media", "equipment", "venue", "travel", "marketing", "software", "legal", "other"];
const PAYMENT_METHODS = ["", "cash", "credit_card", "debit_card", "bank_transfer", "zelle", "check", "reimbursement", "other"];
const STATUSES = ["submitted", "approved", "paid", "rejected"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DEFAULT_MILEAGE_RATE = "0.67";

function today() { return new Date().toISOString().slice(0, 10); }
function monthNow() { return new Date().toISOString().slice(0, 7); }
function label(value?: string | null) { return String(value || "").replaceAll("_", " ") || "—"; }
function money(value: any) { const n = Number(value || 0); return n.toLocaleString(undefined, { style: "currency", currency: "USD" }); }
function dateText(value?: string | null) { if (!value) return "—"; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
function isSuperAdmin(role?: string | null) { return cleanRole(role) === "super_admin"; }
function statusClass(status?: string | null) { const s = String(status || "submitted"); if (s === "paid") return "bg-green-50 text-green-700"; if (s === "approved") return "bg-blue-50 text-blue-700"; if (s === "rejected") return "bg-red-50 text-red-700"; return "bg-yellow-50 text-yellow-800"; }

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
  const [form, setForm] = useState({ expense_type: "expense", expense_date: today(), vendor_name: "", reimbursed_to: "", category: "event", amount: "", mileage_miles: "", mileage_rate: DEFAULT_MILEAGE_RATE, payment_method: "", reimbursement_status: "submitted", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const canAccess = Boolean(user && isSuperAdmin(role));
  const isMileage = form.expense_type === "mileage";
  const mileageAmount = Number(form.mileage_miles || 0) * Number(form.mileage_rate || 0);

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
    setSubmitting(true); setActionMessage("Saving finance item...");
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    if (file) payload.append("bill_file", file);
    const headers = await authHeader();
    const response = await fetch("/api/studio/finance/expenses", { method: "POST", headers, body: payload });
    const result = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) { setActionMessage(result.error || "Could not save finance item."); return; }
    setActionMessage(isMileage ? "Mileage reimbursement submitted." : "Expense saved privately.");
    setForm({ expense_type: "expense", expense_date: today(), vendor_name: "", reimbursed_to: "", category: "event", amount: "", mileage_miles: "", mileage_rate: DEFAULT_MILEAGE_RATE, payment_method: "", reimbursement_status: "submitted", description: "" });
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

  async function updateStatus(row: any, reimbursement_status: string) {
    setActionMessage("Updating reimbursement status...");
    const headers = await authHeader();
    const response = await fetch("/api/studio/finance/expenses", { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, reimbursement_status }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setActionMessage(result.error || "Could not update status."); return; }
    setActionMessage(`Status updated to ${label(reimbursement_status)}.`);
    await loadRows();
  }

  useEffect(() => { init(); }, []);
  useEffect(() => { if (canAccess) loadRows(); }, [canAccess, monthFilter, categoryFilter]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.vendor_name || ""} ${row.reimbursed_to || ""} ${row.expense_type || ""} ${row.category || ""} ${row.payment_method || ""} ${row.reimbursement_status || ""} ${row.description || ""} ${row.created_by_email || ""}`.toLowerCase().includes(q));
  }, [rows, search]);
  const total = visibleRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const unpaidTotal = visibleRows.filter((row) => row.reimbursement_status !== "paid").reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const mileageTotal = visibleRows.filter((row) => row.expense_type === "mileage").reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const withBills = visibleRows.filter((row) => row.bill_file_path).length;
  const byCategory = CATEGORIES.map((category) => ({ category, amount: visibleRows.filter((row) => row.category === category).reduce((sum, row) => sum + Number(row.amount || 0), 0) })).filter((item) => item.amount > 0);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><section className="mx-auto max-w-7xl px-4 py-8 md:px-6"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-black uppercase tracking-wide text-pink-300">Studio · Super Admin</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Finance Management</h1><p className="mt-2 text-slate-300">Track expenses, mileage reimbursements, payment status, and private bills in Cloudflare R2.</p>{user?.email && <p className="mt-1 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}</div><button onClick={loadRows} disabled={!canAccess} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950 disabled:opacity-40">Refresh</button></div>{loading && <div className="rounded-2xl border border-white/10 bg-white/10 p-6">{message}</div>}{!loading && !canAccess && <div className="max-w-xl rounded-2xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Access Required</h2><p className="mt-3 text-slate-600">{message}</p></div>}{!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[390px_1fr]">{actionMessage && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900 lg:col-span-2">{actionMessage}</div>}<section className="rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">Add Finance Item</h2><p className="mt-1 text-sm text-slate-500">Bills are stored privately. Mileage uses miles × rate.</p><form onSubmit={submitExpense} className="mt-5 grid gap-4"><div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2"><button type="button" onClick={() => setForm({ ...form, expense_type: "expense", category: form.category === "mileage" ? "event" : form.category })} className={`rounded-xl px-3 py-2 font-black ${!isMileage ? "bg-pink-600 text-white" : "text-slate-700"}`}>Expense</button><button type="button" onClick={() => setForm({ ...form, expense_type: "mileage", category: "mileage", payment_method: "reimbursement" })} className={`rounded-xl px-3 py-2 font-black ${isMileage ? "bg-pink-600 text-white" : "text-slate-700"}`}>Mileage</button></div><label className="grid gap-1 text-sm font-black">Date<input required type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">{isMileage ? "Traveler / person" : "Vendor"}<input required value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} className="rounded-xl border p-3 font-normal" placeholder={isMileage ? "Person requesting mileage" : "Vendor or payee"} /></label>{isMileage && <label className="grid gap-1 text-sm font-black">Reimbursed to<input value={form.reimbursed_to} onChange={(e) => setForm({ ...form, reimbursed_to: e.target.value })} className="rounded-xl border p-3 font-normal" placeholder="Name/email paid to" /></label>}{isMileage ? <div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-black">Miles<input required type="number" min="0.1" step="0.1" value={form.mileage_miles} onChange={(e) => setForm({ ...form, mileage_miles: e.target.value })} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">Rate / mile<input required type="number" min="0.01" step="0.01" value={form.mileage_rate} onChange={(e) => setForm({ ...form, mileage_rate: e.target.value })} className="rounded-xl border p-3 font-normal" /></label><div className="col-span-2 rounded-xl bg-pink-50 p-3 font-black text-pink-700">Calculated reimbursement: {money(mileageAmount)}</div></div> : <div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-black">Amount<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-xl border p-3 font-normal" placeholder="0.00" /></label><label className="grid gap-1 text-sm font-black">Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border p-3 font-normal">{CATEGORIES.filter((c) => c !== "mileage").map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></label></div>}<div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-black">Payment method<select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="rounded-xl border p-3 font-normal">{PAYMENT_METHODS.map((method) => <option key={method || "blank"} value={method}>{method ? label(method) : "Select method"}</option>)}</select></label><label className="grid gap-1 text-sm font-black">Status<select value={form.reimbursement_status} onChange={(e) => setForm({ ...form, reimbursement_status: e.target.value })} className="rounded-xl border p-3 font-normal">{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label></div><label className="grid gap-1 text-sm font-black">Bill / receipt / mileage proof<input id="finance-bill-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded-xl border p-3 font-normal" /><span className="text-xs font-normal text-slate-500">PDF, JPG, PNG, or WebP. Max 5 MB.</span></label><label className="grid gap-1 text-sm font-black">Notes<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-28 rounded-xl border p-3 font-normal" placeholder={isMileage ? "Trip purpose, route, event, start/end location..." : "Purpose, event, reimbursement notes, etc."} /></label><button disabled={submitting} className="rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-50">{submitting ? "Saving..." : isMileage ? "Submit Mileage" : "Save Expense"}</button></form></section><section className="space-y-5"><div className="grid gap-3 sm:grid-cols-4"><div className="rounded-3xl bg-white p-5 text-slate-950"><p className="text-sm font-black uppercase text-slate-500">Visible total</p><p className="mt-2 text-3xl font-black text-pink-600">{money(total)}</p></div><div className="rounded-3xl bg-white p-5 text-slate-950"><p className="text-sm font-black uppercase text-slate-500">Unpaid</p><p className="mt-2 text-3xl font-black text-pink-600">{money(unpaidTotal)}</p></div><div className="rounded-3xl bg-white p-5 text-slate-950"><p className="text-sm font-black uppercase text-slate-500">Mileage</p><p className="mt-2 text-3xl font-black text-pink-600">{money(mileageTotal)}</p></div><div className="rounded-3xl bg-white p-5 text-slate-950"><p className="text-sm font-black uppercase text-slate-500">Bills</p><p className="mt-2 text-3xl font-black text-pink-600">{withBills}</p></div></div><div className="rounded-3xl bg-white p-5 text-slate-950"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-2xl font-black">Expenses & Reimbursements</h2><p className="text-sm text-slate-500">Signed receipt links expire after 10 minutes.</p></div><div className="flex flex-col gap-2 md:flex-row"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, person, notes..." className="rounded-xl border p-3 text-sm md:w-64" /><input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="rounded-xl border p-3 text-sm" /><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border p-3 text-sm"><option value="all">All categories</option>{CATEGORIES.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></div></div>{byCategory.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{byCategory.map((item) => <span key={item.category} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{label(item.category)} · {money(item.amount)}</span>)}</div>}<div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-3">Date</th><th>Type</th><th>Vendor/Person</th><th>Category</th><th>Amount</th><th>Miles</th><th>Status</th><th>Payment</th><th>Bill</th><th>Notes</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="py-3">{dateText(row.expense_date)}</td><td>{label(row.expense_type || "expense")}</td><td className="font-black">{row.vendor_name}{row.reimbursed_to ? <p className="text-xs font-normal text-slate-500">To: {row.reimbursed_to}</p> : null}</td><td>{label(row.category)}</td><td className="font-black">{money(row.amount)}</td><td>{row.expense_type === "mileage" ? `${Number(row.mileage_miles || 0)} @ ${money(row.mileage_rate)}` : "—"}</td><td><select value={row.reimbursement_status || "submitted"} onChange={(e) => updateStatus(row, e.target.value)} className={`rounded-lg px-2 py-1 text-xs font-black ${statusClass(row.reimbursement_status)}`}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></td><td>{label(row.payment_method)}</td><td>{row.bill_file_path ? <button onClick={() => openReceipt(row)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">Open bill</button> : <span className="text-slate-400">No bill</span>}</td><td className="max-w-xs truncate" title={row.description || ""}>{row.description || "—"}</td></tr>)}{visibleRows.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-slate-500">No finance items found.</td></tr>}</tbody></table></div></div></section></div>}</section></main>;
}

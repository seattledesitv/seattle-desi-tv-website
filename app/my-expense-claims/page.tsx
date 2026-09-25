"use client";

import { useEffect, useState, type FormEvent } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isTeamRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DEFAULT_MILEAGE_RATE = "0.67";
const categories = [
  "event",
  "food",
  "media",
  "equipment",
  "venue",
  "travel",
  "marketing",
  "software",
  "other",
];

function blankForm() {
  return {
    expense_type: "expense",
    expense_date: new Date().toISOString().slice(0, 10),
    vendor_name: "",
    reimbursed_to: "",
    category: "event",
    amount: "",
    mileage_miles: "",
    mileage_rate: DEFAULT_MILEAGE_RATE,
    description: "",
  };
}

function money(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function statusStyle(status: string) {
  if (status === "paid") return "bg-green-100 text-green-800";
  if (status === "approved") return "bg-blue-100 text-blue-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-900";
}

export default function MyExpenseClaimsPage() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Checking team access...");
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState(blankForm);
  const [file, setFile] = useState<File | null>(null);
  const isMileage = form.expense_type === "mileage";
  const calculatedMileage =
    Number(form.mileage_miles || 0) * Number(form.mileage_rate || 0);

  async function authHeader() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token
      ? { Authorization: `Bearer ${data.session.access_token}` }
      : {};
  }

  async function loadClaims() {
    const response = await fetch("/api/studio/finance/expenses", {
      headers: await authHeader(),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.error || "Could not load your claims.");
    setRows(result.rows || []);
  }

  async function initialize() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    if (!user) {
      setMessage("Please log in to submit an expense or mileage claim.");
      setLoading(false);
      return;
    }
    const role = await resolveUserRole(supabase, user);
    if (!isTeamRole(role)) {
      setMessage(
        "An approved SDTV team or crew role is required to submit claims.",
      );
      setLoading(false);
      return;
    }
    setAllowed(true);
    try {
      await loadClaims();
      setMessage(
        "Submit a bill or mileage claim. Finance administrators will review it.",
      );
    } catch (error: any) {
      setMessage(error.message || "Could not load your claims.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void initialize();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!allowed || saving) return;
    if (file && file.size > MAX_FILE_SIZE) {
      setMessage("The receipt or proof must be 5 MB or smaller.");
      return;
    }
    setSaving(true);
    setMessage("Submitting your claim...");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append("reimbursement_status", "submitted");
    if (file) body.append("bill_file", file);
    const response = await fetch("/api/studio/finance/expenses", {
      method: "POST",
      headers: await authHeader(),
      body,
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error || "Could not submit your claim.");
      return;
    }
    setForm(blankForm());
    setFile(null);
    const input = document.getElementById(
      "claim-proof",
    ) as HTMLInputElement | null;
    if (input) input.value = "";
    setMessage("Claim submitted for finance review.");
    await loadClaims();
  }

  async function openProof(row: any) {
    setMessage("Creating a private proof link...");
    const response = await fetch("/api/studio/finance/receipt-url", {
      method: "POST",
      headers: { ...(await authHeader()), "Content-Type": "application/json" },
      body: JSON.stringify({ expense_id: row.id }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error || "Could not open the claim proof.");
      return;
    }
    setMessage("Private proof link opened. It expires in 10 minutes.");
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="font-black uppercase tracking-wide text-pink-300">
          My Hub
        </p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">
          Expense & Mileage Claims
        </h1>
        <p className="mt-3 text-slate-300">
          {loading ? "Loading..." : message}
        </p>

        {allowed && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
            <form
              onSubmit={submit}
              className="h-fit rounded-3xl bg-white p-6 text-slate-950 shadow-xl"
            >
              <h2 className="text-2xl font-black">Submit a claim</h2>
              <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
                {[
                  ["expense", "Bill / expense"],
                  ["mileage", "Mileage"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        expense_type: value,
                        category: value === "mileage" ? "mileage" : "event",
                      })
                    }
                    className={`rounded-xl px-3 py-3 font-black ${form.expense_type === value ? "bg-pink-600 text-white" : "bg-white"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 font-bold">
                  Date
                  <input
                    required
                    type="date"
                    value={form.expense_date}
                    onChange={(e) =>
                      setForm({ ...form, expense_date: e.target.value })
                    }
                    className="rounded-xl border p-3 font-normal"
                  />
                </label>
                <label className="grid gap-1 font-bold">
                  {isMileage ? "Traveler name" : "Vendor / business"}
                  <input
                    required
                    value={form.vendor_name}
                    onChange={(e) =>
                      setForm({ ...form, vendor_name: e.target.value })
                    }
                    className="rounded-xl border p-3 font-normal"
                  />
                </label>
                <label className="grid gap-1 font-bold">
                  Reimburse to
                  <input
                    value={form.reimbursed_to}
                    onChange={(e) =>
                      setForm({ ...form, reimbursed_to: e.target.value })
                    }
                    placeholder="Your name"
                    className="rounded-xl border p-3 font-normal"
                  />
                </label>
                {!isMileage && (
                  <label className="grid gap-1 font-bold">
                    Category
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      className="rounded-xl border p-3 font-normal"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {isMileage ? (
                  <>
                    <label className="grid gap-1 font-bold">
                      Miles
                      <input
                        required
                        min="0.1"
                        step="0.1"
                        type="number"
                        value={form.mileage_miles}
                        onChange={(e) =>
                          setForm({ ...form, mileage_miles: e.target.value })
                        }
                        className="rounded-xl border p-3 font-normal"
                      />
                    </label>
                    <label className="grid gap-1 font-bold">
                      Rate per mile
                      <input
                        required
                        min="0.01"
                        step="0.01"
                        type="number"
                        value={form.mileage_rate}
                        onChange={(e) =>
                          setForm({ ...form, mileage_rate: e.target.value })
                        }
                        className="rounded-xl border p-3 font-normal"
                      />
                    </label>
                    <p className="md:col-span-2 rounded-xl bg-blue-50 p-3 font-black text-blue-800">
                      Calculated claim: {money(calculatedMileage)}
                    </p>
                  </>
                ) : (
                  <label className="grid gap-1 font-bold">
                    Amount
                    <input
                      required
                      min="0.01"
                      step="0.01"
                      type="number"
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                      className="rounded-xl border p-3 font-normal"
                    />
                  </label>
                )}
                <label className="grid gap-1 font-bold md:col-span-2">
                  Reason / event / trip details
                  <textarea
                    required
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="min-h-28 rounded-xl border p-3 font-normal"
                  />
                </label>
                <label className="grid gap-1 font-bold md:col-span-2">
                  Receipt or mileage proof
                  <input
                    id="claim-proof"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="rounded-xl border p-3 font-normal"
                  />
                  <span className="text-xs font-normal text-slate-500">
                    PDF, JPG, PNG, or WebP; maximum 5 MB.
                  </span>
                </label>
              </div>
              <button
                disabled={saving}
                className="mt-5 w-full rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-60"
              >
                {saving ? "Submitting..." : "Submit Claim for Approval"}
              </button>
            </form>

            <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
              <h2 className="text-2xl font-black">My claims</h2>
              <p className="mt-1 text-sm text-slate-500">
                Only claims submitted from your account appear here.
              </p>
              <div className="mt-5 grid gap-3">
                {rows.map((row) => (
                  <article key={row.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black">
                          {row.expense_type === "mileage"
                            ? `${row.mileage_miles} mile mileage claim`
                            : row.vendor_name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {String(row.expense_date || "").split("T")[0]} ·{" "}
                          {row.category}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusStyle(row.reimbursement_status)}`}
                      >
                        {row.reimbursement_status || "submitted"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-600">
                          {row.description || "No details provided."}
                        </p>
                        {row.bill_file_path && (
                          <button
                            type="button"
                            onClick={() => openProof(row)}
                            className="mt-2 text-sm font-black text-pink-600"
                          >
                            View uploaded proof
                          </button>
                        )}
                      </div>
                      <strong className="text-lg">{money(row.amount)}</strong>
                    </div>
                  </article>
                ))}
                {!rows.length && (
                  <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">
                    You have not submitted any claims yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

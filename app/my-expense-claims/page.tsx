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
    payout_method: "zelle",
    payout_details: "",
    event_financial_type: "",
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
  const [files, setFiles] = useState<File[]>([]);
  const [editingId, setEditingId] = useState("");
  const [updateNote, setUpdateNote] = useState("");
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
    if (files.some((file) => file.size > MAX_FILE_SIZE)) {
      setMessage("Each receipt or proof must be 5 MB or smaller.");
      return;
    }
    if (files.length > 10) { setMessage("Upload no more than 10 files per submission."); return; }
    setSaving(true);
    setMessage("Submitting your claim...");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append("reimbursement_status", "submitted");
    if (editingId) body.append("id", editingId);
    if (updateNote) body.append("update_note", updateNote);
    files.forEach((file) => body.append("bill_files", file));
    const response = await fetch("/api/studio/finance/expenses", {
      method: editingId ? "PATCH" : "POST",
      headers: await authHeader(),
      body,
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error || "Could not submit your claim.");
      return;
    }
    const wasEditing = Boolean(editingId);
    setForm(blankForm());
    setFiles([]);
    setEditingId("");
    setUpdateNote("");
    const input = document.getElementById(
      "claim-proof",
    ) as HTMLInputElement | null;
    if (input) input.value = "";
    setMessage(wasEditing ? "Claim update saved and returned for finance review." : "Claim submitted for finance review.");
    await loadClaims();
  }

  async function openProof(row: any, attachmentId?: string) {
    setMessage("Creating a private proof link...");
    const response = await fetch("/api/studio/finance/receipt-url", {
      method: "POST",
      headers: { ...(await authHeader()), "Content-Type": "application/json" },
      body: JSON.stringify({ expense_id: row.id, attachment_id: attachmentId || null }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error || "Could not open the claim proof.");
      return;
    }
    setMessage("Private proof link opened. It expires in 10 minutes.");
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  function editClaim(row: any) {
    setEditingId(row.id);
    setUpdateNote("");
    setFiles([]);
    setForm({
      expense_type: row.expense_type === "mileage" ? "mileage" : "expense",
      expense_date: String(row.expense_date || "").split("T")[0],
      vendor_name: String(row.vendor_name || ""), reimbursed_to: String(row.reimbursed_to || ""),
      payout_method: String(row.payout_method || "zelle"), payout_details: String(row.payout_details || ""),
      event_financial_type: String(row.event_financial_type || ""), category: String(row.category || "event"),
      amount: String(row.amount || ""), mileage_miles: String(row.mileage_miles || ""),
      mileage_rate: String(row.mileage_rate || DEFAULT_MILEAGE_RATE), description: String(row.description || ""),
    });
    setMessage("Editing your submitted claim. Saving creates a new revision and preserves the original.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() { setEditingId(""); setUpdateNote(""); setFiles([]); setForm(blankForm()); setMessage("Claim editing cancelled."); }

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
              <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">{editingId ? "Update claim" : "Submit a claim"}</h2>{editingId && <button type="button" onClick={cancelEdit} className="rounded-xl border px-3 py-2 text-sm font-black">Cancel</button>}</div>
              {editingId && <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900">Your original submission remains in the revision history. This update will be added as a new revision and returned to finance for review.</div>}
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
                  Was this claim related to a paid or free event?
                  <select
                    required
                    value={form.event_financial_type}
                    onChange={(e) =>
                      setForm({ ...form, event_financial_type: e.target.value })
                    }
                    className="rounded-xl border p-3 font-normal"
                  >
                    <option value="">Select event context</option>
                    <option value="paid_event">Paid event</option>
                    <option value="free_event">Free event</option>
                    <option value="not_event">Not related to an event</option>
                  </select>
                  <span className="text-xs font-normal text-slate-500">
                    This helps finance report spending for paid events, free
                    community events, and general operations.
                  </span>
                </label>
                <fieldset className="grid gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 md:col-span-2 md:grid-cols-2">
                  <legend className="px-2 font-black text-blue-900">
                    How should SDTV reimburse you?
                  </legend>
                  <label className="grid gap-1 font-bold">
                    Preferred payout method
                    <select
                      required
                      value={form.payout_method}
                      onChange={(e) =>
                        setForm({ ...form, payout_method: e.target.value })
                      }
                      className="rounded-xl border p-3 font-normal"
                    >
                      <option value="zelle">Zelle</option>
                      <option value="check">Check</option>
                      <option value="bank_contact">
                        Bank transfer — contact me privately
                      </option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="grid gap-1 font-bold">
                    Payout instructions
                    <input
                      required
                      value={form.payout_details}
                      onChange={(e) =>
                        setForm({ ...form, payout_details: e.target.value })
                      }
                      placeholder={
                        form.payout_method === "zelle"
                          ? "Zelle email address or phone number"
                          : form.payout_method === "check"
                            ? "Payee name and mailing instructions"
                            : "How finance should contact or pay you"
                      }
                      className="rounded-xl border p-3 font-normal"
                    />
                  </label>
                  <p className="text-xs font-bold text-blue-800 md:col-span-2">
                    Do not enter a complete bank-account or routing number here.
                    For a bank transfer, select “contact me privately” and
                    finance will arrange a secure exchange.
                  </p>
                </fieldset>
                <label className="grid gap-1 font-bold md:col-span-2">
                  Supporting files
                  <input
                    id="claim-proof"
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    className="rounded-xl border p-3 font-normal"
                  />
                  <span className="text-xs font-normal text-slate-500">
                    Select up to 10 PDF, JPG, PNG, or WebP files; maximum 5 MB each and 25 MB combined. New files are added without removing earlier proofs.
                  </span>
                </label>
                {editingId && <label className="grid gap-1 font-bold md:col-span-2">What changed?<textarea required value={updateNote} onChange={(e) => setUpdateNote(e.target.value)} placeholder="Explain the correction or additional information" className="min-h-20 rounded-xl border p-3 font-normal" /></label>}
              </div>
              <button
                disabled={saving}
                className="mt-5 w-full rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Save Update for Review" : "Submit Claim for Approval"}
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
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Context:{" "}
                          {String(
                            row.event_financial_type || "not specified",
                          ).replaceAll("_", " ")}
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
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Payout:{" "}
                          {String(
                            row.payout_method || "not specified",
                          ).replaceAll("_", " ")}
                        </p>
                        {Array.isArray(row.attachments) && row.attachments.length > 0 ? <div className="mt-3"><p className="text-xs font-black uppercase text-slate-500">Supporting files ({row.attachments.length})</p><div className="mt-1 flex flex-wrap gap-2">{row.attachments.map((attachment: any) => <button key={attachment.id} type="button" onClick={() => openProof(row, attachment.id)} className="rounded-full bg-pink-50 px-3 py-2 text-xs font-black text-pink-700">{attachment.file_name}</button>)}</div></div> : row.bill_file_path && (
                          <button
                            type="button"
                            onClick={() => openProof(row)}
                            className="mt-2 text-sm font-black text-pink-600"
                          >
                            View uploaded proof
                          </button>
                        )}
                        {Array.isArray(row.revisions) && row.revisions.length > 0 && <p className="mt-3 text-xs font-bold text-slate-500">Revision history: {row.revisions.length} version{row.revisions.length === 1 ? "" : "s"} · Last update {new Date(row.revisions[row.revisions.length - 1].created_at).toLocaleString()}</p>}
                      </div>
                      <strong className="text-lg">{money(row.amount)}</strong>
                    </div>
                    {row.reimbursement_status !== "paid" && <button type="button" onClick={() => editClaim(row)} className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-black">Edit / add information</button>}
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

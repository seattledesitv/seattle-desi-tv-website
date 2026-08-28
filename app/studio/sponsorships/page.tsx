"use client";
import { useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { useSponsorships } from "../../hooks/useSponsorships";
import {
  DEFAULT_SPONSORSHIP_AGREEMENT,
  fillAgreementTemplate,
} from "../../lib/sponsorships/defaultAgreement";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import type {
  SponsorshipAgreement,
  SponsorshipAgreementInput,
  SponsorshipInstallment,
  SponsorshipPackage,
} from "../../lib/sponsorships/types";

const money = (cents: number | null | undefined) =>
  cents == null
    ? "Not set"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(cents / 100);
const today = () => new Date().toISOString().slice(0, 10);
const initialEnd = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

export default function SponsorshipsPage() {
  const {
    packages,
    agreements,
    businesses,
    loading,
    saving,
    error,
    create,
    updatePackage,
    updateAgreement,
    refresh,
  } = useSponsorships();
  const [tab, setTab] = useState<"agreements" | "packages">("agreements");
  const [notice, setNotice] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [schedule, setSchedule] = useState<
    Array<{ amount: number; due_date: string }>
  >([]);
  const [form, setForm] = useState({
    business_id: "",
    sponsor_name: "",
    sponsor_email: "",
    sponsor_contact_name: "",
    sponsor_contact_title: "",
    start_date: today(),
    end_date: initialEnd(),
    discount_type: "none",
    discount_value: 0,
    activation_condition: "first_payment",
    agreement_content: DEFAULT_SPONSORSHIP_AGREEMENT,
    internal_notes: "",
    installment_count: 1,
  });
  const pkg = packages.find((item) => item.id === selectedPackage);
  const base = pkg?.price_cents || 0;
  const final = useMemo(
    () =>
      form.discount_type === "fixed"
        ? Math.max(0, base - Math.round(form.discount_value * 100))
        : form.discount_type === "percent"
          ? Math.max(0, Math.round(base * (1 - form.discount_value / 100)))
          : base,
    [base, form.discount_type, form.discount_value],
  );
  function choosePackage(id: string) {
    const next = packages.find((item) => item.id === id);
    setSelectedPackage(id);
    if (!next) return;
    setForm((current) => ({
      ...current,
      agreement_content: fillAgreementTemplate(
        next.agreement_template || DEFAULT_SPONSORSHIP_AGREEMENT,
        {
          SPONSOR_NAME: current.sponsor_name || "Sponsor",
          START_DATE: current.start_date,
          END_DATE: current.end_date,
          PACKAGE_NAME: next.name,
          BENEFITS: next.benefits.map((value) => `• ${value}`).join("\n"),
          BASE_AMOUNT: money(next.price_cents),
          DISCOUNT: "To be finalized",
          FINAL_AMOUNT: "Shown in the agreement summary",
        },
      ),
    }));
  }
  function chooseBusiness(id: string) {
    const business = businesses.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      business_id: id,
      sponsor_name: business?.name || current.sponsor_name,
    }));
  }
  async function submit() {
    if (!pkg) return setNotice("Choose a sponsorship package.");
    if (!schedule.length)
      return setNotice("Prepare and review the payment schedule first.");
    const installments: Array<
      Omit<SponsorshipInstallment, "id" | "agreement_id">
    > = schedule.map((row, index) => ({
      installment_number: index + 1,
      amount_cents: Math.round(row.amount * 100),
      due_date: row.due_date,
      status: "scheduled",
    }));
    const input: SponsorshipAgreementInput = {
      business_id: form.business_id || null,
      homepage_sponsor_id: null,
      package_template_id: pkg.id,
      tier: pkg.tier,
      sponsor_name: form.sponsor_name,
      sponsor_email: form.sponsor_email,
      sponsor_contact_name: form.sponsor_contact_name || null,
      sponsor_contact_title: form.sponsor_contact_title || null,
      start_date: form.start_date,
      end_date: form.end_date,
      base_amount_cents: base,
      discount_type: form.discount_type as "none" | "fixed" | "percent",
      discount_value: Number(form.discount_value),
      final_amount_cents: final,
      currency: "USD",
      agreement_content: form.agreement_content,
      activation_condition:
        form.activation_condition as SponsorshipAgreementInput["activation_condition"],
      internal_notes: form.internal_notes || null,
      installments,
    };
    try {
      await create(input);
      setNotice("Draft agreement created.");
    } catch {
      /* hook shows error */
    }
  }
  function prepareSchedule() {
    const count = Math.max(1, Number(form.installment_count));
    const total = final / 100;
    const portion = Math.floor((total * 100) / count) / 100;
    setSchedule(
      Array.from({ length: count }, (_, index) => {
        const due = new Date(`${form.start_date}T12:00:00`);
        due.setMonth(due.getMonth() + index);
        return {
          amount:
            index === count - 1
              ? Number((total - portion * (count - 1)).toFixed(2))
              : portion,
          due_date: due.toISOString().slice(0, 10),
        };
      }),
    );
  }
  async function api(path: string, body: object) {
    setNotice("");
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${data.session?.access_token || ""}`,
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }
  async function sendAgreement(id: string) {
    try {
      const result = await api("/api/studio/sponsorships/send", {
        agreementId: id,
      });
      setNotice(
        result.emailConfigured
          ? "Agreement emailed to sponsor."
          : `Email is not configured. Secure review URL: ${result.reviewUrl}`,
      );
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not send agreement.");
    }
  }
  async function correctSponsorEmail(row: SponsorshipAgreement) {
    const sponsorEmail = window.prompt(
      "Correct the sponsor email address",
      row.sponsor_email,
    );
    if (sponsorEmail === null || sponsorEmail.trim() === row.sponsor_email)
      return;
    if (
      ["sent", "viewed"].includes(row.status) &&
      !window.confirm(
        "This will invalidate the previous review link and return the agreement to draft. You must send the agreement again. Continue?",
      )
    )
      return;
    try {
      const result = await api("/api/studio/sponsorships/recipient", {
        agreementId: row.id,
        sponsorEmail,
      });
      setNotice(
        result.requiresResend
          ? "Sponsor email corrected. The old review link is invalid. Send the agreement again."
          : "Sponsor email corrected.",
      );
      await refresh();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not correct sponsor email.",
      );
    }
  }
  async function decidePayment(id: string, decision: "verify" | "reject") {
    try {
      await api("/api/studio/sponsorships/payment", {
        installmentId: id,
        decision,
      });
      setNotice(
        decision === "verify" ? "Payment verified." : "Payment proof rejected.",
      );
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not update payment.");
    }
  }
  async function remindPayment(id: string) {
    try {
      await api("/api/studio/sponsorships/remind", { installmentId: id });
      setNotice("Payment reminder emailed.");
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not send reminder.");
    }
  }
  async function editDraftAgreement(row: SponsorshipAgreement) {
    const content = window.prompt(
      "Edit the draft agreement text",
      row.agreement_content,
    );
    if (content === null || content === row.agreement_content) return;
    try {
      await updateAgreement(row.id, { agreement_content: content });
      setNotice("Draft agreement text updated.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not update draft.");
    }
  }
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="font-black uppercase tracking-wider text-pink-300">
          Revenue & partnerships
        </p>
        <h1 className="mt-2 text-4xl font-black">Sponsor onboarding</h1>
        <p className="mt-2 text-slate-300">
          Build, approve, accept, and track sponsorship agreements in one place.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setTab("agreements")}
            className={`rounded-xl px-5 py-3 font-bold ${tab === "agreements" ? "bg-pink-600" : "bg-white/10"}`}
          >
            Agreements
          </button>
          <button
            onClick={() => setTab("packages")}
            className={`rounded-xl px-5 py-3 font-bold ${tab === "packages" ? "bg-pink-600" : "bg-white/10"}`}
          >
            Package settings
          </button>
        </div>
        {(error || notice) && (
          <div className="mt-5 rounded-xl bg-white p-4 font-semibold text-slate-900">
            {error || notice}
          </div>
        )}
        {loading ? (
          <p className="mt-8">Loading sponsorship workspace…</p>
        ) : tab === "packages" ? (
          <PackageSettings
            packages={packages}
            saving={saving}
            updatePackage={updatePackage}
          />
        ) : (
          <div className="mt-8 grid gap-7 xl:grid-cols-[440px_1fr]">
            <section className="rounded-3xl bg-white p-6 text-slate-950">
              <h2 className="text-2xl font-black">New agreement</h2>
              <div className="mt-5 space-y-4">
                <Field label="Package">
                  <select
                    value={selectedPackage}
                    onChange={(e) => choosePackage(e.target.value)}
                    className="input"
                  >
                    <option value="">Choose package</option>
                    {packages.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — {money(item.price_cents)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Linked business (optional)">
                  <select
                    value={form.business_id}
                    onChange={(e) => chooseBusiness(e.target.value)}
                    className="input"
                  >
                    <option value="">Independent sponsor</option>
                    {businesses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sponsor name">
                  <input
                    className="input"
                    value={form.sponsor_name}
                    onChange={(e) =>
                      setForm({ ...form, sponsor_name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Sponsor email">
                  <input
                    type="email"
                    className="input"
                    value={form.sponsor_email}
                    onChange={(e) =>
                      setForm({ ...form, sponsor_email: e.target.value })
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start">
                    <input
                      type="date"
                      className="input"
                      value={form.start_date}
                      onChange={(e) =>
                        setForm({ ...form, start_date: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="End">
                    <input
                      type="date"
                      className="input"
                      value={form.end_date}
                      onChange={(e) =>
                        setForm({ ...form, end_date: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Discount">
                    <select
                      className="input"
                      value={form.discount_type}
                      onChange={(e) =>
                        setForm({ ...form, discount_type: e.target.value })
                      }
                    >
                      <option value="none">None</option>
                      <option value="fixed">Fixed dollars</option>
                      <option value="percent">Percent</option>
                    </select>
                  </Field>
                  <Field label="Value">
                    <input
                      type="number"
                      className="input"
                      value={form.discount_value}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          discount_value: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="rounded-xl bg-slate-100 p-4">
                  <b>Final amount: {money(final)}</b>
                  <p className="text-sm text-slate-600">
                    Admin finalizes this before sending.
                  </p>
                </div>
                <Field label="Payment schedule">
                  <div className="flex gap-2">
                    <select
                      className="input"
                      value={form.installment_count}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          installment_count: Number(e.target.value),
                        })
                      }
                    >
                      {[1, 2, 3, 4, 5, 6, 12].map((n) => (
                        <option key={n} value={n}>
                          {n} payment{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={prepareSchedule}
                      className="rounded-xl bg-slate-900 px-4 font-bold text-white"
                    >
                      Prepare
                    </button>
                  </div>
                </Field>
                {schedule.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-3"
                  >
                    <Field label={`Payment ${index + 1} amount`}>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        value={row.amount}
                        onChange={(e) =>
                          setSchedule((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, amount: Number(e.target.value) }
                                : item,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Due date">
                      <input
                        type="date"
                        className="input"
                        value={row.due_date}
                        onChange={(e) =>
                          setSchedule((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, due_date: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </Field>
                  </div>
                ))}
                <Field label="Activation">
                  <select
                    className="input"
                    value={form.activation_condition}
                    onChange={(e) =>
                      setForm({ ...form, activation_condition: e.target.value })
                    }
                  >
                    <option value="acceptance">After acceptance</option>
                    <option value="first_payment">
                      After first verified payment
                    </option>
                    <option value="full_payment">After full payment</option>
                    <option value="manual">Manual activation</option>
                  </select>
                </Field>
                <Field label="Editable agreement">
                  <textarea
                    rows={16}
                    className="input font-mono text-sm"
                    value={form.agreement_content}
                    onChange={(e) =>
                      setForm({ ...form, agreement_content: e.target.value })
                    }
                  />
                </Field>
                <button
                  disabled={saving}
                  onClick={submit}
                  className="w-full rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-50"
                >
                  Create draft
                </button>
              </div>
            </section>
            <AgreementList
              agreements={agreements}
              send={sendAgreement}
              decidePayment={decidePayment}
              remindPayment={remindPayment}
              editDraft={editDraftAgreement}
              correctEmail={correctSponsorEmail}
            />
          </div>
        )}
      </div>
      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          padding: 0.75rem;
          background: white;
          color: #0f172a;
        }
      `}</style>
    </main>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
function PackageSettings({
  packages,
  saving,
  updatePackage,
}: {
  packages: SponsorshipPackage[];
  saving: boolean;
  updatePackage: (id: string, c: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2">
      {packages.map((pkg) => (
        <form
          key={pkg.id}
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            await updatePackage(pkg.id, {
              name: data.get("name"),
              price_cents: data.get("price")
                ? Math.round(Number(data.get("price")) * 100)
                : null,
              benefits: String(data.get("benefits") || "")
                .split("\n")
                .filter(Boolean),
              agreement_template: data.get("template"),
              active: data.get("active") === "on",
            });
          }}
          className="rounded-3xl bg-white p-6 text-slate-950"
        >
          <h2 className="text-xl font-black capitalize">{pkg.tier}</h2>
          <div className="mt-4 space-y-3">
            <Field label="Package name">
              <input name="name" className="input" defaultValue={pkg.name} />
            </Field>
            <Field label="Annual price">
              <input
                name="price"
                type="number"
                className="input"
                defaultValue={
                  pkg.price_cents == null ? "" : pkg.price_cents / 100
                }
              />
            </Field>
            <Field label="Benefits (one per line)">
              <textarea
                name="benefits"
                rows={7}
                className="input"
                defaultValue={pkg.benefits.join("\n")}
              />
            </Field>
            <Field label="Agreement template">
              <textarea
                name="template"
                rows={8}
                className="input text-sm"
                defaultValue={
                  pkg.agreement_template || DEFAULT_SPONSORSHIP_AGREEMENT
                }
              />
            </Field>
            <label className="flex gap-2">
              <input
                name="active"
                type="checkbox"
                defaultChecked={pkg.active}
              />{" "}
              Active
            </label>
            <button
              disabled={saving}
              className="rounded-xl bg-pink-600 px-5 py-3 font-bold text-white"
            >
              Save package
            </button>
          </div>
        </form>
      ))}
    </div>
  );
}
function EmailHistory({ agreement }: { agreement: SponsorshipAgreement }) {
  const deliveries = (agreement.events || [])
    .filter((event) => event.event_type.includes("email_"))
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    );
  return (
    <details className="mt-4 rounded-xl border border-slate-200 p-4">
      <summary className="cursor-pointer font-black">
        Email history ({deliveries.length})
      </summary>
      {deliveries.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No archived email content is available for this agreement yet.
        </p>
      ) : (
        <div className="mt-4 space-y-3 border-t pt-4">
          {deliveries.map((delivery) => {
            const details = delivery.details || {};
            const status = String(details.delivery_status || "recorded");
            return (
              <details
                key={delivery.id}
                className="rounded-xl bg-slate-100 p-4"
              >
                <summary className="cursor-pointer font-bold">
                  {String(details.subject || delivery.event_type)} · {status} ·{" "}
                  {new Date(delivery.created_at).toLocaleString()}
                </summary>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-black">Recipient</dt>
                    <dd>{String(details.recipient || "—")}</dd>
                  </div>
                  <div>
                    <dt className="font-black">Provider reference</dt>
                    <dd>{String(details.provider_email_id || "—")}</dd>
                  </div>
                </dl>
                {details.error_message ? (
                  <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                    {String(details.error_message)}
                  </p>
                ) : null}
                <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm leading-6">
                  {String(details.body_text || "Email content unavailable.")}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </details>
  );
}

function AgreementList({
  agreements,
  send,
  decidePayment,
  remindPayment,
  editDraft,
  correctEmail,
}: {
  agreements: SponsorshipAgreement[];
  send: (id: string) => void;
  decidePayment: (id: string, d: "verify" | "reject") => void;
  remindPayment: (id: string) => void;
  editDraft: (agreement: SponsorshipAgreement) => void;
  correctEmail: (agreement: SponsorshipAgreement) => void;
}) {
  return (
    <section>
      <h2 className="text-2xl font-black">Agreements</h2>
      <div className="mt-4 space-y-4">
        {agreements.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-slate-700">
            No agreements yet.
          </div>
        )}
        {agreements.map((row) => (
          <article
            key={row.id}
            className="rounded-2xl bg-white p-6 text-slate-950"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase text-pink-600">
                  {row.agreement_number} · {row.status}
                </p>
                <h3 className="text-2xl font-black">{row.sponsor_name}</h3>
                <p>
                  {row.tier} · {money(row.final_amount_cents)} ·{" "}
                  {row.start_date} to {row.end_date}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Sponsor email: <b>{row.sponsor_email}</b>
                </p>
              </div>
              {["draft", "sent", "viewed"].includes(row.status) && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => correctEmail(row)}
                    className="rounded-xl border border-pink-300 px-4 py-2 font-bold text-pink-700"
                  >
                    Correct sponsor email
                  </button>
                  <button
                    onClick={() => send(row.id)}
                    className="rounded-xl bg-pink-600 px-4 py-2 font-bold text-white"
                  >
                    {row.status === "draft"
                      ? "Send for approval"
                      : "Resend agreement email"}
                  </button>
                </div>
              )}
            </div>
            {row.accepted_at && (
              <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-emerald-800">
                Accepted by {row.signer_name} on{" "}
                {new Date(row.accepted_at).toLocaleDateString()}
              </p>
            )}
            <details className="mt-4 rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-black">
                View {row.accepted_at ? "signed" : "current"} agreement text
              </summary>
              <div className="mt-4 whitespace-pre-wrap border-t pt-4 text-sm leading-6">
                {row.agreement_content}
              </div>
              {row.status === "draft" && (
                <button
                  onClick={() => editDraft(row)}
                  className="mt-4 rounded-xl bg-slate-950 px-4 py-2 font-bold text-white"
                >
                  Edit draft text
                </button>
              )}
              {row.accepted_at && (
                <p className="mt-4 text-sm font-bold text-emerald-700">
                  This signed text is preserved and cannot be edited.
                </p>
              )}
            </details>
            <EmailHistory agreement={row} />
            <div className="mt-4 space-y-2">
              {row.installments?.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 p-3"
                >
                  <span>
                    Payment {item.installment_number}:{" "}
                    {money(item.amount_cents)} due {item.due_date} ·{" "}
                    <b>{item.status}</b>
                  </span>
                  {item.status === "proof_submitted" && (
                    <span className="flex gap-2">
                      <a
                        target="_blank"
                        href={item.confirmation_url || "#"}
                        className="font-bold text-pink-700"
                      >
                        View proof
                      </a>
                      <button
                        onClick={() => decidePayment(item.id!, "verify")}
                        className="font-bold text-emerald-700"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => decidePayment(item.id!, "reject")}
                        className="font-bold text-red-700"
                      >
                        Reject
                      </button>
                    </span>
                  )}
                  {item.id &&
                    ["scheduled", "due", "overdue", "rejected"].includes(
                      item.status,
                    ) && (
                      <button
                        onClick={() => remindPayment(item.id!)}
                        className="font-bold text-pink-700"
                      >
                        Send reminder
                      </button>
                    )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

"use client";
import { useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { useMySponsorships } from "../hooks/useMySponsorships";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export default function MySponsorshipsPage() {
  const {
    agreements,
    loading,
    saving,
    error,
    refresh,
    submitProof,
    acceptAgreement,
  } = useMySponsorships();
  const [signers, setSigners] = useState<
    Record<string, { name: string; title: string; confirmed: boolean }>
  >({});
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-black uppercase tracking-wider text-pink-300">
              My Hub
            </p>
            <h1 className="mt-2 text-4xl font-black">My Sponsorships</h1>
            <p className="mt-2 text-slate-300">
              Review signed terms, benefits, dates, payments, and confirmations.
            </p>
          </div>
          <button
            onClick={refresh}
            className="rounded-xl bg-white px-5 py-3 font-black text-slate-950"
          >
            Refresh
          </button>
        </div>
        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="mt-8 rounded-2xl bg-white/10 p-6">
            Loading sponsorships…
          </div>
        ) : agreements.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-slate-950">
            <h2 className="text-2xl font-black">
              No sponsorships connected to this account
            </h2>
            <p className="mt-2 text-slate-600">
              Sign in with the email used on your agreement, or ask SDTV to link
              the sponsorship to a business you manage.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {agreements.map((agreement) => (
              <article
                key={agreement.id}
                className="overflow-hidden rounded-3xl bg-white text-slate-950"
              >
                <header className="bg-pink-50 p-6">
                  <p className="text-sm font-black uppercase text-pink-700">
                    {agreement.agreement_number} · {agreement.status}
                  </p>
                  <div className="mt-2 flex flex-wrap justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black capitalize">
                        {agreement.tier} Sponsorship
                      </h2>
                      <p>
                        {agreement.start_date} to {agreement.end_date}
                      </p>
                    </div>
                    <p className="text-2xl font-black">
                      {money(agreement.final_amount_cents)}
                    </p>
                  </div>
                  {agreement.accepted_at && (
                    <p className="mt-3 font-semibold text-emerald-700">
                      Accepted by {agreement.signer_name}
                      {agreement.signer_title
                        ? `, ${agreement.signer_title}`
                        : ""}{" "}
                      on {new Date(agreement.accepted_at).toLocaleString()}
                    </p>
                  )}
                </header>
                <div className="p-6">
                  {["sent", "viewed"].includes(agreement.status) && (
                    <section className="mb-6 rounded-2xl bg-slate-950 p-5 text-white">
                      <h3 className="text-xl font-black">Accept agreement</h3>
                      <p className="mt-1 text-sm text-slate-300">
                        Confirm that you are authorized to sign for the sponsor.
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <input
                          value={signers[agreement.id]?.name || ""}
                          onChange={(event) =>
                            setSigners((current) => ({
                              ...current,
                              [agreement.id]: {
                                name: event.target.value,
                                title: current[agreement.id]?.title || "",
                                confirmed:
                                  current[agreement.id]?.confirmed || false,
                              },
                            }))
                          }
                          placeholder="Authorized signer name"
                          className="rounded-xl p-3 text-slate-950"
                        />
                        <input
                          value={signers[agreement.id]?.title || ""}
                          onChange={(event) =>
                            setSigners((current) => ({
                              ...current,
                              [agreement.id]: {
                                name: current[agreement.id]?.name || "",
                                title: event.target.value,
                                confirmed:
                                  current[agreement.id]?.confirmed || false,
                              },
                            }))
                          }
                          placeholder="Signer title"
                          className="rounded-xl p-3 text-slate-950"
                        />
                      </div>
                      <label className="mt-4 flex items-start gap-3 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={signers[agreement.id]?.confirmed || false}
                          onChange={(event) =>
                            setSigners((current) => ({
                              ...current,
                              [agreement.id]: {
                                name: current[agreement.id]?.name || "",
                                title: current[agreement.id]?.title || "",
                                confirmed: event.target.checked,
                              },
                            }))
                          }
                          className="mt-1"
                        />
                        I have reviewed the agreement and am authorized to
                        accept it for the sponsor.
                      </label>
                      <button
                        type="button"
                        disabled={
                          saving ||
                          !signers[agreement.id]?.name.trim() ||
                          !signers[agreement.id]?.confirmed
                        }
                        onClick={() =>
                          void acceptAgreement(
                            agreement.id,
                            signers[agreement.id]?.name || "",
                            signers[agreement.id]?.title || "",
                          ).catch(() => undefined)
                        }
                        className="mt-4 rounded-xl bg-pink-600 px-5 py-3 font-black disabled:opacity-40"
                      >
                        {saving ? "Accepting…" : "I agree and accept"}
                      </button>
                    </section>
                  )}
                  <details className="rounded-2xl border p-5">
                    <summary className="cursor-pointer text-xl font-black">
                      View exact agreement text
                    </summary>
                    <div className="mt-5 whitespace-pre-wrap border-t pt-5 leading-7">
                      {agreement.agreement_content}
                    </div>
                  </details>
                  <h3 className="mt-7 text-xl font-black">Payment schedule</h3>
                  <p className="mt-1 text-slate-600">
                    Send Zelle payments to <b>info@seattledesitv.com</b>, then
                    upload the confirmation.
                  </p>
                  <div className="mt-4 space-y-3">
                    {agreement.installments?.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-100 p-4"
                      >
                        <div>
                          <b>
                            Payment {item.installment_number}:{" "}
                            {money(item.amount_cents)}
                          </b>
                          <p className="text-sm text-slate-600">
                            Due {item.due_date} ·{" "}
                            {item.status.replaceAll("_", " ")}
                          </p>
                        </div>
                        {["accepted", "active"].includes(agreement.status) &&
                          !["proof_submitted", "verified", "waived"].includes(
                            item.status,
                          ) && (
                            <label className="cursor-pointer rounded-xl bg-pink-600 px-4 py-2 font-bold text-white">
                              Upload confirmation
                              <input
                                disabled={saving}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  e.target.files?.[0] &&
                                  submitProof(item.id!, e.target.files[0])
                                }
                              />
                            </label>
                          )}
                        {item.confirmation_url && (
                          <a
                            href={item.confirmation_url}
                            target="_blank"
                            className="font-bold text-pink-700"
                          >
                            View confirmation
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

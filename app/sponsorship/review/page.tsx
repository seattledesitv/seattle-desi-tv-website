"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { uploadFileToCloudinary } from "../../lib/cloudinaryUpload";
import type {
  SponsorshipAgreement,
  SponsorshipInstallment,
} from "../../lib/sponsorships/types";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value / 100,
  );
function Review() {
  const token = useSearchParams().get("token") || "";
  const [agreement, setAgreement] = useState<SponsorshipAgreement | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signer, setSigner] = useState("");
  const [title, setTitle] = useState("");
  async function load() {
    const response = await fetch(
      `/api/sponsorships/agreement?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setAgreement(result.agreement);
  }
  useEffect(() => {
    // Load is intentionally triggered when the secure token changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  async function action(next: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/sponsorships/agreement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          action: next,
          signerName: signer,
          signerTitle: title,
          reason:
            next === "decline"
              ? window.prompt("Optional reason for declining") || ""
              : "",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(item: SponsorshipInstallment, file: File) {
    setBusy(true);
    setError("");
    try {
      const confirmationUrl = await uploadFileToCloudinary(file);
      const response = await fetch("/api/sponsorships/payment-proof", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          installmentId: item.id,
          confirmationUrl,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  if (error && !agreement) return <Message text={error} />;
  if (!agreement) return <Message text="Loading your agreement…" />;
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <header className="bg-slate-950 px-7 py-8 text-white">
          <p className="font-black uppercase tracking-widest text-pink-300">
            Seattle Desi TV
          </p>
          <h1 className="mt-2 text-3xl font-black">Sponsorship Agreement</h1>
          <p className="mt-2 text-slate-300">
            {agreement.agreement_number} · {agreement.status}
          </p>
        </header>
        <div className="p-7 md:p-10">
          <div className="grid gap-4 rounded-2xl bg-pink-50 p-5 sm:grid-cols-3">
            <div>
              <b>Sponsor</b>
              <p>{agreement.sponsor_name}</p>
            </div>
            <div>
              <b>Term</b>
              <p>
                {agreement.start_date} to {agreement.end_date}
              </p>
            </div>
            <div>
              <b>Final amount</b>
              <p>{money(agreement.final_amount_cents)}</p>
            </div>
          </div>
          <section className="mt-8">
            <h2 className="text-2xl font-black">Agreement terms</h2>
            <div className="mt-4 whitespace-pre-wrap rounded-2xl border p-6 leading-7">
              {agreement.agreement_content}
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-black">Payment schedule</h2>
            <p className="mt-1 text-slate-600">
              Send Zelle payments to <b>info@seattledesitv.com</b>, then upload
              the confirmation for review.
            </p>
            <div className="mt-4 space-y-3">
              {agreement.installments?.map((item) => (
                <div key={item.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <b>
                      Payment {item.installment_number}:{" "}
                      {money(item.amount_cents)}
                    </b>
                    <span className="font-bold uppercase text-pink-700">
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="text-slate-600">Due {item.due_date}</p>
                  {["accepted", "active"].includes(agreement.status) &&
                    !["proof_submitted", "verified", "waived"].includes(
                      item.status,
                    ) && (
                      <label className="mt-3 inline-block cursor-pointer rounded-xl bg-pink-600 px-4 py-2 font-bold text-white">
                        Upload payment confirmation
                        <input
                          disabled={busy}
                          className="hidden"
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            e.target.files?.[0] &&
                            upload(item, e.target.files[0])
                          }
                        />
                      </label>
                    )}
                  {item.confirmation_url && (
                    <a
                      href={item.confirmation_url}
                      target="_blank"
                      className="mt-2 block font-bold text-pink-700"
                    >
                      View submitted confirmation
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
          {["sent", "viewed"].includes(agreement.status) && (
            <section className="mt-8 rounded-2xl bg-slate-950 p-6 text-white">
              <h2 className="text-2xl font-black">Accept agreement</h2>
              <p className="mt-2 text-slate-300">
                By accepting, you confirm you are authorized to sign for the
                sponsor.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  className="rounded-xl p-3 text-slate-950"
                  placeholder="Authorized signer name"
                  value={signer}
                  onChange={(e) => setSigner(e.target.value)}
                />
                <input
                  className="rounded-xl p-3 text-slate-950"
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  disabled={busy || !signer.trim()}
                  onClick={() => action("accept")}
                  className="rounded-xl bg-pink-600 px-5 py-3 font-black disabled:opacity-50"
                >
                  I agree and accept
                </button>
                <button
                  disabled={busy}
                  onClick={() => action("decline")}
                  className="rounded-xl border border-white/30 px-5 py-3 font-bold"
                >
                  Decline
                </button>
              </div>
            </section>
          )}
          {agreement.accepted_at && (
            <div className="mt-8 rounded-2xl bg-emerald-50 p-5 text-emerald-900">
              <b>Agreement accepted</b>
              <p>
                Accepted by {agreement.signer_name}
                {agreement.signer_title
                  ? `, ${agreement.signer_title}`
                  : ""} on {new Date(agreement.accepted_at).toLocaleString()}.
              </p>
            </div>
          )}
          {error && (
            <p className="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
function Message({ text }: { text: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <div className="max-w-xl rounded-2xl bg-white p-8 text-center text-xl font-bold shadow">
        {text}
      </div>
    </main>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<Message text="Loading your agreement…" />}>
      <Review />
    </Suspense>
  );
}

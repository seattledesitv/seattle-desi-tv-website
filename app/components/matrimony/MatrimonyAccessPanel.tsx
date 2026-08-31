"use client";
import { useState } from "react";
import type {
  MatrimonyAccessRequest,
  MatrimonyPricing,
} from "../../lib/matrimony/types";
const money = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    c / 100,
  );
export default function MatrimonyAccessPanel({
  access,
  pricing,
  saving,
  onRequest,
}: {
  access: MatrimonyAccessRequest | null;
  pricing: MatrimonyPricing | null;
  saving: boolean;
  onRequest: (reason: string) => Promise<unknown>;
}) {
  const [reason, setReason] = useState("");
  if (
    access?.status === "active" &&
    access.access_expires_at &&
    new Date(access.access_expires_at) > new Date()
  )
    return (
      <section className="rounded-3xl border border-green-200 bg-green-50 p-6">
        <h2 className="text-2xl font-black text-green-900">
          Profile access is active
        </h2>
        <p className="mt-2 text-green-800">
          Available until{" "}
          {new Date(access.access_expires_at).toLocaleDateString()}.
        </p>
      </section>
    );
  const canReapply =
    access?.status === "changes_requested" ||
    access?.status === "rejected" ||
    access?.status === "expired" ||
    (access?.status === "active" &&
      !!access.access_expires_at &&
      new Date(access.access_expires_at) <= new Date());
  if (access && !canReapply)
    return (
      <section className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-black">Profile Access Request</h2>
        <p className="mt-2 text-slate-600">
          Status: <b>{access.status.replaceAll("_", " ")}</b>
        </p>
        {access.quoted_price_cents !== null && (
          <p className="mt-2">
            Approved price: <b>{money(access.quoted_price_cents)}</b> for{" "}
            {access.duration_days} days
          </p>
        )}
        {access.admin_notes && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-amber-900">
            {access.admin_notes}
          </p>
        )}
        {access.status === "approved_pending_payment" &&
          (access.payment_link ? (
            <a
              href={access.payment_link}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-xl bg-pink-600 px-6 py-3 font-black text-white"
            >
              Pay securely
            </a>
          ) : (
            <p className="mt-4 rounded-xl bg-blue-50 p-3 text-blue-900">
              SDTV is preparing your secure payment option.
            </p>
          ))}
      </section>
    );
  if (!pricing)
    return (
      <section className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-black">
          Profile Access Requests Are Paused
        </h2>
        <p className="mt-2 text-slate-600">
          SDTV is not accepting new access requests right now. Please check
          again later.
        </p>
      </section>
    );
  return (
    <section className="rounded-3xl border bg-white p-6">
      <h2 className="text-2xl font-black">Request Access to Profiles</h2>
      <p className="mt-2 text-slate-600">
        SDTV reviews every request. If approved, access currently costs{" "}
        <b>{pricing ? money(pricing.price_cents) : "configured by SDTV"}</b>
        {pricing ? ` for ${pricing.duration_days} days` : ""}. Payment is
        requested only after approval.
      </p>
      <label className="mt-5 block font-bold">
        Why are you requesting access?
        <textarea
          className="mt-2 min-h-28 w-full rounded-xl border p-3 font-normal"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please explain your genuine matrimonial purpose and relationship to the prospective individual."
        />
      </label>
      <button
        disabled={saving || reason.trim().length < 20}
        onClick={() => void onRequest(reason)}
        className="mt-4 rounded-xl bg-pink-600 px-6 py-3 font-black text-white disabled:opacity-50"
      >
        Submit Access Request
      </button>
    </section>
  );
}

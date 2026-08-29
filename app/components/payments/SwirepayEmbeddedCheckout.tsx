"use client";

import { useEffect, useRef, useState } from "react";
import {
  createSwirepayCheckoutSession,
  type ClassifiedCheckoutIntent,
} from "../../lib/swirepay/services/classifiedCheckoutService";

type DiagnosticStage = "configuration" | "session" | "component" | "checkout" | "provider";
type DiagnosticEntry = { at: string; stage: DiagnosticStage; status: "info" | "success" | "error"; message: string };
type CheckoutSuccessPayload = { paymentSessionGid: string | null; paymentMethodGid: string | null; customerGid: string | null; amount: number | null; currencyCode: string | null; status: string | null };
type ErrorPayload = { message: string; cause?: unknown; fatal: boolean };
type SwirepayElement = HTMLElement & {
  accountGid: string | null;
  secureToken: string | null;
  customerDetailPrefillJsonString: string | null;
  themeJsonString: string | null;
  successCallback: ((payload?: CheckoutSuccessPayload) => void) | null;
  errorCallback: ((payload: ErrorPayload) => void) | null;
};

function safeCause(cause: unknown) {
  if (typeof cause === "string") return cause.slice(0, 400);
  if (cause instanceof Error) return cause.message.slice(0, 400);
  if (!cause || typeof cause !== "object") return null;
  const source = cause as Record<string, unknown>;
  const safe: Record<string, string | number | boolean> = {};
  for (const field of ["name", "type", "code", "status", "message"]) {
    const value = source[field];
    if (typeof value === "string") safe[field] = value.slice(0, 300);
    else if (typeof value === "number" || typeof value === "boolean") safe[field] = value;
  }
  return Object.keys(safe).length ? safe : null;
}

function phonePrefill(phone: string | null) {
  if (!phone) return {};
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return { countryCallingCode: "+1", phone: digits.slice(1) };
  if (digits.length === 10) return { countryCallingCode: "+1", phone: digits };
  return {};
}

export default function SwirepayEmbeddedCheckout({ intent, onSubmitted }: { intent: ClassifiedCheckoutIntent; onSubmitted: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEntry[]>([]);

  useEffect(() => {
    let active = true;
    const hostNode = host.current;
    const record = (stage: DiagnosticStage, status: DiagnosticEntry["status"], message: string) => {
      if (!active) return;
      setDiagnostics((current) => [...current.slice(-19), { at: new Date().toLocaleTimeString(), stage, status, message }]);
    };

    async function configure() {
      try {
        record("configuration", "success", `Preparing ${intent.currency} ${intent.amountCents} checkout from the server-approved amount.`);
        record("component", "info", "Loading the pinned Swirepay payment SDK.");
        await import("@swirepay-developer/swirepay-frontend-payment-sdk");
        await customElements.whenDefined("swirepay-checkout");
        if (!active || !hostNode) return;
        record("component", "success", "Swirepay inline checkout component registered.");

        record("session", "info", "Requesting a short-lived secure checkout session from the SDTV server.");
        const session = await createSwirepayCheckoutSession(intent.token);
        if (!active || !hostNode) return;
        record("session", "success", `Secure session created (${session.paymentSessionGid}).`);

        const element = document.createElement("swirepay-checkout") as SwirepayElement;
        element.accountGid = session.accountGid;
        element.customerDetailPrefillJsonString = JSON.stringify({
          name: intent.classified.contactName,
          ...(intent.classified.contactEmail ? { email: intent.classified.contactEmail } : {}),
          ...phonePrefill(intent.classified.contactPhone),
          disableInput: false,
        });
        element.themeJsonString = JSON.stringify({
          buttonBackgroundColor: "#cf3778",
          buttonTextColor: "#ffffff",
          buttonBorderRadius: "14px",
          inputBorderRadius: "10px",
          fontFamily: "Arial, sans-serif",
        });
        element.successCallback = (payload) => {
          if (!active) return;
          const returnedGid = payload?.paymentSessionGid;
          if (returnedGid && returnedGid !== session.paymentSessionGid) {
            setError("Payment response could not be matched to this checkout. Please contact SDTV.");
            record("provider", "error", "Swirepay returned a payment-session identifier that did not match the server-created session.");
            return;
          }
          record("provider", "success", "Swirepay accepted the payment; waiting for the signed webhook before activation.");
          setError("");
          onSubmitted();
        };
        element.errorCallback = (payload) => {
          if (!active) return;
          const reference = `SP-${Date.now().toString(36).toUpperCase()}`;
          const message = payload?.message || "Payment could not be processed.";
          setError(`${message} Reference: ${reference}`);
          record("provider", "error", `${reference}: ${payload?.fatal ? "fatal setup failure" : "recoverable payment failure"}; ${JSON.stringify(safeCause(payload?.cause))}`);
        };
        hostNode.replaceChildren(element);
        element.secureToken = session.secureToken;
        setLoading(false);
        record("checkout", "success", "Inline secure checkout is ready.");
      } catch (cause) {
        if (!active) return;
        const message = cause instanceof Error ? cause.message : "Secure checkout could not be loaded.";
        setError(message);
        setLoading(false);
        record("checkout", "error", message);
      }
    }

    void configure();
    return () => {
      active = false;
      hostNode?.replaceChildren();
    };
  }, [intent, onSubmitted]);

  return (
    <div>
      {loading && <p className="rounded-xl bg-blue-50 p-4 font-bold text-blue-900">Loading secure checkout...</p>}
      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
      <div ref={host} className={loading ? "hidden" : "min-h-72"} />
      <p className="mt-3 text-center text-xs text-slate-500">Card details are securely handled by Swirepay and are never stored by Seattle Desi TV.</p>
      {intent.checkout.debug && (
        <details className="mt-5 rounded-2xl border bg-slate-50 p-4 text-sm">
          <summary className="cursor-pointer font-black text-slate-800">Checkout diagnostics</summary>
          <p className="mt-2 text-xs text-slate-500">Safe technical details only. No secret key, secure token, or card information is displayed.</p>
          <div className="mt-3 grid gap-2">
            {diagnostics.map((entry, index) => (
              <div key={`${entry.at}-${index}`} className={`rounded-xl p-3 ${entry.status === "error" ? "bg-red-50 text-red-900" : entry.status === "success" ? "bg-green-50 text-green-900" : "bg-blue-50 text-blue-900"}`}>
                <p className="text-xs font-black uppercase">{entry.stage} · {entry.status} · {entry.at}</p>
                <p className="mt-1 break-words">{entry.message}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

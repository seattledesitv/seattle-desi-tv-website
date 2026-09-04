"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  token: string;
  order: { buyer_name: string; buyer_email: string; buyer_phone: string | null };
  onSubmitted: () => void;
};
type SwirepayElement = HTMLElement & {
  accountGid: string | null;
  secureToken: string | null;
  customerDetailPrefillJsonString: string | null;
  themeJsonString: string | null;
  successCallback: ((payload?: { paymentSessionGid?: string | null }) => void) | null;
  errorCallback: ((payload?: { message?: string; fatal?: boolean }) => void) | null;
};

function phonePrefill(phone: string | null) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1"))
    return { countryCallingCode: "+1", phone: digits.slice(1) };
  if (digits.length === 10) return { countryCallingCode: "+1", phone: digits };
  return {};
}

export default function SwirepayTicketCheckout({ token, order, onSubmitted }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("Loading secure Swirepay checkout…");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const node = host.current;
    void (async () => {
      try {
        await import("@swirepay-developer/swirepay-frontend-payment-sdk");
        await customElements.whenDefined("swirepay-checkout");
        const response = await fetch("/api/payments/tickets/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const session = await response.json();
        if (!response.ok) throw new Error(session.error || "Checkout could not be loaded.");
        if (!active || !node) return;
        const element = document.createElement("swirepay-checkout") as SwirepayElement;
        element.accountGid = session.accountGid;
        element.customerDetailPrefillJsonString = JSON.stringify({
          name: order.buyer_name,
          email: order.buyer_email,
          ...phonePrefill(order.buyer_phone),
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
          if (payload?.paymentSessionGid && payload.paymentSessionGid !== session.paymentSessionGid) {
            setError("The payment response could not be matched to this order.");
            return;
          }
          setMessage("Payment received. Confirming your tickets…");
          setError("");
          onSubmitted();
        };
        element.errorCallback = (payload) => {
          if (!active) return;
          setError(payload?.message || "Payment could not be processed.");
        };
        node.replaceChildren(element);
        element.secureToken = session.secureToken;
        setMessage("");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Checkout could not be loaded.");
        setMessage("");
      }
    })();
    return () => {
      active = false;
      node?.replaceChildren();
    };
  }, [token, order.buyer_name, order.buyer_email, order.buyer_phone, onSubmitted]);
  return (
    <div>
      {message && <p className="rounded-xl bg-blue-50 p-4 font-bold text-blue-900">{message}</p>}
      {error && <p className="mb-4 rounded-xl bg-red-50 p-4 font-bold text-red-800">{error}</p>}
      <div ref={host} className="min-h-72" />
      <p className="mt-3 text-center text-xs text-slate-500">Card details are securely handled by Swirepay and are never stored by SDTV.</p>
    </div>
  );
}

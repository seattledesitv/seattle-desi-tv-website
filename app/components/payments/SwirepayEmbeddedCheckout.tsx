"use client";
import { useEffect, useRef, useState } from "react";
import type { ClassifiedCheckoutIntent } from "../../lib/swirepay/services/classifiedCheckoutService";

type SwirepayElement = HTMLElement & {
  open: (options?: Record<string, unknown>) => void;
  onSuccess: (callback: (result: unknown) => void) => void;
  onError: (callback: (error: unknown) => void) => void;
};

export default function SwirepayEmbeddedCheckout({
  intent,
  onSubmitted,
}: {
  intent: ClassifiedCheckoutIntent;
  onSubmitted: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const checkout = useRef<SwirepayElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!intent.checkout.checkoutUrl || !intent.checkout.publicKey) return;
    let active = true;
    const hostNode = host.current;
    let script = document.querySelector<HTMLScriptElement>(
      `script[data-sdtv-swirepay="${intent.checkout.checkoutUrl}"]`,
    );

    const configure = async () => {
      await customElements.whenDefined("swirepay-checkout");
      if (!active || !hostNode) return;
      const element = document.createElement(
        "swirepay-checkout",
      ) as SwirepayElement;
      element.setAttribute("api-key", intent.checkout.publicKey);
      element.setAttribute("amount", String(intent.amountCents));
      element.setAttribute("currencycode", intent.currency);
      element.setAttribute("mode", intent.checkout.mode);
      element.setAttribute("frequency", "ONE-TIME");
      element.setAttribute("isaddressrequired", "false");
      element.setAttribute("description", intent.description);
      element.setAttribute(
        "customer",
        JSON.stringify({ name: intent.classified.contactName }),
      );
      element.onSuccess(() => {
        if (!active) return;
        setProcessing(true);
        setError("");
        onSubmitted();
      });
      element.onError((cause) => {
        if (!active) return;
        setProcessing(false);
        setError(
          typeof cause === "string"
            ? cause
            : "Payment could not be processed. Please try again.",
        );
      });
      hostNode.replaceChildren(element);
      checkout.current = element;
      setReady(true);
    };

    if (!script) {
      script = document.createElement("script");
      script.type = "module";
      script.src = intent.checkout.checkoutUrl;
      script.dataset.sdtvSwirepay = intent.checkout.checkoutUrl;
      script.addEventListener("load", () => void configure(), { once: true });
      script.addEventListener(
        "error",
        () => active && setError("Secure checkout could not be loaded."),
        { once: true },
      );
      document.head.appendChild(script);
    } else if (customElements.get("swirepay-checkout")) {
      void configure();
    } else {
      script.addEventListener("load", () => void configure(), { once: true });
    }

    return () => {
      active = false;
      checkout.current = null;
      hostNode?.replaceChildren();
    };
  }, [intent, onSubmitted]);

  const open = () => {
    setError("");
    checkout.current?.open({
      theme: {
        bg: "linear-gradient(135deg, #0b1028, #30112f)",
        primary: "#cf3778",
        text: "#111827",
        border: "#dbe2ea",
        inputBg: "#ffffff",
        placeholder: "#64748b",
      },
    });
  };

  return (
    <div>
      <div ref={host} className="hidden" aria-hidden="true" />
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={!ready || processing}
        onClick={open}
        className="w-full rounded-2xl bg-pink-600 px-6 py-4 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {processing
          ? "Verifying payment..."
          : ready
            ? `Pay $${(intent.amountCents / 100).toFixed(2)} securely`
            : "Loading secure checkout..."}
      </button>
      <p className="mt-3 text-center text-xs text-slate-500">
        Card details are securely handled by Swirepay and are never stored by
        Seattle Desi TV.
      </p>
    </div>
  );
}

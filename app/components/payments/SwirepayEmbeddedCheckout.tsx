"use client";
import { useEffect, useRef, useState } from "react";
import type { ClassifiedCheckoutIntent } from "../../lib/swirepay/services/classifiedCheckoutService";

type DiagnosticStage = "configuration" | "script" | "component" | "checkout" | "provider";
type DiagnosticEntry = { at: string; stage: DiagnosticStage; status: "info" | "success" | "error"; message: string };

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
  const [diagnostics, setDiagnostics] = useState<DiagnosticEntry[]>([]);

  const record = (stage: DiagnosticStage, status: DiagnosticEntry["status"], message: string) => {
    setDiagnostics((current) => [...current.slice(-11), { at: new Date().toLocaleTimeString(), stage, status, message }]);
  };

  useEffect(() => {
    if (!intent.checkout.checkoutUrl || !intent.checkout.publicKey) {
      // This effect intentionally reports external checkout configuration state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      record("configuration", "error", `Missing ${!intent.checkout.publicKey ? "public key" : "checkout script URL"}.`);
      return;
    }
    let active = true;
    const hostNode = host.current;
    let script = document.querySelector<HTMLScriptElement>(
      `script[data-sdtv-swirepay="${intent.checkout.checkoutUrl}"]`,
    );

    record("configuration", "success", `Configuration received (${intent.checkout.mode} mode, ${intent.currency}, ${intent.amountCents} cents).`);

    const configure = async () => {
      record("component", "info", "Waiting for the swirepay-checkout component to register.");
      const registered = await Promise.race([
        customElements.whenDefined("swirepay-checkout").then(() => true),
        new Promise<false>((resolve) => window.setTimeout(() => resolve(false), 10000)),
      ]);
      if (!registered) {
        if (active) { setError("Swirepay's script loaded, but its checkout component did not register."); record("component", "error", "Custom element was not registered within 10 seconds."); }
        return;
      }
      if (!active || !hostNode) return;
      record("component", "success", "swirepay-checkout component registered.");
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
        record("provider", "success", "Swirepay reported successful submission; waiting for signed webhook verification.");
        setProcessing(true);
        setError("");
        onSubmitted();
      });
      element.onError((cause) => {
        if (!active) return;
        setProcessing(false);
        const providerMessage = typeof cause === "string" ? cause : cause instanceof Error ? cause.message : "Payment could not be processed. Please try again.";
        setError(providerMessage);
        record("provider", "error", providerMessage.slice(0, 300));
      });
      hostNode.replaceChildren(element);
      checkout.current = element;
      setReady(true);
      record("checkout", "success", "Checkout configured and ready to open.");
    };

    if (!script) {
      script = document.createElement("script");
      script.type = "module";
      script.src = intent.checkout.checkoutUrl;
      script.dataset.sdtvSwirepay = intent.checkout.checkoutUrl;
      let scriptHost = "the configured host";
      try { scriptHost = new URL(intent.checkout.checkoutUrl).host; } catch { setError("The configured Swirepay checkout script URL is invalid."); record("configuration", "error", "Checkout script URL is not a valid absolute URL."); return; }
      record("script", "info", `Requesting component script from ${scriptHost}.`);
      script.addEventListener("load", () => { record("script", "success", "Component script loaded."); void configure(); }, { once: true });
      script.addEventListener(
        "error",
        () => { if (active) { setError("Secure checkout script could not be loaded."); record("script", "error", "Browser failed to load the component script. Check the URL, browser console, content policy, or network blocking."); } },
        { once: true },
      );
      document.head.appendChild(script);
    } else if (customElements.get("swirepay-checkout")) {
      record("script", "success", "Existing component script and registration found.");
      void configure();
    } else {
      record("script", "info", "Existing component script is still loading.");
      script.addEventListener("load", () => { record("script", "success", "Existing component script loaded."); void configure(); }, { once: true });
    }

    return () => {
      active = false;
      checkout.current = null;
      hostNode?.replaceChildren();
    };
  }, [intent, onSubmitted]);

  const open = () => {
    setError("");
    if (!checkout.current) { record("checkout", "error", "Open was requested before checkout became ready."); return; }
    record("checkout", "info", "Opening Swirepay secure checkout.");
    try { checkout.current.open({
      theme: {
        bg: "linear-gradient(135deg, #0b1028, #30112f)",
        primary: "#cf3778",
        text: "#111827",
        border: "#dbe2ea",
        inputBg: "#ffffff",
        placeholder: "#64748b",
      },
    }); } catch (cause) { const message=cause instanceof Error?cause.message:"Swirepay checkout could not open.";setError(message);record("checkout","error",message); }
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
      <details className="mt-5 rounded-2xl border bg-slate-50 p-4 text-sm">
        <summary className="cursor-pointer font-black text-slate-800">Checkout diagnostics</summary>
        <p className="mt-2 text-xs text-slate-500">Safe technical details only. No secret key or card information is displayed.</p>
        <div className="mt-3 grid gap-2">{diagnostics.map((entry,index)=><div key={`${entry.at}-${index}`} className={`rounded-xl p-3 ${entry.status==="error"?"bg-red-50 text-red-900":entry.status==="success"?"bg-green-50 text-green-900":"bg-blue-50 text-blue-900"}`}><p className="text-xs font-black uppercase">{entry.stage} · {entry.status} · {entry.at}</p><p className="mt-1 break-words">{entry.message}</p></div>)}{!diagnostics.length&&<p className="text-slate-500">No diagnostic events yet.</p>}</div>
      </details>
    </div>
  );
}

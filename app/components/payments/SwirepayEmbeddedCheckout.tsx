"use client";
import { useEffect, useRef, useState } from "react";
import type { ClassifiedCheckoutIntent } from "../../lib/swirepay/services/classifiedCheckoutService";

type DiagnosticStage = "configuration" | "script" | "component" | "render" | "checkout" | "provider";
type DiagnosticEntry = { at: string; stage: DiagnosticStage; status: "info" | "success" | "error"; message: string };

type SwirepayElement = HTMLElement & {
  open: (options?: Record<string, unknown>) => void;
  onSuccess: (callback: (result: unknown) => void) => void;
  onError: (callback: (error: unknown) => void) => void;
};

const providerErrorFields = [
  "name",
  "type",
  "code",
  "errorCode",
  "status",
  "statusCode",
  "message",
  "description",
  "errorDescription",
] as const;

function safeProviderError(cause: unknown) {
  if (typeof cause === "string") return { message: cause.slice(0, 500) };
  if (cause instanceof Error) {
    return { name: cause.name, message: cause.message.slice(0, 500) };
  }
  if (!cause || typeof cause !== "object") {
    return { message: "Swirepay returned an unspecified payment error." };
  }

  const source = cause as Record<string, unknown>;
  const safe: Record<string, string | number | boolean> = {};
  for (const field of providerErrorFields) {
    const value = source[field];
    if (typeof value === "string") safe[field] = value.slice(0, 500);
    else if (typeof value === "number" || typeof value === "boolean") {
      safe[field] = value;
    }
  }
  return Object.keys(safe).length
    ? safe
    : { message: "Swirepay returned an unrecognized payment error shape." };
}

function swirepayEndpoint(value: string | URL) {
  try {
    const url = new URL(String(value), window.location.origin);
    return url.hostname === "swirepay.com" || url.hostname.endsWith(".swirepay.com")
      ? `${url.origin}${url.pathname}`
      : null;
  } catch {
    return null;
  }
}

function safeResponseSummary(text: string) {
  if (!text) return { response: "empty" };
  try {
    const body = JSON.parse(text) as unknown;
    if (typeof body === "string") return { message: body.slice(0, 500) };
    if (!body || typeof body !== "object") return { responseType: typeof body };

    const source = body as Record<string, unknown>;
    const safe: Record<string, string | number | boolean> = {};
    for (const field of providerErrorFields) {
      const value = source[field];
      if (typeof value === "string") safe[field] = value.slice(0, 500);
      else if (typeof value === "number" || typeof value === "boolean") {
        safe[field] = value;
      }
    }
    return Object.keys(safe).length
      ? safe
      : { response: "JSON received without recognized safe error fields" };
  } catch {
    return { response: "non-JSON response", responseLength: text.length };
  }
}

function installSwirepayNetworkDiagnostics(
  record: (stage: DiagnosticStage, status: DiagnosticEntry["status"], message: string) => void,
) {
  const originalFetch = window.fetch;
  const diagnosticFetch: typeof window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const endpoint = swirepayEndpoint(
      typeof args[0] === "string" || args[0] instanceof URL
        ? args[0]
        : args[0].url,
    );
    if (endpoint && !response.ok) {
      void response.clone().text().then((body) => {
        record(
          "provider",
          "error",
          `Swirepay request failed: ${response.status} ${response.statusText || "HTTP error"} at ${endpoint}. ${JSON.stringify(safeResponseSummary(body))}`.slice(0, 1200),
        );
      });
    }
    return response;
  };
  window.fetch = diagnosticFetch;

  const requestUrls = new WeakMap<XMLHttpRequest, string>();
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async = true,
    username?: string | null,
    password?: string | null,
  ) {
    const endpoint = swirepayEndpoint(url);
    if (endpoint) requestUrls.set(this, endpoint);
    return originalOpen.call(this, method, url, async, username, password);
  };
  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const endpoint = requestUrls.get(this);
    if (endpoint) {
      this.addEventListener(
        "loadend",
        () => {
          if (this.status >= 400 || this.status === 0) {
            const responseText = typeof this.responseText === "string"
              ? this.responseText
              : "";
            record(
              "provider",
              "error",
              `Swirepay request failed: ${this.status || "network error"} ${this.statusText || ""} at ${endpoint}. ${JSON.stringify(safeResponseSummary(responseText))}`.slice(0, 1200),
            );
          }
        },
        { once: true },
      );
    }
    return originalSend.call(this, body);
  };

  return () => {
    if (window.fetch === diagnosticFetch) window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
  };
}

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
    setDiagnostics((current) => [...current.slice(-19), { at: new Date().toLocaleTimeString(), stage, status, message }]);
  };

  useEffect(() => {
    if (!intent.checkout.checkoutUrl || !intent.checkout.publicKey) {
      // This effect intentionally reports external checkout configuration state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      record("configuration", "error", `Missing ${!intent.checkout.publicKey ? "public key" : "checkout script URL"}.`);
      return;
    }
    let active = true;
    const stopNetworkDiagnostics = intent.checkout.debug
      ? installSwirepayNetworkDiagnostics(record)
      : () => undefined;
    const hostNode = host.current;
    let script = document.querySelector<HTMLScriptElement>(
      `script[data-sdtv-swirepay="${intent.checkout.checkoutUrl}"]`,
    );

    record(
      "configuration",
      "success",
      `Configuration received (${intent.checkout.mode} mode, ${intent.currency}, ${intent.amountCents} cents). Public key: ${intent.checkout.publicKeyKind}, ${intent.checkout.publicKeyLength} characters, fingerprint ${intent.checkout.publicKeyFingerprint}, source ${intent.checkout.publicKeySource}${intent.checkout.publicKeyWhitespaceTrimmed ? "; surrounding whitespace was removed" : ""}.`,
    );

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
        JSON.stringify({
          name: intent.classified.contactName,
          ...(intent.classified.contactEmail
            ? { email: intent.classified.contactEmail }
            : {}),
          ...(intent.classified.contactPhone
            ? { phone: intent.classified.contactPhone }
            : {}),
        }),
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
        const safeError = safeProviderError(cause);
        const reference = `SP-${Date.now().toString(36).toUpperCase()}`;
        const providerMessage = typeof safeError.message === "string"
          ? safeError.message
          : "Payment could not be processed. Please try again.";
        setError(`${providerMessage} Reference: ${reference}`);
        record(
          "provider",
          "error",
          `${reference}: ${JSON.stringify(safeError)}`.slice(0, 1000),
        );
        console.error("Swirepay checkout failure", { reference, ...safeError });
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
      stopNetworkDiagnostics();
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
    });
      window.setTimeout(() => {
        const shadowRoot = checkout.current?.shadowRoot;
        const iframeCount = document.querySelectorAll("iframe").length
          + (shadowRoot?.querySelectorAll("iframe").length ?? 0);
        const dialogCount = document.querySelectorAll("dialog, [role='dialog']").length
          + (shadowRoot?.querySelectorAll("dialog, [role='dialog']").length ?? 0);
        const presentation = dialogCount
          ? `${dialogCount} in-page dialog${dialogCount === 1 ? "" : "s"}`
          : iframeCount
            ? `${iframeCount} iframe${iframeCount === 1 ? "" : "s"}`
            : "no detectable iframe or in-page dialog";
        record("render", dialogCount || iframeCount ? "success" : "info", `After open(): ${presentation}.`);
      }, 500);
    } catch (cause) { const message=cause instanceof Error?cause.message:"Swirepay checkout could not open.";setError(message);record("checkout","error",message); }
  };

  return (
    <div>
      <div ref={host} className="h-0" />
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
      {intent.checkout.debug && <details className="mt-5 rounded-2xl border bg-slate-50 p-4 text-sm">
        <summary className="cursor-pointer font-black text-slate-800">Checkout diagnostics</summary>
        <p className="mt-2 text-xs text-slate-500">Safe technical details only. No secret key or card information is displayed.</p>
        <div className="mt-3 grid gap-2">{diagnostics.map((entry,index)=><div key={`${entry.at}-${index}`} className={`rounded-xl p-3 ${entry.status==="error"?"bg-red-50 text-red-900":entry.status==="success"?"bg-green-50 text-green-900":"bg-blue-50 text-blue-900"}`}><p className="text-xs font-black uppercase">{entry.stage} · {entry.status} · {entry.at}</p><p className="mt-1 break-words">{entry.message}</p></div>)}{!diagnostics.length&&<p className="text-slate-500">No diagnostic events yet.</p>}</div>
      </details>}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

type Props = {
  organizationId: string;
  organizationName: string;
  email?: string | null;
  existingContactGid?: string | null;
  onComplete: () => void;
};
type OnboardingElement = HTMLElement & {
  accountGid: string;
  secureToken: string;
  contactGid?: string;
  customerPrefillJsonString?: string;
  contactTypePrefill?: string;
  defaultAddressCountry?: string;
  themeJsonString?: string;
  successCallback?: (payload: Record<string, unknown>) => void;
  errorCallback?: (payload: { message?: string; fatal?: boolean }) => void;
};

async function authHeader() {
  const session = await getSupabaseBrowserClient().auth.getSession();
  if (!session.data.session?.access_token) throw new Error("Please sign in again.");
  return { Authorization: `Bearer ${session.data.session.access_token}` };
}

export default function SwirepayContactOnboarding(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const completed = useRef(props.onComplete);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { completed.current = props.onComplete; }, [props.onComplete]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const node = host.current;
    void (async () => {
      try {
        setMessage("Loading secure payout registration…");
        await import("@swirepay-developer/swirepay-frontend-payment-sdk");
        await customElements.whenDefined("swirepay-contact-onboarding");
        const response = await fetch("/api/payments/organizations/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeader()) },
          body: JSON.stringify({ organizationId: props.organizationId }),
        });
        const session = await response.json();
        if (!response.ok) throw new Error(session.error || "Registration could not be loaded.");
        if (!active || !node) return;
        const element = document.createElement("swirepay-contact-onboarding") as OnboardingElement;
        element.accountGid = session.accountGid;
        if (props.existingContactGid) element.contactGid = props.existingContactGid;
        else {
          element.customerPrefillJsonString = JSON.stringify({ name: props.organizationName, email: props.email || undefined, disableInput: false });
          element.contactTypePrefill = "MARKETPLACE";
        }
        element.defaultAddressCountry = "US";
        element.themeJsonString = JSON.stringify({ buttonBackgroundColor: "#cf3778", buttonTextColor: "#ffffff", buttonBorderRadius: "14px", inputBorderRadius: "10px", fontFamily: "Arial, sans-serif" });
        element.successCallback = async (payload) => {
          if (!active) return;
          setMessage("Saving payout registration…");
          const saved = await fetch("/api/payments/organizations/onboarding", {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...(await authHeader()) },
            body: JSON.stringify({ organizationId: props.organizationId, ...payload }),
          });
          const result = await saved.json();
          if (!saved.ok) { setMessage(result.error || "Registration could not be saved."); return; }
          setMessage("Payout account submitted to Swirepay. SDTV can now verify it.");
          completed.current();
        };
        element.errorCallback = (payload) => setMessage(payload?.message || "Payout registration could not be completed.");
        node.replaceChildren(element);
        element.secureToken = session.secureToken;
        setMessage("");
      } catch (cause) {
        if (active) setMessage(cause instanceof Error ? cause.message : "Registration could not be loaded.");
      }
    })();
    return () => { active = false; node?.replaceChildren(); };
  }, [open, props.organizationId, props.organizationName, props.email, props.existingContactGid]);
  if (!open)
    return <button onClick={() => setOpen(true)} className="mt-4 w-full rounded-xl bg-pink-600 px-4 py-3 font-black text-white">{props.existingContactGid ? "Update Payout Account" : "Register Payout Account"}</button>;
  return (
    <div className="mt-4">
      <button onClick={() => setOpen(false)} className="mb-3 text-sm font-black text-pink-700">Close registration</button>
      {message && <p className="mb-3 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-900">{message}</p>}
      <div ref={host} className="min-h-72" />
      <p className="mt-2 text-xs text-slate-500">Bank details are handled securely by Swirepay and never stored by SDTV.</p>
    </div>
  );
}

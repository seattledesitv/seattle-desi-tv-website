import { getSupabaseBrowserClient } from "../../supabaseBrowser";

export type ClassifiedCheckoutIntent = {
  token: string;
  amountCents: number;
  currency: string;
  description: string;
  status: string;
  paymentSessionGid: string | null;
  classified: {
    id: string;
    title: string;
    placement: string;
    contactName: string;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  checkout: {
    publicKey: string;
    checkoutUrl: string;
    mode: "test" | "live";
    debug: boolean;
  };
};

async function accessToken() {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  if (!data.session?.access_token) throw new Error("Login required.");
  return data.session.access_token;
}

async function response<T>(request: Promise<Response>) {
  const result = await request;
  const body = (await result.json()) as T & { error?: string };
  if (!result.ok) throw new Error(body.error || "Payment request failed.");
  return body;
}

export async function createClassifiedCheckout(classifiedId: string) {
  const token = await accessToken();
  return response<{ token: string }>(
    fetch("/api/payments/classifieds/intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ classifiedId }),
    }),
  );
}

export async function loadClassifiedCheckout(tokenValue: string) {
  const token = await accessToken();
  return response<ClassifiedCheckoutIntent>(
    fetch(
      `/api/payments/classifieds/intent?token=${encodeURIComponent(tokenValue)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    ),
  );
}

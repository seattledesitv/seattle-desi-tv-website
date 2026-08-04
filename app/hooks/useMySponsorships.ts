"use client";
import { useCallback, useEffect, useState } from "react";
import { SponsorshipService } from "../lib/sponsorships/services/sponsorshipService";
import type { SponsorshipAgreement } from "../lib/sponsorships/types";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

function text(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Could not load sponsorships.";
}
export function useMySponsorships() {
  const [agreements, setAgreements] = useState<SponsorshipAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getSupabaseBrowserClient().auth.getUser();
      if (!data.user)
        throw new Error("Please log in to view your sponsorships.");
      setAgreements(await SponsorshipService.listAgreements());
    } catch (cause) {
      setError(text(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  async function submitProof(installmentId: string, file: File) {
    setSaving(true);
    setError("");
    try {
      const { uploadFileToCloudinary } =
        await import("../lib/cloudinaryUpload");
      const confirmationUrl = await uploadFileToCloudinary(file);
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      const response = await fetch("/api/sponsorships/my-payment-proof", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${data.session?.access_token || ""}`,
        },
        body: JSON.stringify({ installmentId, confirmationUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await refresh();
    } catch (cause) {
      setError(text(cause));
      throw cause;
    } finally {
      setSaving(false);
    }
  }
  return { agreements, loading, saving, error, refresh, submitProof };
}

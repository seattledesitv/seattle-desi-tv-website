"use client";

import { useCallback, useEffect, useState } from "react";
import { SponsorshipService } from "../lib/sponsorships/services/sponsorshipService";
import type {
  SponsorBusiness,
  SponsorshipAgreement,
  SponsorshipAgreementInput,
  SponsorshipPackage,
} from "../lib/sponsorships/types";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

function message(error: unknown) {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "Sponsorship request failed.";
}

export function useSponsorships() {
  const [packages, setPackages] = useState<SponsorshipPackage[]>([]);
  const [agreements, setAgreements] = useState<SponsorshipAgreement[]>([]);
  const [businesses, setBusinesses] = useState<SponsorBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [packageRows, agreementRows, businessRows] = await Promise.all([
        SponsorshipService.listPackages(),
        SponsorshipService.listAgreements(),
        SponsorshipService.listBusinesses(),
      ]);
      setPackages(packageRows);
      setAgreements(agreementRows);
      setBusinesses(businessRows);
    } catch (nextError) {
      setError(message(nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial remote data synchronization is intentionally owned by this hook.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function create(input: SponsorshipAgreementInput) {
    setSaving(true);
    setError("");
    try {
      const { data } = await getSupabaseBrowserClient().auth.getUser();
      if (!data.user) throw new Error("Please sign in.");
      await SponsorshipService.create(input, data.user.id);
      await refresh();
    } catch (nextError) {
      setError(message(nextError));
      throw nextError;
    } finally {
      setSaving(false);
    }
  }

  async function updatePackage(id: string, changes: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      await SponsorshipService.updatePackage(id, changes);
      await refresh();
    } catch (nextError) {
      setError(message(nextError));
      throw nextError;
    } finally {
      setSaving(false);
    }
  }

  return {
    packages,
    agreements,
    businesses,
    loading,
    saving,
    error,
    refresh,
    create,
    updatePackage,
  };
}

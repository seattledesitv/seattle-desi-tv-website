"use client";

import { useCallback, useEffect, useState } from "react";
import { BusinessOfferService } from "../lib/businessOffers/services/businessOfferService";
import type {
  BusinessOffer,
  BusinessOfferInput,
  OfferBusiness,
  OfferPlacement,
} from "../lib/businessOffers/types";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";
import { useCurrentSite } from "../lib/sites/SiteContext";

function errorMessage(cause: unknown, fallback: string) {
  if (cause instanceof Error) return cause.message;
  if (
    cause &&
    typeof cause === "object" &&
    "message" in cause &&
    typeof cause.message === "string"
  )
    return cause.message;
  return fallback;
}

export function useBusinessOffers(mode: "public" | "owner" | "admin") {
  const site = useCurrentSite();
  const [offers, setOffers] = useState<BusinessOffer[]>([]);
  const [businesses, setBusinesses] = useState<OfferBusiness[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (mode === "public") setOffers(await BusinessOfferService.listPublic(site.id));
      else if (mode === "admin") {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (
          !data.user ||
          !isAdminRole(await resolveUserRole(supabase, data.user))
        )
          throw new Error("Admin access is required to manage offers.");
        setUserId(data.user.id);
        const workspace = await BusinessOfferService.adminWorkspace(site.id);
        setOffers(workspace.offers);
        setBusinesses(workspace.businesses);
      } else {
        const { data } = await getSupabaseBrowserClient().auth.getUser();
        const id = data.user?.id || "";
        setUserId(id);
        if (!id) {
          setOffers([]);
          setBusinesses([]);
          setError("Please log in to manage business offers.");
        } else {
          const workspace = await BusinessOfferService.ownerWorkspace(id, site.id);
          setBusinesses(workspace.businesses);
          setOffers(workspace.offers);
        }
      }
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Could not load business offers."));
    } finally {
      setLoading(false);
    }
  }, [mode, site.id]);

  useEffect(() => {
    // The hook owns the initial remote-state synchronization for its consumers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function create(input: BusinessOfferInput) {
    if (!userId) throw new Error("Please log in first.");
    setSaving(true);
    setError("");
    try {
      await BusinessOfferService.create(input, userId, site.id);
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Could not create offer."));
      throw cause;
    } finally {
      setSaving(false);
    }
  }
  async function moderate(id: string, changes: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      await BusinessOfferService.moderate(id, changes, site.id);
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Could not update offer."));
    } finally {
      setSaving(false);
    }
  }
  async function approveForPayment(id: string, placement: OfferPlacement) {
    setSaving(true);
    setError("");
    try {
      await BusinessOfferService.approveForPayment(id, placement, site.id);
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Could not approve the offer."));
    } finally {
      setSaving(false);
    }
  }
  async function confirmPayment(id: string, reference?: string) {
    setSaving(true);
    setError("");
    try {
      await BusinessOfferService.confirmPaymentAndActivate(id, site.id, reference);
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Could not activate the offer."));
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    setSaving(true);
    setError("");
    try {
      await BusinessOfferService.remove(id, site.id);
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Could not delete offer."));
    } finally {
      setSaving(false);
    }
  }
  return {
    offers,
    businesses,
    loading,
    saving,
    error,
    refresh,
    create,
    moderate,
    approveForPayment,
    confirmPayment,
    remove,
  };
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { BusinessOfferService } from "../lib/businessOffers/services/businessOfferService";
import type { OfferPlacement, OfferPricing } from "../lib/businessOffers/types";
import { useCurrentSite } from "../lib/sites/SiteContext";
function message(cause: unknown) { return cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "Could not load offer pricing."; }
export function useOfferPricing(admin = false) {
  const site = useCurrentSite();
  const [pricing, setPricing] = useState<OfferPricing[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const refresh = useCallback(async () => { setLoading(true); setError(""); try { setPricing(admin ? await BusinessOfferService.listAllPricing(site.id) : await BusinessOfferService.listPricing(site.id)); } catch (cause) { setError(message(cause)); } finally { setLoading(false); } }, [admin, site.id]);
  useEffect(() => {
    // The hook owns the initial remote pricing synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  async function update(placement: OfferPlacement, changes: Record<string, unknown>) { setSaving(true); setError(""); try { await BusinessOfferService.updatePricing(placement, changes, site.id); await refresh(); } catch (cause) { setError(message(cause)); } finally { setSaving(false); } }
  return { pricing, loading, saving, error, update, refresh };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { BusinessOfferService } from "../lib/businessOffers/services/businessOfferService";
import type { BusinessOffer, BusinessOfferInput, OfferBusiness } from "../lib/businessOffers/types";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";

function errorMessage(cause: unknown, fallback: string) { if (cause instanceof Error) return cause.message; if (cause && typeof cause === "object" && "message" in cause && typeof cause.message === "string") return cause.message; return fallback; }

export function useBusinessOffers(mode: "public" | "owner" | "admin") {
  const [offers, setOffers] = useState<BusinessOffer[]>([]);
  const [businesses, setBusinesses] = useState<OfferBusiness[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (mode === "public") setOffers(await BusinessOfferService.listPublic());
      else if (mode === "admin") { const supabase = getSupabaseBrowserClient(); const { data } = await supabase.auth.getUser(); if (!data.user || !isAdminRole(await resolveUserRole(supabase, data.user))) throw new Error("Admin access is required to manage offers."); setOffers(await BusinessOfferService.listForAdmin()); }
      else {
        const { data } = await getSupabaseBrowserClient().auth.getUser(); const id = data.user?.id || ""; setUserId(id);
        if (!id) { setOffers([]); setBusinesses([]); setError("Please log in to manage business offers."); }
        else { const workspace = await BusinessOfferService.ownerWorkspace(id); setBusinesses(workspace.businesses); setOffers(workspace.offers); }
      }
    } catch (cause: unknown) { setError(errorMessage(cause, "Could not load business offers.")); }
    finally { setLoading(false); }
  }, [mode]);

  useEffect(() => {
    // The hook owns the initial remote-state synchronization for its consumers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function create(input: BusinessOfferInput) { if (!userId) throw new Error("Please log in first."); setSaving(true); setError(""); try { await BusinessOfferService.create(input, userId); await refresh(); } catch (cause: unknown) { setError(errorMessage(cause, "Could not create offer.")); throw cause; } finally { setSaving(false); } }
  async function moderate(id: string, changes: Record<string, unknown>) { setSaving(true); setError(""); try { await BusinessOfferService.moderate(id, changes); await refresh(); } catch (cause: unknown) { setError(errorMessage(cause, "Could not update offer.")); } finally { setSaving(false); } }
  async function remove(id: string) { setSaving(true); setError(""); try { await BusinessOfferService.remove(id); await refresh(); } catch (cause: unknown) { setError(errorMessage(cause, "Could not delete offer.")); } finally { setSaving(false); } }
  return { offers, businesses, loading, saving, error, refresh, create, moderate, remove };
}

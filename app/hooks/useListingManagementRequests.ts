"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { loadOwnListingRequests, submitListingRequest } from "../lib/listingManagement/services/listingManagementService";
import type { CreateListingRequest, ListingManagementRequest } from "../lib/listingManagement/types";

const supabase = getSupabaseBrowserClient();

export function useListingManagementRequests() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<ListingManagementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null; setUser(currentUser);
    if (!currentUser?.id) { setRequests([]); setLoading(false); return; }
    try { setRequests(await loadOwnListingRequests(supabase, currentUser.id)); } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : "Could not load your requests."); }
    setLoading(false);
  }, []);

  // Loading remote state is the purpose of this mount effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(input: Omit<CreateListingRequest, "requester_user_id" | "requester_email"> & { requester_email?: string }) {
    if (!user?.id) throw new Error("Please log in before submitting a request.");
    setSaving(true); setError("");
    try {
      const created = await submitListingRequest(supabase, { ...input, requester_user_id: user.id, requester_email: input.requester_email || user.email || "" });
      setRequests((current) => [created, ...current]); return created;
    } catch (cause: unknown) { const message = cause instanceof Error ? cause.message : "Could not submit the request."; setError(message); throw new Error(message); }
    finally { setSaving(false); }
  }

  return { user, requests, loading, saving, error, refresh, submit };
}

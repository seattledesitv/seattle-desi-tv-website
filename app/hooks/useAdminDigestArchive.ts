"use client";
import { useCallback, useEffect, useState } from "react";
import { AdminDigestService } from "../lib/adminDigest/services/adminDigestService";
import type { AdminDigestDelivery } from "../lib/adminDigest/types";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";

export function useAdminDigestArchive() {
  const [deliveries, setDeliveries] = useState<AdminDigestDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const db = getSupabaseBrowserClient();
      const { data } = await db.auth.getUser();
      if (!data.user || !isAdminRole(await resolveUserRole(db, data.user))) throw new Error("Studio admin access is required.");
      setDeliveries(await AdminDigestService.listDeliveries());
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load digest archive."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  async function sendTest() {
    setSending(true); setError(""); setMessage("");
    try {
      const db = getSupabaseBrowserClient();
      const { data } = await db.auth.getSession();
      const response = await fetch("/api/studio/admin-digests/test", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token || ""}` } });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Test digest failed.");
      setMessage("Test digest sent to the configured administrator email.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send test digest."); }
    finally { setSending(false); }
  }
  return { deliveries, loading, sending, error, message, refresh, sendTest };
}

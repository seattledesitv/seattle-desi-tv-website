"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";
import { SwirepayWebhookService } from "../lib/swirepay/services/swirepayWebhookService";
import type { SwirepayWebhookEvent } from "../lib/swirepay/types";
export function useSwirepayWebhookEvents() {
  const [events, setEvents] = useState<SwirepayWebhookEvent[]>([]),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const db = getSupabaseBrowserClient();
      const { data } = await db.auth.getUser();
      if (!data.user || !isAdminRole(await resolveUserRole(db, data.user)))
        throw new Error("Studio admin access is required.");
      setEvents(await SwirepayWebhookService.list());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load Swirepay webhook events.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  async function markReviewed(id: string, notes: string) {
    setSaving(true);
    try {
      await SwirepayWebhookService.markReviewed(id, notes);
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update the event.",
      );
    } finally {
      setSaving(false);
    }
  }
  return { events, loading, saving, error, refresh, markReviewed };
}

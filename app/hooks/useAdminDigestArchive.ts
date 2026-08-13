"use client";
import { useCallback, useEffect, useState } from "react";
import { AdminDigestService } from "../lib/adminDigest/services/adminDigestService";
import type { AdminDigestDelivery, DailyAdminDigest } from "../lib/adminDigest/types";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";

export function useAdminDigestArchive() {
  const [deliveries, setDeliveries] = useState<AdminDigestDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<DailyAdminDigest | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
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
  async function loadReport(from: string, to: string) {
    setReportLoading(true); setError("");
    try {
      const db = getSupabaseBrowserClient();
      const { data } = await db.auth.getSession();
      const start = new Date(`${from}T00:00:00`);
      const end = new Date(`${to}T00:00:00`);
      end.setDate(end.getDate() + 1);
      const params = new URLSearchParams({ from: start.toISOString(), to: end.toISOString() });
      const response = await fetch(`/api/studio/admin-digests/report?${params}`, { headers: { Authorization: `Bearer ${data.session?.access_token || ""}` }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Activity report failed.");
      setReport(result.report);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load activity report."); }
    finally { setReportLoading(false); }
  }
  return { deliveries, loading, sending, error, message, report, reportLoading, refresh, sendTest, loadReport };
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import type { RegisteredUserSummary } from "../lib/userAdmin/types";

const empty: RegisteredUserSummary = { users: [], total: 0, confirmed: 0, signedIn: 0 };

async function request(path: string, init?: RequestInit) {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please log in again to manage registered users.");
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "User administration request failed.");
  return result;
}

export function useRegisteredUsers(enabled: boolean) {
  const [summary, setSummary] = useState<RegisteredUserSummary>(empty);
  const [loading, setLoading] = useState(enabled);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true); setError("");
    try { setSummary(await request("/api/studio/users")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Registered users could not be loaded."); }
    finally { setLoading(false); }
  }, [enabled]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load server-protected account data when admin access becomes available
    void refresh();
  }, [refresh]);
  async function remove(userId: string, confirmationEmail: string) {
    setDeleting(true); setError("");
    try { await request("/api/studio/users", { method: "DELETE", body: JSON.stringify({ userId, confirmationEmail }) }); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The login account could not be deleted."); throw cause; }
    finally { setDeleting(false); }
  }
  return { ...summary, loading, deleting, error, refresh, remove };
}

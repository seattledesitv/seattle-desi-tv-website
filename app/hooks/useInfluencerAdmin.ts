"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";
import { InfluencerService } from "../lib/influencers/services/influencerService";
import type { InfluencerAdminInput, InfluencerProfile } from "../lib/influencers/types";

export function useInfluencerAdmin() {
  const [profiles, setProfiles] = useState<InfluencerProfile[]>([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(""), [adminId, setAdminId] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await getSupabaseBrowserClient().auth.getUser();
      const user = data.user;
      if (!user || !isAdminRole(await resolveUserRole(getSupabaseBrowserClient(), user))) throw new Error("Studio admin access is required.");
      setAdminId(user.email || user.id);
      setProfiles(await InfluencerService.listAdmin());
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Influencers could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer=window.setTimeout(()=>void refresh(),0); return()=>window.clearTimeout(timer); }, [refresh]);
  async function run(task: () => Promise<unknown>) { setSaving(true); setError(""); try { await task(); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Influencer could not be saved."); throw cause; } finally { setSaving(false); } }
  return {
    profiles, loading, saving, error, refresh,
    create: (input: InfluencerAdminInput) => run(() => InfluencerService.createAdmin(input, adminId)),
    update: (profile: InfluencerProfile, changes: Record<string, unknown>) => run(() => InfluencerService.updateAdmin(profile.id, changes.status === "approved" ? { ...changes, approved_by: adminId, approved_at: new Date().toISOString() } : changes)),
  };
}

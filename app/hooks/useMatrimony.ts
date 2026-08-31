"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";
import { MatrimonyService } from "../lib/matrimony/services/matrimonyService";
import type {
  MatrimonyAccessRequest,
  MatrimonyPricing,
  MatrimonyProfileInput,
  MatrimonyProfileWithContact,
} from "../lib/matrimony/types";
import { useCurrentSite } from "../lib/sites/SiteContext";
export function useMatrimony(mode: "member" | "admin") {
  const site = useCurrentSite();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null),
    [profile, setProfile] = useState<MatrimonyProfileWithContact | null>(null),
    [profiles, setProfiles] = useState<MatrimonyProfileWithContact[]>([]),
    [access, setAccess] = useState<MatrimonyAccessRequest | null>(null),
    [requests, setRequests] = useState<MatrimonyAccessRequest[]>([]),
    [pricing, setPricing] = useState<MatrimonyPricing | null>(null),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!site.id) throw new Error("The active site could not be resolved.");
      const auth = await getSupabaseBrowserClient().auth.getUser();
      const current = auth.data.user;
      if (!current)
        throw new Error(`Please log in to use ${site.shortName} Matrimony.`);
      setUser({ id: current.id, email: current.email || "" });
      if (mode === "admin") {
        if (
          !isAdminRole(
            await resolveUserRole(getSupabaseBrowserClient(), current),
          )
        )
          throw new Error("Admin access is required.");
        setProfiles(await MatrimonyService.listAdminProfiles(site.id));
        setRequests(await MatrimonyService.listAdminAccess(site.id));
        setPricing(await MatrimonyService.getPricing(true));
      } else {
        const [own, ownAccess, price] = await Promise.all([
          MatrimonyService.getOwnProfile(current.id, site.id),
          MatrimonyService.getOwnAccess(current.id, site.id),
          MatrimonyService.getPricing(),
        ]);
        setProfile(own);
        setAccess(ownAccess);
        setPricing(price);
        const active =
          ownAccess?.status === "active" &&
          !!ownAccess.access_expires_at &&
          new Date(ownAccess.access_expires_at) > new Date();
        setProfiles(active ? await MatrimonyService.listVisible(site.id) : []);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Matrimony could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [mode, site.id, site.shortName]);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  async function run(task: () => Promise<unknown>) {
    setSaving(true);
    setError("");
    try {
      await task();
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The matrimony action could not be completed.",
      );
      throw cause;
    } finally {
      setSaving(false);
    }
  }
  return {
    user,
    profile,
    profiles,
    access,
    requests,
    pricing,
    loading,
    saving,
    error,
    refresh,
    saveProfile: (input: MatrimonyProfileInput, id?: string) =>
      run(() => {
        if (!site.id) throw new Error("The active site could not be resolved.");
        return MatrimonyService.saveProfile(input, user!.id, site.id, id);
      }),
    requestAccess: (reason: string) =>
      run(() => {
        if (!site.id) throw new Error("The active site could not be resolved.");
        return MatrimonyService.requestAccess(
          user!.id,
          user!.email,
          reason,
          site.id,
        );
      }),
    upload: (file: File) => MatrimonyService.uploadPhoto(file, user!.id),
    reviewProfile: (id: string, decision: string, notes: string) =>
      run(() => {
        if (!site.id) throw new Error("The active site could not be resolved.");
        return MatrimonyService.reviewProfile(id, decision, notes, site.id);
      }),
    reviewAccess: (
      id: string,
      decision: string,
      price: number | null,
      duration: number | null,
      notes: string,
      link: string,
    ) =>
      run(() => {
        if (!site.id) throw new Error("The active site could not be resolved.");
        return MatrimonyService.reviewAccess(
          id,
          decision,
          price,
          duration,
          notes,
          link,
          site.id,
        );
      }),
    completePayment: (id: string, reference: string) =>
      run(() => {
        if (!site.id) throw new Error("The active site could not be resolved.");
        return MatrimonyService.completePayment(id, reference, site.id);
      }),
    updatePricing: (changes: Partial<MatrimonyPricing>) =>
      run(() => MatrimonyService.updatePricing(changes)),
  };
}

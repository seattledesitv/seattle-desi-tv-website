"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";
import { ClassifiedService } from "../lib/classifieds/services/classifiedService";
import type {
  ClassifiedAd,
  ClassifiedInput,
  ClassifiedPlacement,
  ClassifiedPricing,
} from "../lib/classifieds/types";
function message(e: unknown) {
  return e instanceof Error
    ? e.message
    : "The classified operation could not be completed.";
}
export function useClassifieds(mode: "public" | "owner" | "admin") {
  const [ads, setAds] = useState<ClassifiedAd[]>([]),
    [pricing, setPricing] = useState<ClassifiedPricing[]>([]),
    [userId, setUserId] = useState(""),
    [email, setEmail] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const auth = await getSupabaseBrowserClient().auth.getUser();
      const user = auth.data.user;
      setUserId(user?.id || "");
      setEmail(user?.email || "");
      setPricing(await ClassifiedService.listPricing(mode === "admin"));
      if (mode === "public") setAds(await ClassifiedService.listPublic());
      else {
        if (!user) throw new Error("Please log in to manage classifieds.");
        if (
          mode === "admin" &&
          !isAdminRole(await resolveUserRole(getSupabaseBrowserClient(), user))
        )
          throw new Error("Admin access is required.");
        setAds(
          mode === "admin"
            ? await ClassifiedService.listAdmin()
            : await ClassifiedService.listOwner(user.id),
        );
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, [mode]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  async function run(task: () => Promise<unknown>) {
    setSaving(true);
    setError("");
    try {
      await task();
      await refresh();
    } catch (e) {
      setError(message(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }
  return {
    ads,
    pricing,
    userId,
    email,
    loading,
    saving,
    error,
    refresh,
    create: (i: ClassifiedInput) =>
      run(() => ClassifiedService.create(i, userId)),
    update: (id: string, c: Record<string, unknown>) =>
      run(() => ClassifiedService.updateOwner(id, c)),
    review: (
      id: string,
      d: string,
      p: ClassifiedPlacement,
      price: number | null,
      n: string,
    ) => run(() => ClassifiedService.review(id, d, p, price, n)),
    updatePricing: (p: ClassifiedPlacement, c: Record<string, unknown>) =>
      run(() => ClassifiedService.updatePricing(p, c)),
    upload: (f: File) => ClassifiedService.uploadImage(f, userId),
    report: (id: string, r: string, n: string) =>
      run(() => ClassifiedService.report(id, userId, email, r, n)),
  };
}
